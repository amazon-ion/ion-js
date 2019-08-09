/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
import {Decimal} from "./IonDecimal";
import {encodeUtf8} from "./IonUnicode";
import {Import} from "./IonImport";
import {LocalSymbolTable} from "./IonLocalSymbolTable";
import {LongInt} from "./IonLongInt";
import {LowLevelBinaryWriter} from "./IonLowLevelBinaryWriter";
import {Precision} from "./IonPrecision";
import {Reader} from "./IonReader";
import {Timestamp} from "./IonTimestamp";
import {TypeCodes} from "./IonBinary";
import {Writeable} from "./IonWriteable";
import {Writer} from "./IonWriter";
import {_sign, _writeValues} from "./util";

const MAJOR_VERSION: number = 1;
const MINOR_VERSION: number = 0;

const MAX_VALUE_LENGTH: number = 14;
const MAX_VALUE_LENGTH_FLAG: number = 14;

const NULL_VALUE_FLAG: number = 15;

const TYPE_DESCRIPTOR_LENGTH: number = 1;

/** Possible writer states */
enum States {
  /** The writer expects a value (a call to writeInt(), writeString(), etc.) or a transition (endContainer(), close()) */
  VALUE,
  /** The writer expects a struct field name (valid calls are writeFieldName() and endContainer()) */
  STRUCT_FIELD,
  /** The writer expects a struct value (writeInt(), writeString(), etc.) but not a transition (endContainer() and close() will throw an exception) */
  STRUCT_VALUE,
  /** The writer is closed, no further operations may be performed */
  CLOSED,
}

/**
 * Writes out Ion values in Ion's binary format.
 *
 * This implementation caches serialized values in an in-memory tree.
 * It does not support multiple local symbol tables (aka "symbol table append").
 *
 * @see http://amzn.github.io/ion-docs/binary.html
 */
export class BinaryWriter implements Writer {
  getBytes(): Uint8Array {
    return this.writer.getBytes();
  }
  private readonly symbolTable: LocalSymbolTable;
  private readonly writer: LowLevelBinaryWriter;

  private datagram: Node[] = [];
  private containers: Node[] = [];
  private fieldName: Uint8Array;
  private state: States = States.VALUE;

  constructor(symbolTable: LocalSymbolTable, writeable: Writeable) {
    this.symbolTable = symbolTable;
    this.writer = new LowLevelBinaryWriter(writeable);
  }

