/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {AbstractWriter} from "./AbstractWriter";
import {Decimal} from "./IonDecimal";
import {encodeUtf8} from "./IonUnicode";
import {Import} from "./IonImport";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {LocalSymbolTable} from "./IonLocalSymbolTable";
import {LowLevelBinaryWriter} from "./IonLowLevelBinaryWriter";
import {Timestamp, TimestampPrecision} from "./IonTimestamp";
import {Writeable} from "./IonWriteable";
import {_assertDefined, _sign} from "./util";
import JSBI from "jsbi";
import {JsbiSupport} from "./JsbiSupport";
import {JsbiSerde} from "./JsbiSerde";

const MAJOR_VERSION: number = 1;
const MINOR_VERSION: number = 0;

const MAX_VALUE_LENGTH: number = 14;
const MAX_VALUE_LENGTH_FLAG: number = 14;

const NULL_VALUE_FLAG: number = 15;

const TYPE_DESCRIPTOR_LENGTH: number = 1;

let EMPTY_UINT8ARRAY = new Uint8Array();

/** Possible writer states */
enum States {
    /** The writer expects a value (a call to writeInt(), writeString(), etc.) or a transition (stepOut(), close()) */
    VALUE,
    /** The writer expects a struct field name (valid calls are writeFieldName() and stepOut()) */
    STRUCT_FIELD,
    /** The writer expects a struct value (writeInt(), writeString(), etc.) but not a transition (stepOut() and close() will throw an exception) */
    STRUCT_VALUE,
    /** The writer is closed, no further operations may be performed */
    CLOSED,
}

/** Four-bit type codes per http://amzn.github.io/ion-docs/binary.html#typed-value-formats */
enum TypeCodes {
    NULL = 0,
    BOOL = 1,
    POSITIVE_INT = 2,
    NEGATIVE_INT = 3,
    FLOAT = 4,
    DECIMAL = 5,
    TIMESTAMP = 6,
    SYMBOL = 7,
    STRING = 8,
    CLOB = 9,
    BLOB = 10,
    LIST = 11,
    SEXP = 12,
    STRUCT = 13,
    ANNOTATION = 14,
}

/**
 * Writes out Ion values in Ion's binary format.
 *
 * This implementation caches serialized values in an in-memory tree.
 * It does not support multiple local symbol tables (aka "symbol table append").
 *
 * @see http://amzn.github.io/ion-docs/binary.html
 */
export class BinaryWriter extends AbstractWriter {
    private readonly symbolTable: LocalSymbolTable;
    private readonly writer: LowLevelBinaryWriter;
    private datagram: Node[] = [];
    private containers: Node[] = [];
    private fieldName: Uint8Array;
    private state: States = States.VALUE;

    constructor(symbolTable: LocalSymbolTable, writeable: Writeable) {
        super();
        this.symbolTable = symbolTable;
        this.writer = new LowLevelBinaryWriter(writeable);
    }

    getBytes(): Uint8Array {
        return this.writer.getBytes();
    }

