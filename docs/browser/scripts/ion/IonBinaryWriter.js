define(["require", "exports", "./IonDecimal", "./IonUnicode", "./IonUtilities", "./IonUtilities", "./IonUtilities", "./IonUtilities", "./IonLongInt", "./IonLowLevelBinaryWriter", "./IonPrecision", "./IonBinary", "./IonWriteable"], function (require, exports, IonDecimal_1, IonUnicode_1, IonUtilities_1, IonUtilities_2, IonUtilities_3, IonUtilities_4, IonLongInt_1, IonLowLevelBinaryWriter_1, IonPrecision_1, IonBinary_1, IonWriteable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const MAJOR_VERSION = 1;
    const MINOR_VERSION = 0;
    const MAX_VALUE_LENGTH = 14;
    const MAX_VALUE_LENGTH_FLAG = 14;
    const NULL_VALUE_FLAG = 15;
    const TYPE_DESCRIPTOR_LENGTH = 1;
    var States;
    (function (States) {
        States[States["VALUE"] = 0] = "VALUE";
        States[States["STRUCT_FIELD"] = 1] = "STRUCT_FIELD";
        States[States["STRUCT_VALUE"] = 2] = "STRUCT_VALUE";
        States[States["CLOSED"] = 3] = "CLOSED";
    })(States || (States = {}));
    class BinaryWriter {
        constructor(symbolTable, writeable) {
            this.datagram = [];
            this.containers = [];
            this.state = States.VALUE;
            this.symbolTable = symbolTable;
            this.writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(writeable);
        }
        getBytes() {
            return this.writer.getBytes();
        }
        writeBlob(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.BLOB, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.BLOB, symbolIds, value));
        }
        writeBoolean(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.BOOL, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new BooleanNode(this.writer, this.getCurrentContainer(), symbolIds, value));
        }
        writeClob(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.CLOB, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.CLOB, symbolIds, value));
        }
        writeDecimal(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.DECIMAL, annotations);
                return;
            }
            if (IonUtilities_2.isString(value)) {
                value = IonDecimal_1.Decimal.parse(value);
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let isPositiveZero = value.isZero() && !value.isNegative();
            if (isPositiveZero) {
                this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.DECIMAL, symbolIds, []));
                return;
            }
            let exponent = value.getExponent();
            let digits = value.getDigits().byteValue();
            if (value.isNegative()) {
                if (digits.length > 0) {
                    let signBitInUse = (digits[0] & 0x80) > 0;
                    if (signBitInUse) {
                        digits.unshift(0x80);
                    }
                    else {
                        digits[0] |= 0x80;
                    }
                }
                else {
                    digits = [0x80];
                }
            }
            let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthSignedIntSize(exponent) + digits.length);
            writer.writeVariableLengthSignedInt(exponent);
            writer.writeBytes(digits);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.DECIMAL, symbolIds, writer.getBytes()));
        }
        writeFloat32(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.FLOAT, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let bytes;
            if (value === 0) {
                bytes = [];
            }
            else {
                let buffer = new ArrayBuffer(4);
                let dataview = new DataView(buffer);
                dataview.setFloat32(0, value, false);
                bytes = Array['from'](new Uint8Array(buffer));
            }
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.FLOAT, symbolIds, bytes));
        }
        writeFloat64(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.FLOAT, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let bytes = undefined;
            if (value === 0) {
                bytes = [];
            }
            else {
                let buffer = new ArrayBuffer(8);
                let dataview = new DataView(buffer);
                dataview.setFloat64(0, value, false);
                bytes = Array['from'](new Uint8Array(buffer));
            }
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.FLOAT, symbolIds, bytes));
        }
        writeInt(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.POSITIVE_INT, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let typeCode;
            let bytes;
            if (value === 0) {
                typeCode = IonBinary_1.TypeCodes.POSITIVE_INT;
                bytes = [];
            }
            else if (value > 0) {
                typeCode = IonBinary_1.TypeCodes.POSITIVE_INT;
                let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(value));
                writer.writeUnsignedInt(value);
                bytes = writer.getBytes();
            }
            else {
                typeCode = IonBinary_1.TypeCodes.NEGATIVE_INT;
                let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(Math.abs(value)));
                writer.writeUnsignedInt(Math.abs(value));
                bytes = writer.getBytes();
            }
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), typeCode, symbolIds, bytes));
        }
        writeList(annotations, isNull = false) {
            this.checkWriteValue();
            if (isNull) {
                this.writeNull(IonBinary_1.TypeCodes.LIST, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.LIST, symbolIds));
        }
        writeNull(type_ = IonBinary_1.TypeCodes.NULL, annotations) {
            this.checkWriteValue();
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new NullNode(this.writer, this.getCurrentContainer(), type_, symbolIds));
        }
        writeSexp(annotations, isNull = false) {
            this.checkWriteValue();
            if (isNull) {
                this.writeNull(IonBinary_1.TypeCodes.SEXP, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.SEXP, symbolIds));
        }
        writeString(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.STRING, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let utf8 = IonUnicode_1.encodeUtf8(value);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.STRING, symbolIds, utf8));
        }
        writeStruct(annotations, isNull = false) {
            this.checkWriteValue();
            if (isNull) {
                this.writeNull(IonBinary_1.TypeCodes.STRUCT, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            this.addNode(new StructNode(this.writer, this.getCurrentContainer(), symbolIds));
            this.state = States.STRUCT_FIELD;
        }
        writeSymbol(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.SYMBOL, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let symbolId = this.symbolTable.addSymbol(value);
            let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(symbolId));
            writer.writeUnsignedInt(symbolId);
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.SYMBOL, symbolIds, writer.getBytes()));
        }
        writeTimestamp(value, annotations) {
            this.checkWriteValue();
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(IonBinary_1.TypeCodes.TIMESTAMP, annotations);
                return;
            }
            let symbolIds = this.encodeAnnotations(annotations);
            let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(12);
            writer.writeVariableLengthSignedInt(value.getOffset());
            writer.writeVariableLengthUnsignedInt(value.getZuluYear());
            if (value.getPrecision() >= IonPrecision_1.Precision.MONTH) {
                writer.writeVariableLengthUnsignedInt(value.getZuluMonth());
            }
            if (value.getPrecision() >= IonPrecision_1.Precision.DAY) {
                writer.writeVariableLengthUnsignedInt(value.getZuluDay());
            }
            if (value.getPrecision() >= IonPrecision_1.Precision.HOUR_AND_MINUTE) {
                writer.writeVariableLengthUnsignedInt(value.getZuluHour());
                writer.writeVariableLengthUnsignedInt(value.getZuluMinute());
            }
            if (value.getPrecision() >= IonPrecision_1.Precision.SECONDS) {
                let seconds = value.getZuluSeconds();
                let exponent = seconds.getExponent();
                if (exponent < 0) {
                    let decimalString = seconds.getDigits().stringValue();
                    let numberOfCharacteristicDigits = decimalString.length + exponent;
                    let characteristic = IonLongInt_1.LongInt.parse(decimalString.slice(0, numberOfCharacteristicDigits)).numberValue();
                    writer.writeVariableLengthUnsignedInt(characteristic);
                    writer.writeVariableLengthSignedInt(exponent);
                    let mantissa = IonLongInt_1.LongInt.parse(decimalString.slice(numberOfCharacteristicDigits)).byteValue();
                    let isLeftmostBitSet = (mantissa[0] & 0x80) > 0;
                    if (isLeftmostBitSet) {
                        mantissa.unshift(0);
                    }
                    writer.writeBytes(mantissa);
                }
                else {
                    writer.writeVariableLengthUnsignedInt(seconds.numberValue());
                }
            }
            this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonBinary_1.TypeCodes.TIMESTAMP, symbolIds, writer.getBytes()));
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
            }
            else {
                this.state = States.VALUE;
            }
        }
        writeIvm() {
            this.writer.writeByte(0xE0);
            this.writer.writeByte(MAJOR_VERSION);
            this.writer.writeByte(MINOR_VERSION);
            this.writer.writeByte(0xEA);
        }
        writeFieldName(fieldName) {
            if (this.state !== States.STRUCT_FIELD) {
                throw new Error("Cannot write a field name outside of a struct");
            }
            let symbolId = this.encodeAnnotations([fieldName]);
            this.fieldName = symbolId;
            this.state = States.STRUCT_VALUE;
        }
        encodeAnnotations(annotations) {
            if (!annotations || annotations.length === 0) {
                return [];
            }
            let writeable = new IonWriteable_1.Writeable(annotations.length);
            let writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(writeable);
            for (let annotation of annotations) {
                let symbolId = this.symbolTable.addSymbol(annotation);
                writer.writeVariableLengthUnsignedInt(symbolId);
            }
            return Array['from'](writeable.getBytes());
        }
        isTopLevel() {
            return this.containers.length === 0;
        }
        getCurrentContainer() {
            return IonUtilities_4.last(this.containers);
        }
        addNode(node) {
            if (this.isTopLevel()) {
                this.datagram.push(node);
            }
            else {
                if (this.state === States.STRUCT_VALUE) {
                    this.getCurrentContainer().addChild(node, this.fieldName);
                    this.state = States.STRUCT_FIELD;
                }
                else {
                    this.getCurrentContainer().addChild(node);
                }
            }
            if (node.isContainer()) {
                this.containers.push(node);
                this.state = States.VALUE;
            }
        }
        close() {
            this.checkClosed();
            while (!this.isTopLevel()) {
                this.endContainer();
            }
            this.writeIvm();
            let datagram = this.datagram;
            this.datagram = [];
            this.writeSymbolTable();
            for (let node of datagram) {
                node.write();
            }
            this.state = States.CLOSED;
        }
        checkWriteValue() {
            this.checkClosed();
            if (this.state === States.STRUCT_FIELD) {
                throw new Error("Expected a struct field name instead of a value");
            }
        }
        checkClosed() {
            if (this.state === States.CLOSED) {
                throw new Error("Writer is closed, no further operations are available");
            }
        }
        writeSymbolTable() {
            let hasImports = this.symbolTable.import.symbolTable.name != "$ion";
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
                    if (!IonUtilities_3.isUndefined(symbol_)) {
                        this.writeString(symbol_);
                    }
                }
                this.endContainer();
            }
            this.endContainer();
            this.datagram[0].write();
        }
        writeImport(import_) {
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
    }
    exports.BinaryWriter = BinaryWriter;
    class AbstractNode {
        constructor(_writer, parent, _typeCode, annotations = []) {
            this._writer = _writer;
            this.parent = parent;
            this._typeCode = _typeCode;
            this.annotations = annotations;
        }
        hasAnnotations() {
            return this.annotations.length > 0;
        }
        writeTypeDescriptorAndLength(typeCode, isNull, length) {
            let typeDescriptor = typeCode << 4;
            if (isNull) {
                typeDescriptor |= NULL_VALUE_FLAG;
                this.writer.writeByte(typeDescriptor);
            }
            else if (length < MAX_VALUE_LENGTH) {
                typeDescriptor |= length;
                this.writer.writeByte(typeDescriptor);
            }
            else {
                typeDescriptor |= MAX_VALUE_LENGTH_FLAG;
                this.writer.writeByte(typeDescriptor);
                this.writer.writeVariableLengthUnsignedInt(length);
            }
        }
        getLengthLength(length) {
            if (length < MAX_VALUE_LENGTH) {
                return 0;
            }
            else {
                return IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(length);
            }
        }
        getContainedValueLength() {
            let valueLength = this.getValueLength();
            let valueLengthLength = this.getLengthLength(valueLength);
            return TYPE_DESCRIPTOR_LENGTH + valueLengthLength + valueLength;
        }
        getAnnotatedContainerLength() {
            let annotationsLength = this.annotations.length;
            let annotationsLengthLength = IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
            let containedValueLength = this.getContainedValueLength();
            return annotationsLength + annotationsLengthLength + containedValueLength;
        }
        isNull() {
            return false;
        }
        getAnnotationsLength() {
            if (this.hasAnnotations()) {
                let annotationsLength = this.annotations.length;
                let annotationsLengthLength = IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
                let containedValueLength = this.getContainedValueLength();
                let containedValueLengthLength = this.getLengthLength(containedValueLength);
                return TYPE_DESCRIPTOR_LENGTH + containedValueLengthLength + annotationsLengthLength + annotationsLength;
            }
            else {
                return 0;
            }
        }
        getLength() {
            let annotationsLength = this.getAnnotationsLength();
            let containedValueLength = this.getContainedValueLength();
            return annotationsLength + containedValueLength;
        }
        writeAnnotations() {
            if (!this.hasAnnotations()) {
                return;
            }
            let annotatedContainerLength = this.getAnnotatedContainerLength();
            this.writeTypeDescriptorAndLength(IonBinary_1.TypeCodes.ANNOTATION, false, annotatedContainerLength);
            this.writer.writeVariableLengthUnsignedInt(this.annotations.length);
            this.writer.writeBytes(this.annotations);
        }
        get typeCode() {
            return this._typeCode;
        }
        get writer() {
            return this._writer;
        }
    }
    class ContainerNode extends AbstractNode {
        constructor(writer, parent, typeCode, annotations) {
            super(writer, parent, typeCode, annotations);
        }
        isContainer() {
            return true;
        }
    }
    class SequenceNode extends ContainerNode {
        constructor(writer, parent, typeCode, annotations) {
            super(writer, parent, typeCode, annotations);
            this.children = [];
        }
        addChild(child, name) {
            this.children.push(child);
        }
        write() {
            this.writeAnnotations();
            this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
            for (let child of this.children) {
                child.write();
            }
        }
        getValueLength() {
            let valueLength = 0;
            for (let child of this.children) {
                valueLength += child.getLength();
            }
            return valueLength;
        }
        getLength() {
            if (IonUtilities_3.isUndefined(this.length)) {
                this.length = super.getLength();
            }
            return this.length;
        }
    }
    class StructNode extends ContainerNode {
        constructor(writer, parent, annotations) {
            super(writer, parent, IonBinary_1.TypeCodes.STRUCT, annotations);
            this.fields = [];
        }
        addChild(child, fieldName) {
            if (IonUtilities_1.isNullOrUndefined(fieldName)) {
                throw new Error("Cannot add a value to a struct without a field name");
            }
            this.fields.push({ name: fieldName, value: child });
        }
        getValueLength() {
            let valueLength = 0;
            for (let field of this.fields) {
                valueLength += field.name.length;
                valueLength += field.value.getLength();
            }
            return valueLength;
        }
        getLength() {
            if (IonUtilities_3.isUndefined(this.length)) {
                this.length = super.getLength();
            }
            return this.length;
        }
        write() {
            this.writeAnnotations();
            this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
            for (let field of this.fields) {
                this.writer.writeBytes(field.name);
                field.value.write();
            }
        }
    }
    class LeafNode extends AbstractNode {
        addChild(child, name) {
            throw new Error("Cannot add a child to a leaf node");
        }
        isContainer() {
            return false;
        }
    }
    class BooleanNode extends LeafNode {
        constructor(writer, parent, annotations, value) {
            super(writer, parent, IonBinary_1.TypeCodes.BOOL, annotations);
            this.value = value;
        }
        write() {
            this.writeAnnotations();
            this.writeTypeDescriptorAndLength(this.typeCode, false, this.value ? 1 : 0);
        }
        getValueLength() {
            return 0;
        }
    }
    class BytesNode extends LeafNode {
        constructor(writer, parent, typeCode, annotations, value) {
            super(writer, parent, typeCode, annotations);
            this.value = value;
        }
        write() {
            this.writeAnnotations();
            this.writeTypeDescriptorAndLength(this.typeCode, false, this.value.length);
            this.writer.writeBytes(this.value);
        }
        getValueLength() {
            return this.value.length;
        }
    }
    class NullNode extends LeafNode {
        constructor(writer, parent, typeCode, annotations) {
            super(writer, parent, typeCode, annotations);
        }
        write() {
            this.writeAnnotations();
            this.writeTypeDescriptorAndLength(this.typeCode, true, 0);
        }
        getValueLength() {
            return 0;
        }
    }
    exports.NullNode = NullNode;
});
//# sourceMappingURL=IonBinaryWriter.js.map