  writeBlob(value: Uint8Array, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.BLOB, annotations);
      return;
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.BLOB, this.encodeAnnotations(annotations), value));
  }

  writeBoolean(value: boolean, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.BOOL, annotations);
      return;
    }

    this.addNode(new BooleanNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(annotations), value));
  }

  writeClob(value: Uint8Array, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.CLOB, annotations);//TODO this is wrong
      return;
    }

    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.CLOB, this.encodeAnnotations(annotations), value));
  }

  writeDecimal(value: Decimal | string, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.DECIMAL, annotations);
      return;
    }

    if (typeof value == 'string') value = Decimal.parse(value);

    let isPositiveZero: boolean = value.numberValue() === 0 && !value.isNegative();
    let exponent: number = value._getExponent();
    if (isPositiveZero && exponent === 0 && _sign(exponent) === 1) {
      // Special case per the spec: http://amzn.github.io/ion-docs/docs/binary.html#5-decimal
      this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.DECIMAL, this.encodeAnnotations(annotations), new Uint8Array(0)));
      return;
    }

    let coefficient: LongInt = value._getCoefficient();
    let writeCoefficient = !(coefficient.isZero() && coefficient.signum() === 1);  // no need to write a coefficient of 0
    let coefficientBytes: Uint8Array | null = writeCoefficient ? coefficient.intBytes() : null;

    let bufLen = LowLevelBinaryWriter.getVariableLengthSignedIntSize(exponent) + (writeCoefficient ? coefficientBytes.length : 0);
    let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(bufLen));
    writer.writeVariableLengthSignedInt(exponent);
    if (writeCoefficient) {
      writer.writeBytes(coefficientBytes);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.DECIMAL, this.encodeAnnotations(annotations), writer.getBytes()));
  }

  writeFloat32(value: number, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.FLOAT, annotations);
      return;
    }

    let bytes: Uint8Array;
    if (value === 0) {
      bytes = new Uint8Array(0);
    } else {
      let buffer: ArrayBuffer = new ArrayBuffer(4);
      let dataview: DataView = new DataView(buffer);
      dataview.setFloat32(0, value, false);
      bytes = new Uint8Array(buffer);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.FLOAT, this.encodeAnnotations(annotations), bytes));
  }

  writeFloat64(value: number, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.FLOAT, annotations);
      return;
    }

    let bytes: Uint8Array;
    if (value === 0) {
      bytes = new Uint8Array(0);
    } else {
      let buffer: ArrayBuffer = new ArrayBuffer(8);
      let dataview: DataView = new DataView(buffer);
      dataview.setFloat64(0, value, false);
      bytes = new Uint8Array(buffer);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.FLOAT, this.encodeAnnotations(annotations), bytes));
  }

  writeInt(value: number, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.POSITIVE_INT, annotations);
      return;
    }

    let typeCode: TypeCodes;
    let bytes: Uint8Array;
    if (value === 0) {
      typeCode = TypeCodes.POSITIVE_INT;
      bytes = new Uint8Array(0);
    } else if (value > 0) {
      typeCode = TypeCodes.POSITIVE_INT;
      let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(value)));
      writer.writeUnsignedInt(value);
      bytes = writer.getBytes();
    } else {
      typeCode = TypeCodes.NEGATIVE_INT;
      let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(Math.abs(value))));
      writer.writeUnsignedInt(Math.abs(value));
      bytes = writer.getBytes();
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), typeCode, this.encodeAnnotations(annotations), bytes));
  }

  writeList(annotations?: string[], isNull: boolean = false) : void {
    this.checkWriteValue();
    if (isNull) {
      this.writeNull(TypeCodes.LIST, annotations);
      return;
    }

    this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), TypeCodes.LIST, this.encodeAnnotations(annotations)));
  }

  writeNull(type_: TypeCodes = TypeCodes.NULL, annotations?: string[]) {
    this.checkWriteValue();
    this.addNode(new NullNode(this.writer, this.getCurrentContainer(), type_, this.encodeAnnotations(annotations)));
  }

  writeSexp(annotations?: string[], isNull: boolean = false) : void {
    this.checkWriteValue();
    if (isNull) {
      this.writeNull(TypeCodes.SEXP, annotations);
      return;
    }

    this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), TypeCodes.SEXP, this.encodeAnnotations(annotations)));
  }

  writeString(value: string, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.STRING, annotations);
      return;
    }

    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.STRING, this.encodeAnnotations(annotations), encodeUtf8(value)));
  }

  writeStruct(annotations?: string[], isNull: boolean = false) : void {
    this.checkWriteValue();
    if (isNull) {
      this.writeNull(TypeCodes.STRUCT, annotations);
      return;
    }

    this.addNode(new StructNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(annotations)));
    this.state = States.STRUCT_FIELD;
  }

  writeSymbol(value: string, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null) {
        this.writeNull(TypeCodes.SYMBOL, annotations);
    } else {
        let symbolId: number = this.symbolTable.addSymbol(value);
        let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(LowLevelBinaryWriter.getUnsignedIntSize(symbolId)));
        writer.writeUnsignedInt(symbolId);
        this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.SYMBOL, this.encodeAnnotations(annotations), writer.getBytes()));
    }
  }

  writeTimestamp(value: Timestamp, annotations?: string[]) : void {
    this.checkWriteValue();
    if (value === null || value === undefined) {
      this.writeNull(TypeCodes.TIMESTAMP, annotations);
      return;
    }
    let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(new Writeable(12));//where does the 12 come from
    writer.writeVariableLengthSignedInt(value.getOffset());
    writer.writeVariableLengthUnsignedInt(value.date.getUTCFullYear());
    if (value.getPrecision() >= Precision.MONTH) {
        writer.writeVariableLengthUnsignedInt(value.date.getUTCMonth());
    }
    if (value.getPrecision() >= Precision.DAY) {
        writer.writeVariableLengthUnsignedInt(value.date.getUTCDate());
    }
    if (value.getPrecision() >= Precision.HOUR_AND_MINUTE) {
        writer.writeVariableLengthUnsignedInt(value.date.getUTCHours());
        writer.writeVariableLengthUnsignedInt(value.date.getUTCMinutes());
    }
    if (value.getPrecision() >= Precision.SECONDS) {
        writer.writeVariableLengthUnsignedInt(value.seconds);
    }
    if (value.getPrecision() === Precision.FRACTION) {
        writer.writeVariableLengthSignedInt(value.fraction._getExponent());
        writer.writeBytes(value.fraction._getCoefficient().intBytes());
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), TypeCodes.TIMESTAMP, this.encodeAnnotations(annotations), writer.getBytes()));
  }

  endContainer() {
    if (this.isTopLevel()) {
      throw new Error("Not currently in a container");
    }
    if (this.state === States.STRUCT_VALUE) {
      throw new Error("Cannot exit a struct with a partially written field");
    }

    this.containers.pop();

    if (!this.isTopLevel()) {
      this.state = this.getCurrentContainer() instanceof StructNode
        ? States.STRUCT_FIELD
        : States.VALUE;
    } else {
      this.state = States.VALUE;
    }
  }

  private writeIvm() : void {
    this.writer.writeByte(0xE0);
    this.writer.writeByte(MAJOR_VERSION);
    this.writer.writeByte(MINOR_VERSION);
    this.writer.writeByte(0xEA);
  }

  writeFieldName(fieldName: string) : void {
    if (this.state !== States.STRUCT_FIELD) {
      throw new Error("Cannot write a field name outside of a struct");
    }

    this.fieldName = this.encodeAnnotations([fieldName]);
    this.state = States.STRUCT_VALUE;
  }

  private encodeAnnotations(annotations: string[]) : Uint8Array {
    if (!annotations || annotations.length === 0) {
      return new Uint8Array(0);
    }

    let writeable: Writeable = new Writeable();
    let writer: LowLevelBinaryWriter = new LowLevelBinaryWriter(writeable);
    for (let annotation of annotations) {
      let symbolId: number = this.symbolTable.addSymbol(annotation);
      writer.writeVariableLengthUnsignedInt(symbolId);
    }
    return writeable.getBytes();
  }

  private isTopLevel() : boolean {
    return this.containers.length === 0;
  }

  private getCurrentContainer() : Node {
    return this.containers[this.containers.length - 1];
  }

  private addNode(node: Node) : void {
    if (this.isTopLevel()) {
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

  close() : void {
    this.checkClosed();
    if(!this.isTopLevel()) {
      throw new Error("Writer has one or more open containers; call endContainer() for each container prior to close()");
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

  private checkWriteValue() : void {
    this.checkClosed();
    if (this.state === States.STRUCT_FIELD) {
      throw new Error("Expected a struct field name instead of a value");
    }
  }

  private checkClosed() : void {
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

    this.writeStruct(['$ion_symbol_table']);
    if (hasImports) {
      this.writeFieldName('imports');
      this.writeList();
      this.writeImport(this.symbolTable.import);
      this.endContainer();
    }
    if (hasLocalSymbols) {
      this.writeFieldName('symbols');
      this.writeList();
      for (let symbol_ of this.symbolTable.symbols) {
        if (symbol_ !== undefined) {//TODO investigate if this needs more error handling.
          this.writeString(symbol_);
        }
      }
      this.endContainer();
    }
    this.endContainer();
    this.datagram[0].write();
  }

  private writeImport(import_: Import) {
    if (!import_) {
      return;
    }
    this.writeImport(import_.parent);
    this.writeStruct();
    this.writeFieldName('name');
    this.writeString(import_.symbolTable.name);
    this.writeFieldName('version');
    this.writeInt(import_.symbolTable.version);
    this.writeFieldName('max_id');
    this.writeInt(import_.length);
    this.endContainer();
  }

  writeValues(reader: Reader, writer: Writer): void {
    _writeValues(reader, this);
  }
}

export interface Node {
  isContainer(): boolean;
  addChild(child: Node, name?: Uint8Array): void;
  write() : void;
  getLength() : number;
}

export abstract class AbstractNode implements Node {
  protected constructor(
    private readonly _writer: LowLevelBinaryWriter,
    private readonly parent: Node,
    private readonly _typeCode: TypeCodes,
    private readonly annotations: Uint8Array
  ) {}

  private hasAnnotations() {
    return this.annotations.length > 0;
  }

  writeTypeDescriptorAndLength(typeCode: TypeCodes, isNull: boolean, length: number) : void {
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

  static getLengthLength(length: number) : number {
    if (length < MAX_VALUE_LENGTH) {
      return 0;
    } else {
      return LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(length);
    }
  }

  getContainedValueLength() : number {
    let valueLength: number = this.getValueLength();
    let valueLengthLength: number = AbstractNode.getLengthLength(valueLength);
    return TYPE_DESCRIPTOR_LENGTH + valueLengthLength + valueLength;
  }

  abstract getValueLength() : number;

  getAnnotatedContainerLength() : number {
    let annotationsLength = this.annotations.length;
    let annotationsLengthLength = LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
    let containedValueLength = this.getContainedValueLength();
    return annotationsLength + annotationsLengthLength + containedValueLength;
  }

  getAnnotationsLength() : number {
    if (this.hasAnnotations()) {
      let annotationsLength = this.annotations.length;
      let annotationsLengthLength = LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
      let containedValueLength = this.getContainedValueLength();
      let containedValueLengthLength = AbstractNode.getLengthLength(containedValueLength);
      return TYPE_DESCRIPTOR_LENGTH + containedValueLengthLength + annotationsLengthLength + annotationsLength;
    }
    return 0;
  }

  getLength() : number {
    let annotationsLength: number = this.getAnnotationsLength();
    let containedValueLength: number = this.getContainedValueLength();
    return annotationsLength + containedValueLength;
  }

  writeAnnotations() : void {
    if (!this.hasAnnotations()) {
      return;
    }

    let annotatedContainerLength = this.getAnnotatedContainerLength();
    this.writeTypeDescriptorAndLength(TypeCodes.ANNOTATION, false, annotatedContainerLength);
    this.writer.writeVariableLengthUnsignedInt(this.annotations.length);
    this.writer.writeBytes(new Uint8Array(this.annotations));
  }

  get typeCode() : number {
    return this._typeCode;
  }

  get writer() : LowLevelBinaryWriter {
    return this._writer;
  }

  abstract isContainer() : boolean;

  abstract addChild(child: Node, name?: Uint8Array) : void;

  abstract write() : void;
}

abstract class ContainerNode extends AbstractNode {
  protected constructor(writer: LowLevelBinaryWriter, parent: Node, typeCode: TypeCodes, annotations: Uint8Array) {
    super(writer, parent, typeCode, annotations);
  }

  isContainer() : boolean {
    return true;
  }
}

class SequenceNode extends ContainerNode {
  private children: Node[] = [];
  private length: number;

  constructor(writer: LowLevelBinaryWriter, parent: Node, typeCode: TypeCodes, annotations: Uint8Array) {
    super(writer, parent, typeCode, annotations);
  }

  addChild(child: Node, name?: Uint8Array): void {
    this.children.push(child);
  }

  write() : void {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
    for (let child of this.children) {
      child.write();
    }
  }

  getValueLength() : number {
    let valueLength: number = 0;
    for (let child of this.children) {
      valueLength += child.getLength();
    }
    return valueLength;
  }

  getLength() : number {
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
    super(writer, parent, TypeCodes.STRUCT, annotations);
  }

  addChild(child: Node, fieldName?: Uint8Array) : void {
    if (fieldName === null || fieldName === undefined) throw new Error("Cannot add a value to a struct without a field name");
    this.fields.push({name: fieldName, value: child});
  }

  getValueLength() : number {
    let valueLength: number = 0;
    for (let field of this.fields) {
      valueLength += field.name.length;
      valueLength += field.value.getLength();
    }
    return valueLength;
  }

  getLength() : number {
    if (this.length === undefined) {
      this.length = super.getLength();
    }
    return this.length;
  }

  write() : void {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
    for (let field of this.fields) {
      this.writer.writeBytes(new Uint8Array(field.name));
      field.value.write();
    }
  }
}

export abstract class LeafNode extends AbstractNode {
  addChild(child: Node, name?: Uint8Array) : void {
    throw new Error("Cannot add a child to a leaf node");
  }

  isContainer() : boolean {
    return false;
  }
}

class BooleanNode extends LeafNode {
  constructor(writer: LowLevelBinaryWriter, parent: Node, annotations: Uint8Array, private readonly value: boolean) {
    super(writer, parent, TypeCodes.BOOL, annotations);
  }

  write() : void {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.value ? 1 : 0);
  }

  getValueLength() : number {
    return 0;
  }
}

class BytesNode extends LeafNode {
  constructor(writer: LowLevelBinaryWriter, parent: Node, typeCode: TypeCodes, annotations: Uint8Array, private readonly value: Uint8Array) {
    super(writer, parent, typeCode, annotations);
  }

  write() : void {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.value.length);
    this.writer.writeBytes(this.value);
  }

  getValueLength() : number {
    return this.value.length;
  }
}

export class NullNode extends LeafNode {
  constructor(writer: LowLevelBinaryWriter, parent: Node, typeCode: TypeCodes, annotations: Uint8Array) {
    super(writer, parent, typeCode, annotations);
  }

  write() : void {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, true, 0);
  }

  getValueLength() : number {
    return 0;
  }
}
