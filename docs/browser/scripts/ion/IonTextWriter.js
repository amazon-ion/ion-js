define(["require", "exports", "./IonText", "./IonText", "./IonUnicode", "./IonUnicode", "./IonText", "./IonText", "./IonUtilities", "./IonText", "./IonUtilities", "./IonUtilities", "./IonText", "./IonText", "./IonText", "./IonBinary"], function (require, exports, IonText_1, IonText_2, IonUnicode_1, IonUnicode_2, IonText_3, IonText_4, IonUtilities_1, IonText_5, IonUtilities_2, IonUtilities_3, IonText_6, IonText_7, IonText_8, IonBinary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var State;
    (function (State) {
        State[State["VALUE"] = 0] = "VALUE";
        State[State["STRUCT_FIELD"] = 1] = "STRUCT_FIELD";
        State[State["STRUCT_VALUE"] = 2] = "STRUCT_VALUE";
    })(State || (State = {}));
    class TextWriter {
        constructor(writeable) {
            this.writeable = writeable;
            this.state = State.VALUE;
            this.isFirstValue = true;
            this.isFirstValueInContainer = false;
            this.containers = [];
        }
        getBytes() {
            return this.writeable.getBytes();
        }
        writeBlob(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.BLOB, value, annotations, (value) => {
                this.writeUtf8('{{');
                this.writeable.writeBytes(IonUnicode_1.encodeUtf8(IonText_8.toBase64(value)));
                this.writeUtf8('}}');
            });
        }
        writeBoolean(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.BOOL, value, annotations, (value) => {
                this.writeUtf8(value ? "true" : "false");
            });
        }
        writeClob(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.CLOB, value, annotations, (value) => {
                this.writeUtf8('{{');
                this.writeUtf8('"');
                for (let i = 0; i < value.length; i++) {
                    let c = value[i];
                    if (c >= 128) {
                        throw new Error(`Illegal clob character ${c} at index ${i}`);
                    }
                    let escape = IonText_2.ClobEscapes[c];
                    if (IonUtilities_2.isUndefined(escape)) {
                        this.writeable.writeByte(c);
                    }
                    else {
                        this.writeable.writeBytes(escape);
                    }
                }
                this.writeUtf8('"');
                this.writeUtf8('}}');
            });
        }
        writeDecimal(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.DECIMAL, value, annotations, (value) => {
                this.writeUtf8(value.toString());
            });
        }
        writeFieldName(fieldName) {
            if (this.isTopLevel || this.currentContainer !== IonBinary_1.TypeCodes.STRUCT) {
                throw new Error("Cannot write field name outside of a struct");
            }
            if (this.state !== State.STRUCT_FIELD) {
                throw new Error("Expecting a struct value");
            }
            if (!this.isFirstValueInContainer) {
                this.writeable.writeByte(IonText_1.CharCodes.COMMA);
            }
            this.writeSymbolToken(fieldName);
            this.writeable.writeByte(IonText_1.CharCodes.COLON);
            this.state = State.STRUCT_VALUE;
        }
        writeFloat32(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.FLOAT, value, annotations, (value) => {
                this.writeUtf8(value.toString(10));
            });
        }
        writeFloat64(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.FLOAT, value, annotations, (value) => {
                this.writeUtf8(value.toString(10));
            });
        }
        writeInt(value, annotations) {
            this.writeValue(value >= 0 ? IonBinary_1.TypeCodes.POSITIVE_INT : IonBinary_1.TypeCodes.NEGATIVE_INT, value, annotations, (value) => {
                this.writeUtf8(value.toString(10));
            });
        }
        writeList(annotations, isNull) {
            this.writeContainer(IonBinary_1.TypeCodes.LIST, IonText_1.CharCodes.LEFT_BRACKET, annotations, isNull);
        }
        writeNull(type_, annotations) {
            this.handleSeparator();
            this.writeAnnotations(annotations);
            let s;
            switch (type_) {
                case IonBinary_1.TypeCodes.NULL:
                    s = "null";
                    break;
                case IonBinary_1.TypeCodes.BOOL:
                    s = "bool";
                    break;
                case IonBinary_1.TypeCodes.POSITIVE_INT:
                case IonBinary_1.TypeCodes.NEGATIVE_INT:
                    s = "int";
                    break;
                case IonBinary_1.TypeCodes.FLOAT:
                    s = "float";
                    break;
                case IonBinary_1.TypeCodes.DECIMAL:
                    s = "decimal";
                    break;
                case IonBinary_1.TypeCodes.TIMESTAMP:
                    s = "timestamp";
                    break;
                case IonBinary_1.TypeCodes.SYMBOL:
                    s = "symbol";
                    break;
                case IonBinary_1.TypeCodes.STRING:
                    s = "string";
                    break;
                case IonBinary_1.TypeCodes.CLOB:
                    s = "clob";
                    break;
                case IonBinary_1.TypeCodes.BLOB:
                    s = "blob";
                    break;
                case IonBinary_1.TypeCodes.LIST:
                    s = "list";
                    break;
                case IonBinary_1.TypeCodes.SEXP:
                    s = "sexp";
                    break;
                case IonBinary_1.TypeCodes.STRUCT:
                    s = "struct";
                    break;
                default:
                    throw new Error(`Cannot write null for type ${type_}`);
            }
            this.writeUtf8("null." + s);
        }
        writeSexp(annotations, isNull) {
            this.writeContainer(IonBinary_1.TypeCodes.SEXP, IonText_1.CharCodes.LEFT_PARENTHESIS, annotations, isNull);
        }
        writeString(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.STRING, value, annotations, (value) => {
                this.writeable.writeByte(IonText_1.CharCodes.DOUBLE_QUOTE);
                this.writeable.writeStream(IonUnicode_2.encodeUtf8Stream(IonText_3.escape(value, IonText_6.StringEscapes)));
                this.writeable.writeByte(IonText_1.CharCodes.DOUBLE_QUOTE);
            });
        }
        writeStruct(annotations, isNull) {
            this.writeContainer(IonBinary_1.TypeCodes.STRUCT, IonText_1.CharCodes.LEFT_BRACE, annotations, isNull);
            this.state = State.STRUCT_FIELD;
        }
        writeSymbol(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.SYMBOL, value, annotations, (value) => {
                this.writeSymbolToken(value);
            });
        }
        writeTimestamp(value, annotations) {
            this.writeValue(IonBinary_1.TypeCodes.TIMESTAMP, value, annotations, (value) => {
                this.writeUtf8(value.toString());
            });
        }
        endContainer() {
            if (this.isTopLevel) {
                throw new Error("Can't step out when not in a container");
            }
            else if (this.state === State.STRUCT_VALUE) {
                throw new Error("Expecting a struct value");
            }
            let container = this.containers.pop();
            switch (container) {
                case IonBinary_1.TypeCodes.LIST:
                    this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACKET);
                    break;
                case IonBinary_1.TypeCodes.SEXP:
                    this.writeable.writeByte(IonText_1.CharCodes.RIGHT_PARENTHESIS);
                    break;
                case IonBinary_1.TypeCodes.STRUCT:
                    this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACE);
                    break;
            }
            if (!this.isTopLevel) {
                if (this.currentContainer === IonBinary_1.TypeCodes.STRUCT) {
                    this.state = State.STRUCT_FIELD;
                }
                this.isFirstValueInContainer = false;
            }
        }
        close() {
            while (!this.isTopLevel) {
                this.endContainer();
            }
        }
        writeValue(typeCode, value, annotations, serialize) {
            if (this.state === State.STRUCT_FIELD) {
                throw new Error("Expecting a struct field");
            }
            if (IonUtilities_1.isNullOrUndefined(value)) {
                this.writeNull(typeCode, annotations);
                return;
            }
            this.handleSeparator();
            this.writeAnnotations(annotations);
            serialize(value);
            if (this.state === State.STRUCT_VALUE) {
                this.state = State.STRUCT_FIELD;
            }
        }
        writeContainer(typeCode, openingCharacter, annotations, isNull) {
            if (isNull) {
                this.writeNull(typeCode, annotations);
                return;
            }
            this.handleSeparator();
            this.writeAnnotations(annotations);
            this.writeable.writeByte(openingCharacter);
            this.stepIn(typeCode);
        }
        handleSeparator() {
            if (this.isTopLevel) {
                if (this.isFirstValue) {
                    this.isFirstValue = false;
                }
                else {
                    this.writeable.writeByte(IonText_1.CharCodes.LINE_FEED);
                }
            }
            else {
                if (this.isFirstValueInContainer) {
                    this.isFirstValueInContainer = false;
                }
                else {
                    switch (this.currentContainer) {
                        case IonBinary_1.TypeCodes.LIST:
                            this.writeable.writeByte(IonText_1.CharCodes.COMMA);
                            break;
                        case IonBinary_1.TypeCodes.SEXP:
                            this.writeable.writeByte(IonText_1.CharCodes.SPACE);
                            break;
                    }
                }
            }
        }
        writeUtf8(s) {
            this.writeable.writeBytes(IonUnicode_1.encodeUtf8(s));
        }
        writeAnnotations(annotations) {
            if (IonUtilities_1.isNullOrUndefined(annotations)) {
                return;
            }
            for (let annotation of annotations) {
                this.writeSymbolToken(annotation);
                this.writeUtf8('::');
            }
        }
        get isTopLevel() {
            return this.containers.length === 0;
        }
        get currentContainer() {
            return IonUtilities_3.last(this.containers);
        }
        stepIn(container) {
            this.containers.push(container);
            this.isFirstValueInContainer = true;
        }
        writeSymbolToken(s) {
            if (IonText_4.isIdentifier(s)) {
                this.writeUtf8(s);
            }
            else if ((!this.isTopLevel) && (this.currentContainer === IonBinary_1.TypeCodes.SEXP) && IonText_5.isOperator(s)) {
                this.writeUtf8(s);
            }
            else {
                this.writeable.writeByte(IonText_1.CharCodes.SINGLE_QUOTE);
                this.writeable.writeStream(IonUnicode_2.encodeUtf8Stream(IonText_3.escape(s, IonText_7.SymbolEscapes)));
                this.writeable.writeByte(IonText_1.CharCodes.SINGLE_QUOTE);
            }
        }
    }
    exports.TextWriter = TextWriter;
});
//# sourceMappingURL=IonTextWriter.js.map