    writeBlob(value: Uint8Array | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.BLOB);
            return;
        }
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.BLOB, this.encodeAnnotations(this._annotations), value));
    }

    writeBoolean(value: boolean | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.BOOL);
            return;
        }

        this.addNode(new BooleanNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations), value));
    }

    writeClob(value: Uint8Array | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.CLOB);
            return;
        }

        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.CLOB, this.encodeAnnotations(this._annotations), value));
    }

    writeDecimal(value: Decimal | null): void {
        _assertDefined(value);
        this.checkWriteValue();

        if (value === null) {
            this.writeNull(IonTypes.DECIMAL);
            return;
        }

        let exponent: number = value.getExponent();
        let coefficient: JSBI = value.getCoefficient();

        let isPositiveZero: boolean = JSBI.equal(coefficient, JsbiSupport.ZERO) && !value.isNegative();
        if (isPositiveZero && exponent === 0 && _sign(exponent) === 1) {
            // Special case per the spec: http://amzn.github.io/ion-docs/docs/binary.html#5-decimal
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.DECIMAL, this.encodeAnnotations(this._annotations), new Uint8Array(0)));
            return;
        }

        let isNegative = value.isNegative();
        let writeCoefficient = isNegative || JSBI.notEqual(coefficient, JsbiSupport.ZERO);
        let coefficientBytes: Uint8Array = writeCoefficient ? JsbiSerde.toSignedIntBytes(coefficient, isNegative) : EMPTY_UINT8ARRAY;

        let bufLen = LowLevelBinaryWriter.getVariableLengthSignedIntSize(exponent) + (writeCoefficient ? coefficientBytes.length : 0);
        let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(bufLen));
        writer.writeVariableLengthSignedInt(exponent);
        if (writeCoefficient) {
            writer.writeBytes(coefficientBytes);
        }
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.DECIMAL, this.encodeAnnotations(this._annotations), writer.getBytes()));
    }

    writeFloat32(value: number | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.FLOAT);
            return;
        }

        let bytes: Uint8Array;
        // According to the spec, the value 0 is encoded as a length of zero bytes while -0 is encoded using the
        // full 4 bytes like any other value. We use `Object.is` to distinguish between -0 and 0 in this check
        // because `0 === -0` evaluates to `true`.
        if (Object.is(value, 0)) {
            bytes = new Uint8Array(0);
        } else {
            let buffer: ArrayBuffer = new ArrayBuffer(4);
            let dataview: DataView = new DataView(buffer);
            dataview.setFloat32(0, value, false);
            bytes = new Uint8Array(buffer);
        }
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.FLOAT, this.encodeAnnotations(this._annotations), bytes));
    }

    writeFloat64(value: number | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.FLOAT);
            return;
        }

        let bytes: Uint8Array;
        // According to the spec, the value 0 is encoded as a length of zero bytes while -0 is encoded using the
        // full 8 bytes like any other value. We use `Object.is` to distinguish between -0 and 0 in this check
        // because `0 === -0` evaluates to `true`.
        if (Object.is(value, 0)) {
            bytes = new Uint8Array(0);
        } else {
            let buffer: ArrayBuffer = new ArrayBuffer(8);
            let dataview: DataView = new DataView(buffer);
            dataview.setFloat64(0, value, false);
            bytes = new Uint8Array(buffer);
        }
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.FLOAT, this.encodeAnnotations(this._annotations), bytes));
    }

    writeInt(value: number | JSBI | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.INT);
            return;
        }

        this.addNode(new IntNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations), value));
    }

    writeNull(type: IonType) {
        if (type === undefined || type === null) {
            type = IonTypes.NULL;
        }
        this.checkWriteValue();
        this.addNode(new NullNode(this.writer, this.getCurrentContainer(), type, this.encodeAnnotations(this._annotations)));
    }

    writeString(value: string | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.STRING);
            return;
        }

        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.STRING, this.encodeAnnotations(this._annotations), encodeUtf8(value)));
    }

    writeSymbol(value: string | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.SYMBOL);
        } else {
            let symbolId: number = this.symbolTable.addSymbol(value);
            let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(symbolId)));
            writer.writeUnsignedInt(symbolId);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.SYMBOL, this.encodeAnnotations(this._annotations), writer.getBytes()));
        }
    }

    writeTimestamp(value: Timestamp | null): void {
        _assertDefined(value);
        this.checkWriteValue();
        if (value === null) {
            this.writeNull(IonTypes.TIMESTAMP);
            return;
        }
        let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(12));//where does the 12 come from
        writer.writeVariableLengthSignedInt(value.getLocalOffset());

        let date = value.getDate();
        writer.writeVariableLengthUnsignedInt(date.getUTCFullYear());
        if (value.getPrecision() >= TimestampPrecision.MONTH) {
            writer.writeVariableLengthUnsignedInt(date.getUTCMonth() + 1);
        }
        if (value.getPrecision() >= TimestampPrecision.DAY) {
            writer.writeVariableLengthUnsignedInt(date.getUTCDate());
        }
        if (value.getPrecision() >= TimestampPrecision.HOUR_AND_MINUTE) {
            writer.writeVariableLengthUnsignedInt(date.getUTCHours());
            writer.writeVariableLengthUnsignedInt(date.getUTCMinutes());
        }
        if (value.getPrecision() >= TimestampPrecision.SECONDS) {
            writer.writeVariableLengthUnsignedInt(value.getSecondsInt());
            let fractionalSeconds = value._getFractionalSeconds();
            if (fractionalSeconds.getExponent() !== 0) {
                writer.writeVariableLengthSignedInt(fractionalSeconds.getExponent());
                if (!JsbiSupport.isZero(fractionalSeconds.getCoefficient())) {
                    writer.writeBytes(JsbiSerde.toSignedIntBytes(fractionalSeconds.getCoefficient(), fractionalSeconds.isNegative()));
                }
            }
        }
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes.TIMESTAMP, this.encodeAnnotations(this._annotations), writer.getBytes()));
    }

    stepIn(type: IonType): void {
        this.checkWriteValue();
        switch (type) {
            case IonTypes.LIST:
            case IonTypes.SEXP:
                this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), type, this.encodeAnnotations(this._annotations)));
                break;
            case IonTypes.STRUCT:
                this.addNode(new StructNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations)));
                this.state = States.STRUCT_FIELD;
                break;
            default:
                throw new Error("Unrecognized container type");
        }
    }

    stepOut() {
        if (this.depth() === 0) {
            throw new Error("Not currently in a container");
        }
        if (this.state === States.STRUCT_VALUE) {
            throw new Error("Cannot exit a struct with a partially written field");
        }

        this.containers.pop();

        if (this.depth() > 0) {
            this.state = this.getCurrentContainer() instanceof StructNode
                ? States.STRUCT_FIELD
                : States.VALUE;
        } else {
            this.state = States.VALUE;
        }
    }

    writeFieldName(fieldName: string): void {
        _assertDefined(fieldName);
        if (this.state !== States.STRUCT_FIELD) {
            throw new Error("Cannot write a field name outside of a struct");
        }

        this.fieldName = this.encodeAnnotations([fieldName]);
        this.state = States.STRUCT_VALUE;
    }

    public depth(): number {
        return this.containers.length;
    }

    close(): void {
        this.checkClosed();
        if (this.depth() > 0) {
            throw new Error("Writer has one or more open containers; call stepOut() for each container prior to close()");
        }
        this.writeIvm();
        let datagram: Node[] = this.datagram;
        this.datagram = [];
        this.writeSymbolTable();
        for (let node of datagram) {
            node.write();
        }
        this.state = States.CLOSED;
    }

    private writeIvm(): void {
        this.writer.writeByte(0xE0);
        this.writer.writeByte(MAJOR_VERSION);
        this.writer.writeByte(MINOR_VERSION);
        this.writer.writeByte(0xEA);
    }

    private encodeAnnotations(annotations: string[]): Uint8Array {
        if (annotations.length === 0) {
            return new Uint8Array(0);
        }
        let writeable: Writeable = new Writeable();
        let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(writeable);
        for (let annotation of annotations) {
            let symbolId: number = this.symbolTable.addSymbol(annotation);
            writer.writeVariableLengthUnsignedInt(symbolId);
        }
        this._clearAnnotations();
        return writeable.getBytes();
    }

    private getCurrentContainer(): Node {
        return this.containers[this.containers.length - 1];
    }

    private addNode(node: Node): void {
        if (this.depth() === 0) {
            this.datagram.push(node);
        } else {
            if (this.state === States.STRUCT_VALUE) {
                this.getCurrentContainer().addChild(node, this.fieldName);
                this.state = States.STRUCT_FIELD;
            } else {
                this.getCurrentContainer().addChild(node);
            }
        }

        if (node.isContainer()) {
            this.containers.push(node);
            this.state = States.VALUE;
        }
    }

    private checkWriteValue(): void {
        this.checkClosed();
        if (this.state === States.STRUCT_FIELD) {
            throw new Error("Expected a struct field name instead of a value, call writeFieldName(string) with the desired name before calling stepIn(IonType) or writeIonType()");
        }
    }

    private checkClosed(): void {
        if (this.state === States.CLOSED) {
            throw new Error("Writer is closed, no further operations are available");
        }
    }

    private writeSymbolTable() {
        let hasImports: boolean = this.symbolTable.import.symbolTable.name != "$ion";
        let hasLocalSymbols = this.symbolTable.symbols.length > 0;
        if (!(hasImports || hasLocalSymbols)) {
            return;
        }

        this.setAnnotations(['$ion_symbol_table']);
        this.stepIn(IonTypes.STRUCT);
        if (hasImports) {
            this.writeFieldName('imports');
            this.stepIn(IonTypes.LIST);
            this.writeImport(this.symbolTable.import);
            this.stepOut();
        }
        if (hasLocalSymbols) {
            this.writeFieldName('symbols');
            this.stepIn(IonTypes.LIST);
            for (let symbol_ of this.symbolTable.symbols) {
                if (symbol_ !== undefined) {//TODO investigate if this needs more error handling.
                    this.writeString(symbol_);
                }
            }
            this.stepOut();
        }
        this.stepOut();
        this.datagram[0].write();
    }

    private writeImport(import_: Import | null) {
        if (!import_) {
            return;
        }
        this.writeImport(import_.parent);
        this.stepIn(IonTypes.STRUCT);
        this.writeFieldName('name');
        this.writeString(import_.symbolTable.name);
        this.writeFieldName('version');
        this.writeInt(import_.symbolTable.version);
        this.writeFieldName('max_id');
        this.writeInt(import_.length);
        this.stepOut();
    }
}

