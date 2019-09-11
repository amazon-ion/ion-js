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
import {AbstractWriter} from "./AbstractWriter";
import {Decimal} from "./IonDecimal";
import {encodeUtf8} from "./IonUnicode";
import {
    escape,
    toBase64,
    StringEscapes,
    SymbolEscapes,
    isIdentifier,
    isOperator,
    CharCodes,
    ClobEscapes,
    is_keyword
} from "./IonText";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {Reader} from "./IonReader";
import {Timestamp} from "./IonTimestamp";
import {Writeable} from "./IonWriteable";
import {_sign, _writeValues} from "./util";

type Serializer<T> = (value: T) => void;

export enum State {
    VALUE,
    STRUCT_FIELD,
}

export class Context {
    state : State;
    clean : boolean;
    containerType : IonType;

    constructor(myType : IonType) {
        this.state = myType === IonTypes.STRUCT ? State.STRUCT_FIELD : State.VALUE;
        this.clean = true;
        this.containerType = myType;
    }
}

export class TextWriter extends AbstractWriter {

    protected containerContext : Context[];

    getBytes(): Uint8Array {
        return this.writeable.getBytes();
    }

    constructor(protected readonly writeable: Writeable) {
        super();
        this.containerContext = [new Context(undefined)];
    }

    writeBlob(value: Uint8Array) : void {
        this.writeValue(IonTypes.BLOB, value, (value: Uint8Array) => {
            this.writeable.writeBytes(encodeUtf8('{{' + toBase64(value) + '}}'));
        });
    }

    writeBoolean(value: boolean) : void {
        this.writeValue(IonTypes.BOOL, value, (value: boolean) => {
            this.writeUtf8(value ? "true" : "false");
        });
    }

