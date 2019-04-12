/*
* Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Decimal } from "./IonDecimal";
import { encodeUtf8 } from "./IonUnicode";
import { escape, toBase64, StringEscapes, SymbolEscapes, isIdentifier, isOperator, CharCodes, ClobEscapes } from "./IonText";
import { Timestamp } from "./IonTimestamp";
import { TypeCodes } from "./IonBinary";
import { Writeable } from "./IonWriteable";
import { Writer } from "./IonWriter";

type Serializer<T> = (value: T) => void;

export enum State {
    VALUE,
    STRUCT_FIELD,
}

export class Context {
    state : State;
    clean : boolean;
    containerType : TypeCodes;

    constructor(myType : TypeCodes) {
        this.state = myType === TypeCodes.STRUCT ? State.STRUCT_FIELD : State.VALUE;
        this.clean = true;
        this.containerType = myType;
    }
}

export class TextWriter implements Writer {

    private containerContext : Context[];

    getBytes(): Uint8Array {
        return this.writeable.getBytes();
    }

    constructor(protected readonly writeable: Writeable) {
        this.containerContext = [new Context(undefined)];
    }

    writeBlob(value: Uint8Array, annotations?: string[]) : void {
        this.writeValue(TypeCodes.BLOB, value, annotations, (value: Uint8Array) => {
            this.writeable.writeBytes(encodeUtf8('{{' + toBase64(value) + '}}'));
        });
    }

    writeBoolean(value: boolean, annotations?: string[]) : void {
        this.writeValue(TypeCodes.BOOL, value, annotations, (value: boolean) => {
            this.writeUtf8(value ? "true" : "false");
        });
    }

    writeClob(value: Uint8Array, annotations?: string[]) : void {
        this.writeValue(TypeCodes.CLOB, value, annotations, (value: Uint8Array) => {
            let hexStr : string;
            this.writeUtf8('{{"');
            for (let i : number = 0; i < value.length; i++) {
                let c : number = value[i];
                if (c > 127 && c < 256) {
                    hexStr = "\\x" + c.toString(16);
                    for(let j = 0; j < hexStr.length; j++){
                        this.writeable.writeByte(hexStr.charCodeAt(j));
                    }
                } else {
                    let escape: number[] = ClobEscapes[c];
                    if (escape === undefined) {
                        if(c < 32){
                            hexStr = "\\x" + c.toString(16);
                            for(let j = 0; j < hexStr.length; j++){
                                this.writeable.writeByte(hexStr.charCodeAt(j));
                            }
                        }else {
                            this.writeable.writeByte(c);
                        }
                    } else {
                        this.writeable.writeBytes(new Uint8Array(escape));
                    }
                }
            }
            this.writeUtf8('"}}');
        });
    }

    writeDecimal(value: Decimal, annotations?: string[]) : void {
        this.writeValue(TypeCodes.DECIMAL, value, annotations, (value: Decimal) => {
            this.writeUtf8(value.toString());
        });
    }


    /*
    Another way to handle this is simply to store the field name here, and actually write it in writeValue.
    This is how the other implementations I know of handle it.
    This allows you to move the comma-writing logic into handleSeparator, and might even enable you to get rid of currentContainer.state altogether.
    I can't think of a reason why it HAS to be done that way right now, but if that feels cleaner to you, then consider it.
     */
    writeFieldName(fieldName: string) : void {
        if (this.currentContainer.containerType !== TypeCodes.STRUCT) {
            throw new Error("Cannot write field name outside of a struct");
        }
        if (this.currentContainer.state !== State.STRUCT_FIELD) {
            throw new Error("Expecting a struct value");
        }

        if (!this.currentContainer.clean) {
            this.writeable.writeByte(CharCodes.COMMA);
        }

        this.writeSymbolToken(fieldName);
        this.writeable.writeByte(CharCodes.COLON);

        this.currentContainer.state = State.VALUE;
    }

    writeFloat32(value: number, annotations?: string[]) : void {
        var tempVal : any = value;
        if(value === Number.POSITIVE_INFINITY){
            tempVal = "+inf";
        } else if(value === Number.NEGATIVE_INFINITY){
            tempVal = "-inf";
        } else if(isNaN(value)){
            tempVal = "nan";
        } else if (tempVal !== null && tempVal !== undefined){
            tempVal = tempVal.toExponential();
            if (tempVal.charAt(tempVal.length - 2) === '+') {
                tempVal = tempVal.slice(0, tempVal.length - 2) + tempVal.charAt(tempVal.length - 1);
            }
        }
        this.writeValue(TypeCodes.FLOAT, value, annotations, (value: number) => {
            this.writeUtf8(tempVal);
        });
    }

    writeFloat64(value: number, annotations?: string[]) : void {
        var tempVal : any = value;
        if(value === Number.POSITIVE_INFINITY){
            tempVal = "+inf";
        } else if(value === Number.NEGATIVE_INFINITY){
            tempVal = "-inf";
        } else if(value === Number.NaN){
            tempVal = "nan";
        } else if(tempVal !== null && tempVal !== undefined) {
            tempVal = tempVal.toExponential();
            if (tempVal.charAt(tempVal.length - 2) === '+') {
                tempVal = tempVal.slice(0, tempVal.length - 2) + tempVal.charAt(tempVal.length - 1);
            }
        }
        this.writeValue(TypeCodes.FLOAT, value, annotations, (value: number) => {
            this.writeUtf8(tempVal);
        });
    }

    writeInt(value: number, annotations?: string[]) : void {
        let typeCode : TypeCodes = value >= 0 ? TypeCodes.POSITIVE_INT : TypeCodes.NEGATIVE_INT;
        this.writeValue(typeCode, value, annotations, (value: number) => {
            this.writeUtf8(value.toString(10));
        });
    }

    writeList(annotations?: string[], isNull?: boolean) : void {
        this.writeContainer(TypeCodes.LIST, CharCodes.LEFT_BRACKET, annotations, isNull);
    }

    writeNull(type_: TypeCodes, annotations?: string[]) : void {
        this.handleSeparator();
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

    writeSexp(annotations?: string[], isNull?: boolean) : void {
        this.writeContainer(TypeCodes.SEXP, CharCodes.LEFT_PARENTHESIS, annotations, isNull);
    }

    writeString(value: string, annotations?: string[]) : void {
        this.writeValue(TypeCodes.STRING, value, annotations, (value: string) => {
            this.writeable.writeBytes(encodeUtf8('"' + escape(value, StringEscapes) + '"'));
        });
    }

    writeStruct(annotations?: string[], isNull?: boolean) : void {
        if(annotations !== undefined && annotations[0] === '$ion_symbol_table' && this.depth() === 0) throw new Error("Unable to alter symbol table context, it allows invalid ion to be written.");
        this.writeContainer(TypeCodes.STRUCT, CharCodes.LEFT_BRACE, annotations, isNull);
    }

    writeSymbol(value: string, annotations?: string[]) : void {
        this.writeValue(TypeCodes.SYMBOL, value, annotations, (value: string) => {
            this.writeSymbolToken(value);
        });
    }

    writeTimestamp(value: Timestamp, annotations?: string[]) : void {
        this.writeValue(TypeCodes.TIMESTAMP, value, annotations, (value: Timestamp) => {
            this.writeUtf8(value.toString());
        });
    }

    endContainer() : void {
        let currentContainer = this.containerContext.pop();
        if (!currentContainer || !currentContainer.containerType) {
            throw new Error("Can't step out when not in a container");
        } else if (currentContainer.containerType === TypeCodes.STRUCT && currentContainer.state === State.VALUE) {
            throw new Error("Expecting a struct value");
        }
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

    close() : void {//TODO clear out resources when writer uses more than a basic array/devs have built in IO support etc.
        if(!this.isTopLevel) {
            throw new Error("Writer was not at the top level, call closeContainer in the future.");
        }
    }

    protected writeValue<T>(typeCode: TypeCodes, value: T, annotations: string[], serialize: Serializer<T>) {
        if (this.currentContainer.state === State.STRUCT_FIELD) throw new Error("Expecting a struct field");
        if (value === null || value === undefined) {
            this.writeNull(typeCode, annotations);
            return;
        }
        this.handleSeparator();
        this.writeAnnotations(annotations);
        serialize(value);
        if (this.currentContainer.containerType === TypeCodes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    protected writeContainer(typeCode: TypeCodes, openingCharacter: number, annotations?: string[], isNull?: boolean) : void {
        if (isNull) {
            this.writeNull(typeCode, annotations);
            return;
        }
        if(this.currentContainer.containerType === TypeCodes.STRUCT && this.currentContainer.state === State.VALUE){
            this.currentContainer.state = State.STRUCT_FIELD;
        }
        this.handleSeparator();
        this.writeAnnotations(annotations);
        this.writeable.writeByte(openingCharacter);
        this.stepIn(typeCode);
    }

    protected handleSeparator() : void {
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
                        break;
                    case TypeCodes.SEXP:
                        this.writeable.writeByte(CharCodes.SPACE);
                        break;
                    default:
                        //no op
                }
            }
        }
    }


    private writeUtf8(s: string) : void {
            this.writeable.writeBytes(encodeUtf8(s));
    }

    private writeAnnotations(annotations: string[]) : void {
        if (annotations === null || annotations === undefined) return;
        for (let annotation of annotations) {
            this.writeSymbolToken(annotation);
            this.writeUtf8('::');
        }
    }

    get isTopLevel() : boolean {
        return this.depth() === 0;
    }

    protected get currentContainer() : Context {
        return this.containerContext[this.depth()];
    }

    private depth() : number {
        return this.containerContext.length - 1;
    }

    protected stepIn(container: TypeCodes) : void {
        this.containerContext.push(new Context(container));
    }

    protected writeSymbolToken(s: string) : void {
        if (isIdentifier(s)) {
            if(s.length > 1 && s.charAt(0) === '$'.charAt(0)){
                let tempStr = s.substr(1, s.length);
                if (+tempStr === +tempStr) {//+str === +str is a one line is integer hack
                    this.writeable.writeBytes(encodeUtf8("'" + escape(s, SymbolEscapes) + "'"));
                } else {
                    this.writeUtf8(s);
                }
            } else {
                this.writeUtf8(s);
            }
        } else if ((!this.isTopLevel) && (this.currentContainer.containerType === TypeCodes.SEXP) && isOperator(s)) {
            this.writeUtf8(s);
        } else {
            this.writeable.writeBytes(encodeUtf8("'" + escape(s, SymbolEscapes) + "'"));
        }
    }
}