export interface Node {
    isContainer(): boolean;
    addChild(child: Node, name?: Uint8Array): void;
    write(): void;
    getLength(): number;
}

export abstract class AbstractNode implements Node {
    protected constructor(
        private readonly _writer: LowLevelBinaryWriter,
        private readonly parent: Node | null,
        private readonly _type: IonType,
        private readonly annotations: Uint8Array
    ) {
    }

    get typeCode(): number {
        return this._type.binaryTypeId;
    }

    get writer(): LowLevelBinaryWriter {
        return this._writer;
    }

    static getLengthLength(length: number): number {
        if (length < MAX_VALUE_LENGTH) {
            return 0;
        } else {
            return LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(length);
        }
    }

    writeTypeDescriptorAndLength(typeCode: TypeCodes, isNull: boolean, length: number): void {
        let typeDescriptor: number = typeCode << 4;
        if (isNull) {
            typeDescriptor |= NULL_VALUE_FLAG;
            this.writer.writeByte(typeDescriptor);
        } else if (length < MAX_VALUE_LENGTH) {
            typeDescriptor |= length;
            this.writer.writeByte(typeDescriptor);
        } else {
            typeDescriptor |= MAX_VALUE_LENGTH_FLAG;
            this.writer.writeByte(typeDescriptor);
            this.writer.writeVariableLengthUnsignedInt(length);
        }
    }