    writeClob(value: Uint8Array) : void {
        this.writeValue(IonTypes.CLOB, value, (value: Uint8Array) => {
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

    writeDecimal(value: Decimal) : void {
        this.writeValue(IonTypes.DECIMAL, value, (value: Decimal) => {
            if (value === null) {
                this.writeUtf8("null.decimal");
            } else {
                let s = '';
                let coefficient = value._getCoefficient();
                if (coefficient.isZero() && coefficient.signum() === -1) {
                    s += '-';
                }
                s += coefficient.toString() + 'd';

                let exponent = value._getExponent();
                if (exponent === 0 && _sign(exponent) === -1) {
                    s += '-';
                }
                s += exponent;
                this.writeUtf8(s);
            }
        });
    }


    /*
    Another way to handle this is simply to store the field name here, and actually write it in writeValue.
    This is how the other implementations I know of handle it.
    This allows you to move the comma-writing logic into handleSeparator, and might even enable you to get rid of currentContainer.state altogether.
    I can't think of a reason why it HAS to be done that way right now, but if that feels cleaner to you, then consider it.
     */
    writeFieldName(fieldName: string) : void {
        if (this.currentContainer.containerType !== IonTypes.STRUCT) {
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

    writeFloat32(value: number) : void {
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
        this.writeValue(IonTypes.FLOAT, value, (value: number) => {
            this.writeUtf8(tempVal);
        });
    }

    writeFloat64(value: number) : void {
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
        this.writeValue(IonTypes.FLOAT, value, (value: number) => {
            this.writeUtf8(tempVal);
        });
    }

    writeInt(value: number) : void {
        this.writeValue(IonTypes.INT, value, (value: number) => {
            this.writeUtf8(value.toString(10));
        });
    }

    writeNull(type: IonType) : void {
        if (type === null || type === undefined || type.binaryTypeId < 0 || type.binaryTypeId > 13) {
            throw new Error(`Cannot write null for type ${type}`);
        }
        this.handleSeparator();
        this.writeAnnotations();
        this.writeUtf8("null." + type.name);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    writeString(value: string) : void {
        this.writeValue(IonTypes.STRING, value, (value: string) => {
            this.writeable.writeBytes(encodeUtf8('"' + escape(value, StringEscapes) + '"'));
        });
    }

    writeSymbol(value: string) : void {
        this.writeValue(IonTypes.SYMBOL, value, (value: string) => {
            this.writeSymbolToken(value);
        });
    }

    writeTimestamp(value: Timestamp) : void {
        this.writeValue(IonTypes.TIMESTAMP, value, (value: Timestamp) => {
            this.writeUtf8(value.toString());
        });
    }

    stepIn(type: IonType) : void {
        switch (type) {
            case IonTypes.LIST:
                this.writeContainer(type, CharCodes.LEFT_BRACKET);
                break;
            case IonTypes.SEXP:
                this.writeContainer(type, CharCodes.LEFT_PARENTHESIS);
                break;
            case IonTypes.STRUCT:
                if(this._annotations !== undefined
                        && this._annotations[0] === '$ion_symbol_table' && this.depth() === 0) {
                    throw new Error("Unable to alter symbol table context, it allows invalid ion to be written.");
                }
                this.writeContainer(type, CharCodes.LEFT_BRACE);
                break;
            default :
                throw new Error("Unrecognized container type");
        }
    }

    stepOut() : void {
        let currentContainer = this.containerContext.pop();
        if (!currentContainer || !currentContainer.containerType) {
            throw new Error("Can't step out when not in a container");
        } else if (currentContainer.containerType === IonTypes.STRUCT && currentContainer.state === State.VALUE) {
            throw new Error("Expecting a struct value");
        }
        switch (currentContainer.containerType) {
            case IonTypes.LIST:
                this.writeable.writeByte(CharCodes.RIGHT_BRACKET);
                break;
            case IonTypes.SEXP:
                this.writeable.writeByte(CharCodes.RIGHT_PARENTHESIS);
                break;
            case IonTypes.STRUCT:
                this.writeable.writeByte(CharCodes.RIGHT_BRACE);
                break;
            default :
                throw new Error("Unexpected container TypeCode");
        }
    }

    close() : void {//TODO clear out resources when writer uses more than a basic array/devs have built in IO support etc.
        if(!this.isTopLevel) {
            throw new Error("Writer has one or more open containers; call stepOut() for each container prior to close()");
        }
    }

    protected writeValue<T>(type: IonType, value: T, serialize: Serializer<T>) {
        if (this.currentContainer.state === State.STRUCT_FIELD) throw new Error("Expecting a struct field");
        if (value === null || value === undefined) {
            this.writeNull(type);
            return;
        }
        this.handleSeparator();
        this.writeAnnotations();
        serialize(value);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    protected writeContainer(type: IonType, openingCharacter: number) : void {
        if(this.currentContainer.containerType === IonTypes.STRUCT && this.currentContainer.state === State.VALUE){
            this.currentContainer.state = State.STRUCT_FIELD;
        }
        this.handleSeparator();
        this.writeAnnotations();
        this.writeable.writeByte(openingCharacter);
        this._stepIn(type);
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
                    case IonTypes.LIST:
                        this.writeable.writeByte(CharCodes.COMMA);
                        break;
                    case IonTypes.SEXP:
                        this.writeable.writeByte(CharCodes.SPACE);
                        break;
                    default:
                        //no op
                }
            }
        }
    }


    protected writeUtf8(s: string) : void {
            this.writeable.writeBytes(encodeUtf8(s));
    }

    protected writeAnnotations() : void {
        if (this._annotations === null || this._annotations === undefined) return;
        for (let annotation of this._annotations) {
            this.writeSymbolToken(annotation);
            this.writeUtf8('::');
        }
        this._clearAnnotations();
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

    protected _stepIn(container: IonType) : void {
        this.containerContext.push(new Context(container));
    }

    private isSid(s: string) : boolean {
        if (s.length > 1 && s.charAt(0) === '$'.charAt(0)) {
            let t = s.substr(1, s.length);
            return +t === +t;          // +str === +str is a one line "is integer?" hack
        }
        return false;
    }

    protected writeSymbolToken(s: string) : void {
        if (s.length === 0
                || is_keyword(s)
                || this.isSid(s)
                || (!isIdentifier(s) && !isOperator(s))
                || (isOperator(s) && this.currentContainer.containerType != IonTypes.SEXP)) {
            this.writeable.writeBytes(encodeUtf8("'" + escape(s, SymbolEscapes) + "'"));
        } else {
            this.writeUtf8(s);
        }
    }

    writeValues(reader: Reader): void {
        _writeValues(reader, this);
    }
}
