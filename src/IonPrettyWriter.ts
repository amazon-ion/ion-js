
import {State, TextWriter} from "./IonTextWriter";
import {Writeable} from "./IonWriteable";
import {TypeCodes} from "./IonBinary";
import {CharCodes} from "./IonText";
import {isNullOrUndefined} from "./IonUtilities";
type Serializer<T> = (value: T) => void;
/*
 * This class and functionality carry no guarantees of correctness or support.
 * Do not rely on this functionality for more than front end formatting.
 */
export class PrettyWriter extends TextWriter {
    private indentCount : number = 0;
    constructor(writeable: Writeable, private readonly indentSize : number = 2) { super(writeable);}

    private writePrettyValue() : void {
        if(!this.isTopLevel && this.currentContainer.containerType && this.currentContainer.containerType !== TypeCodes.STRUCT){
            this.writePrettyIndent(0);
        }
    }
    private writePrettyNewLine(incrementValue: number) : void {
        this.indentCount = this.indentCount + incrementValue;
        if(this.indentSize && this.indentSize > 0){
            this.writeable.writeByte(CharCodes.LINE_FEED);
        }
    }
    private writePrettyIndent(incrementValue: number) : void {
        this.indentCount = this.indentCount + incrementValue;
        if(this.indentSize && this.indentSize > 0){
            for(var i = 0; i < (this.indentCount*this.indentSize); i++ ){
                this.writeable.writeByte(CharCodes.SPACE);
            }
        }
    }

    writeFieldName(fieldName: string) : void {
        if (this.currentContainer.containerType !== TypeCodes.STRUCT) {
            throw new Error("Cannot write field name outside of a struct");
        }
        if (this.currentContainer.state !== State.STRUCT_FIELD) {
            throw new Error("Expecting a struct value");
        }

        if (!this.currentContainer.clean) {
            this.writeable.writeByte(CharCodes.COMMA);
            this.writePrettyNewLine(0);
        }

        this.writePrettyIndent(0);
        this.writeSymbolToken(fieldName);
        this.writeable.writeByte(CharCodes.COLON);

        this.currentContainer.state = State.VALUE;
    }

    writeNull(type_: TypeCodes, annotations?: string[]) : void {
        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        let s: string;
        switch (type_) {
            case TypeCodes.NULL:
                s = "null";
                break;
            case TypeCodes.BOOL:
                s = "bool";
                break;
            case TypeCodes.POSITIVE_INT:
            case TypeCodes.NEGATIVE_INT:
                s = "int";
                break;
            case TypeCodes.FLOAT:
                s = "float";
                break;
            case TypeCodes.DECIMAL:
                s = "decimal";
                break;
            case TypeCodes.TIMESTAMP:
                s = "timestamp";
                break;
            case TypeCodes.SYMBOL:
                s = "symbol";
                break;
            case TypeCodes.STRING:
                s = "string";
                break;
            case TypeCodes.CLOB:
                s = "clob";
                break;
            case TypeCodes.BLOB:
                s = "blob";
                break;
            case TypeCodes.LIST:
                s = "list";
                break;
            case TypeCodes.SEXP:
                s = "sexp";
                break;
            case TypeCodes.STRUCT:
                s = "struct";
                break;
            default:
                throw new Error(`Cannot write null for type ${type_}`);
        }
        this.writeUtf8("null." + s);
        if (this.currentContainer.containerType === TypeCodes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    endContainer() : void {
        let currentContainer = this.containerContext.pop();
        if (!currentContainer || !currentContainer.containerType) {
            throw new Error("Can't step out when not in a container");
        } else if (currentContainer.containerType === TypeCodes.STRUCT && currentContainer.state === State.VALUE) {
            throw new Error("Expecting a struct value");
        }

        if (!currentContainer.clean) {
            this.writePrettyNewLine(0);
        }
        this.writePrettyIndent(-1);
        switch (currentContainer.containerType) {
            case TypeCodes.LIST:
                this.writeable.writeByte(CharCodes.RIGHT_BRACKET);
                break;
            case TypeCodes.SEXP:
                this.writeable.writeByte(CharCodes.RIGHT_PARENTHESIS);
                break;
            case TypeCodes.STRUCT:
                this.writeable.writeByte(CharCodes.RIGHT_BRACE);
                break;
            default :
                throw new Error("Unexpected container TypeCode");
        }
    }

    writeValue<T>(typeCode: TypeCodes, value: T, annotations: string[], serialize: Serializer<T>) {
        if (this.currentContainer.state === State.STRUCT_FIELD) throw new Error("Expecting a struct field");
        if (isNullOrUndefined(value)) {
            this.writeNull(typeCode, annotations);
            return;
        }

        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        serialize(value);
        if (this.currentContainer.containerType === TypeCodes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    writeContainer(typeCode: TypeCodes, openingCharacter: number, annotations?: string[], isNull?: boolean) : void {
        if (isNull) {
            this.writeNull(typeCode, annotations);
            return;
        }
        if(this.currentContainer.containerType === TypeCodes.STRUCT && this.currentContainer.state === State.VALUE){
            this.currentContainer.state = State.STRUCT_FIELD;
        }
        this.handleSeparator();
        this.writePrettyValue();
        this.writeAnnotations(annotations);
        this.writeable.writeByte(openingCharacter);
        this.writePrettyNewLine(1);
        this.stepIn(typeCode);
    }

    handleSeparator() : void {
        if (this.isTopLevel) {
            if (this.currentContainer.clean) {
                this.currentContainer.clean = false;
            } else {
                this.writeable.writeByte(CharCodes.LINE_FEED);
            }
        } else {
            if (this.currentContainer.clean) {
                this.currentContainer.clean = false;
            } else {
                switch (this.currentContainer.containerType) {
                    case TypeCodes.LIST:
                        this.writeable.writeByte(CharCodes.COMMA);
                        this.writePrettyNewLine(0);
                        break;
                    case TypeCodes.SEXP:
                        this.writeable.writeByte(CharCodes.SPACE);
                        this.writePrettyNewLine(0);
                        break;
                    default:
                    //no op
                }
            }
        }
    }
}