    getContainedValueLength(): number {
        let valueLength: number = this.getValueLength();
        let valueLengthLength: number = AbstractNode.getLengthLength(valueLength);
        return TYPE_DESCRIPTOR_LENGTH + valueLengthLength + valueLength;
    }

    abstract getValueLength(): number;

    getAnnotatedContainerLength(): number {
        let annotationsLength = this.annotations.length;
        let annotationsLengthLength = LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
        let containedValueLength = this.getContainedValueLength();
        return annotationsLength + annotationsLengthLength + containedValueLength;
    }

    getAnnotationsLength(): number {
        if (this.hasAnnotations()) {
            let annotationsLength = this.annotations.length;
            let annotationsLengthLength = LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
            let containedValueLength = this.getContainedValueLength();
            let containedValueLengthLength = AbstractNode.getLengthLength(containedValueLength);
            return TYPE_DESCRIPTOR_LENGTH + containedValueLengthLength + annotationsLengthLength + annotationsLength;
        }
        return 0;
    }

    getLength(): number {
        let annotationsLength: number = this.getAnnotationsLength();
        let containedValueLength: number = this.getContainedValueLength();
        return annotationsLength + containedValueLength;
    }

    writeAnnotations(): void {
        if (!this.hasAnnotations()) {
            return;
        }

        let annotatedContainerLength = this.getAnnotatedContainerLength();
        this.writeTypeDescriptorAndLength(TypeCodes.ANNOTATION, false, annotatedContainerLength);
        this.writer.writeVariableLengthUnsignedInt(this.annotations.length);
        this.writer.writeBytes(new Uint8Array(this.annotations));
    }

    abstract isContainer(): boolean;

    abstract addChild(child: Node, name?: Uint8Array): void;

    abstract write(): void;

    private hasAnnotations() {
        return this.annotations.length > 0;
    }
}

abstract class ContainerNode extends AbstractNode {
    protected constructor(writer: LowLevelBinaryWriter, parent: Node, type: IonType, annotations: Uint8Array) {
        super(writer, parent, type, annotations);
    }

    isContainer(): boolean {
        return true;
    }
}

class SequenceNode extends ContainerNode {
    private children: Node[] = [];
    private length: number;

    constructor(writer: LowLevelBinaryWriter, parent: Node, type: IonType, annotations: Uint8Array) {
        super(writer, parent, type, annotations);
    }

    addChild(child: Node, name?: Uint8Array): void {
        this.children.push(child);
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
        for (let child of this.children) {
            child.write();
        }
    }

    getValueLength(): number {
        let valueLength: number = 0;
        for (let child of this.children) {
            valueLength += child.getLength();
        }
        return valueLength;
    }

    getLength(): number {
        if (this.length === undefined) {
            this.length = super.getLength();
        }
        return this.length;
    }
}

interface Field {
    name: Uint8Array;
    value: Node;
}

class StructNode extends ContainerNode {
    private fields: Field[] = [];
    private length: number;

    constructor(writer: LowLevelBinaryWriter, parent: Node, annotations: Uint8Array) {
        super(writer, parent, IonTypes.STRUCT, annotations);
    }

    addChild(child: Node, fieldName?: Uint8Array): void {
        if (fieldName === null || fieldName === undefined) throw new Error("Cannot add a value to a struct without a field name");
        this.fields.push({name: fieldName, value: child});
    }

    getValueLength(): number {
        let valueLength: number = 0;
        for (let field of this.fields) {
            valueLength += field.name.length;
            valueLength += field.value.getLength();
        }
        return valueLength;
    }

    getLength(): number {
        if (this.length === undefined) {
            this.length = super.getLength();
        }
        return this.length;
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
        for (let field of this.fields) {
            this.writer.writeBytes(new Uint8Array(field.name));
            field.value.write();
        }
    }
}

export abstract class LeafNode extends AbstractNode {
    addChild(child: Node, name?: Uint8Array): void {
        throw new Error("Cannot add a child to a leaf node");
    }

    isContainer(): boolean {
        return false;
    }
}

class BooleanNode extends LeafNode {
    constructor(writer: LowLevelBinaryWriter, parent: Node, annotations: Uint8Array, private readonly value: boolean) {
        super(writer, parent, IonTypes.BOOL, annotations);
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.typeCode, false, this.value ? 1 : 0);
    }

    getValueLength(): number {
        return 0;
    }
}

class IntNode extends LeafNode {
    private readonly intTypeCode: TypeCodes;
    private readonly bytes: Uint8Array;

    constructor(writer: LowLevelBinaryWriter, parent: Node, annotations: Uint8Array, private readonly value: number | JSBI) {
        super(writer, parent, IonTypes.INT, annotations);

        if (!(typeof this.value === 'number' || this.value instanceof JSBI)) {
            throw new Error('Expected ' + this.value + ' to be a number or JSBI');
        }

        if (JSBI.GT(this.value, 0)) {
            this.intTypeCode = TypeCodes.POSITIVE_INT;
            let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(this.value)));
            writer.writeUnsignedInt(this.value);
            this.bytes = writer.getBytes();

        } else if (JSBI.LT(this.value, 0)) {
            this.intTypeCode = TypeCodes.NEGATIVE_INT;
            let magnitude: number | JSBI;
            if (value instanceof JSBI) {
                if (JsbiSupport.isNegative(value)) {
                    magnitude = JSBI.unaryMinus(value);
                } else {
                    magnitude = value;
                }
            } else {
                magnitude = Math.abs(value);
            }
            let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(magnitude)));
            writer.writeUnsignedInt(magnitude);
            this.bytes = writer.getBytes();

        } else {
            // this.value is 0
            this.intTypeCode = TypeCodes.POSITIVE_INT;
            this.bytes = new Uint8Array(0);
        }
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.intTypeCode, false, this.bytes.length);
        this.writer.writeBytes(this.bytes);
    }

    getValueLength(): number {
        return this.bytes.length;
    }
}

class BytesNode extends LeafNode {
    constructor(writer: LowLevelBinaryWriter, parent: Node, type: IonType, annotations: Uint8Array, private readonly value: Uint8Array) {
        super(writer, parent, type, annotations);
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.typeCode, false, this.value.length);
        this.writer.writeBytes(this.value);
    }

    getValueLength(): number {
        return this.value.length;
    }
}

export class NullNode extends LeafNode {
    constructor(writer: LowLevelBinaryWriter, parent: Node | null, type: IonType, annotations: Uint8Array) {
        super(writer, parent, type, annotations);
    }

    write(): void {
        this.writeAnnotations();
        this.writeTypeDescriptorAndLength(this.typeCode, true, 0);
    }

    getValueLength(): number {
        return 0;
    }
}
