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
import {
    CharCodes,
    ClobEscapes,
    escape,
    is_keyword,
    isIdentifier,
    isOperator,
    StringEscapes,
    SymbolEscapes,
    toBase64
} from "./IonText";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {Timestamp} from "./IonTimestamp";
import {Writeable} from "./IonWriteable";
import {_assertDefined, _sign} from "./util";
import {JsbiSupport} from "./JsbiSupport";
import JSBI from "jsbi";

type Serializer<T> = (value: T) => void;

export enum State {
    VALUE,
    STRUCT_FIELD,
}

export class Context {
    state: State;
    clean: boolean;
    containerType: IonType | null;

    constructor(myType: IonType | null) {
        this.state = myType === IonTypes.STRUCT ? State.STRUCT_FIELD : State.VALUE;
        this.clean = true;
        this.containerType = myType;
    }
}

export class TextWriter extends AbstractWriter {

    protected containerContext: Context[];

    constructor(protected readonly writeable: Writeable) {
        super();
        this.containerContext = [new Context(null)];
    }

    get isTopLevel(): boolean {
        return this.depth() === 0;
    }

    protected get currentContainer(): Context {
        return this.containerContext[this.depth()];
    }

    /**
     * Converts the provided numeric value into Ion text and writes it to the specified TextWriter.
     *
     * @param writer - The TextWriter to which the value should be written.
     * @param value - A numeric value to write as an Ion float.
     */
    private static _serializeFloat(writer: TextWriter, value: number): void {
        let text: string;
        if (value === Number.POSITIVE_INFINITY) {
            text = "+inf";
        } else if (value === Number.NEGATIVE_INFINITY) {
            text = "-inf";
        } else if (Object.is(value, Number.NaN)) {
            text = "nan";
        } else if (Object.is(value, -0)) {
            // Generally, we use Number#toExponential to convert the number `value` to Ion text.
            // However, that function does not preserve sign information if the input value is -0.
            // As such, we've broken the handling for -0 out into a special case.
            // `Object.is` is used in our if-statement condition to detect -0 because
            // `0 === -0` evaluates to `true`.
            text = "-0e0";
        } else {
            text = value.toExponential();
            // If present, removes '+' character from the serialized exponent.
            // The '+' is legal Ion, but is superfluous.
            const plusSignIndex = text.lastIndexOf('+');
            if (plusSignIndex > -1) {
                text = text.slice(0, plusSignIndex) + text.slice(plusSignIndex + 1);
            }
        }

        writer.writeUtf8(text);
    }

    getBytes(): Uint8Array {
        return this.writeable.getBytes();
    }

    writeBlob(value: Uint8Array): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.BLOB, value, (value: Uint8Array) => {
            this.writeable.writeBytes(encodeUtf8('{{' + toBase64(value) + '}}'));
        });
    }

    writeBoolean(value: boolean): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.BOOL, value, (value: boolean) => {
            this.writeUtf8(value ? "true" : "false");
        });
    }

    writeClob(value: Uint8Array): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.CLOB, value, (value: Uint8Array) => {
            let hexStr: string;
            this.writeUtf8('{{"');
            for (let i: number = 0; i < value.length; i++) {
                const c: number = value[i];
                if (c > 127 && c < 256) {
                    hexStr = "\\x" + c.toString(16);
                    for (let j = 0; j < hexStr.length; j++) {
                        this.writeable.writeByte(hexStr.charCodeAt(j));
                    }
                } else {
                    const escape: number[] = ClobEscapes[c];
                    if (escape === undefined) {
                        if (c < 32) {
                            hexStr = "\\x" + c.toString(16);
                            for (let j = 0; j < hexStr.length; j++) {
                                this.writeable.writeByte(hexStr.charCodeAt(j));
                            }
                        } else {
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

    writeDecimal(value: Decimal): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.DECIMAL, value, (value: Decimal) => {
            let s = '';

            let coefficient = value.getCoefficient();
            if (JSBI.lessThan(coefficient, JsbiSupport.ZERO)) {
                coefficient = JSBI.unaryMinus(coefficient);
            }
            if (value.isNegative()) {
                s += '-';
            }

            const exponent = value.getExponent();
            const scale = -exponent;

            if (exponent == 0) {
                s += coefficient + '.';

            } else if (exponent < 0) {
                // Avoid printing small negative exponents using a heuristic
                // adapted from http://speleotrove.com/decimal/daconvs.html

                const significantDigits = coefficient.toString().length;
                const adjustedExponent = significantDigits - 1 - scale;
                if (adjustedExponent >= 0) {
                    const wholeDigits = significantDigits - scale;
                    s += coefficient.toString().substring(0, wholeDigits);
                    s += '.';
                    s += coefficient.toString().substring(wholeDigits, significantDigits);
                } else if (adjustedExponent >= -6) {
                    s += '0.';
                    s += '00000'.substring(0, scale - significantDigits);
                    s += coefficient;
                } else {
                    s += coefficient;
                    s += 'd-';
                    s += scale.toString();
                }

            } else {  // exponent > 0
                s += coefficient + 'd' + exponent;
            }

            this.writeUtf8(s);
        });
    }

    protected _isInStruct(): boolean {
        return this.currentContainer.containerType === IonTypes.STRUCT;
    }

    /*
    Another way to handle this is simply to store the field name here, and actually write it in _serializeValue.
    This is how the other implementations I know of handle it.
    This allows you to move the comma-writing logic into handleSeparator, and might even enable you to get rid of currentContainer.state altogether.
    I can't think of a reason why it HAS to be done that way right now, but if that feels cleaner to you, then consider it.
     */
    writeFieldName(fieldName: string): void {
        _assertDefined(fieldName);
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

    writeFloat32(value: number): void {
        _assertDefined(value);
        this._writeFloat(value);
    }

    writeFloat64(value: number): void {
        _assertDefined(value);
        this._writeFloat(value);
    }

    writeInt(value: number | JSBI): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.INT, value, (value: number | JSBI) => {
            this.writeUtf8(value.toString(10));
        });
    }

    protected _writeNull(type: IonType): void {
        if (type === IonTypes.NULL) {
            this.writeUtf8("null");
        } else {
            this.writeUtf8("null." + type.name);
        }
    }

    writeNull(type: IonType): void {
        if (type === undefined || type === null) {
            type = IonTypes.NULL;
        }
        this.handleSeparator();
        this.writeAnnotations();
        this._writeNull(type);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    writeString(value: string): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.STRING, value, (value: string) => {
            this.writeable.writeBytes(encodeUtf8('"' + escape(value, StringEscapes) + '"'));
        });
    }

    writeSymbol(value: string): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.SYMBOL, value, (value: string) => {
            this.writeSymbolToken(value);
        });
    }

    writeTimestamp(value: Timestamp): void {
        _assertDefined(value);
        this._serializeValue(IonTypes.TIMESTAMP, value, (value: Timestamp) => {
            this.writeUtf8(value.toString());
        });
    }

    stepIn(type: IonType): void {
        if (this.currentContainer.state === State.STRUCT_FIELD) {
            throw new Error(`Started writing a ${this.currentContainer.containerType!.name} inside a struct"
                + " without writing the field name first. Call writeFieldName(string) with the desired name"
                + " before calling stepIn(${this.currentContainer.containerType!.name}).`);
        }
        switch (type) {
            case IonTypes.LIST:
                this.writeContainer(type, CharCodes.LEFT_BRACKET);
                break;
            case IonTypes.SEXP:
                this.writeContainer(type, CharCodes.LEFT_PARENTHESIS);
                break;
            case IonTypes.STRUCT:
                if (this._annotations !== undefined
                    && this._annotations[0] === '$ion_symbol_table' && this.depth() === 0) {
                    throw new Error("Unable to alter symbol table context, it allows invalid ion to be written.");
                }
                this.writeContainer(type, CharCodes.LEFT_BRACE);
                break;
            default :
                throw new Error("Unrecognized container type");
        }
    }

    stepOut(): void {
        const currentContainer = this.containerContext.pop();
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

    close(): void {//TODO clear out resources when writer uses more than a basic array/devs have built in IO support etc.
        if (this.depth() > 0) {
            throw new Error("Writer has one or more open containers; call stepOut() for each container prior to close()");
        }
    }

    public depth(): number {
        return this.containerContext.length - 1;
    }

    protected _serializeValue<T>(type: IonType, value: T, serialize: Serializer<T>) {
        if (this.currentContainer.state === State.STRUCT_FIELD) throw new Error("Expecting a struct field");
        if (value === null) {
            this.writeNull(type);
            return;
        }
        this.handleSeparator();
        this.writeAnnotations();
        serialize(value);
        if (this.currentContainer.containerType === IonTypes.STRUCT) this.currentContainer.state = State.STRUCT_FIELD;
    }

    protected writeContainer(type: IonType, openingCharacter: number): void {
        if (this.currentContainer.containerType === IonTypes.STRUCT && this.currentContainer.state === State.VALUE) {
            this.currentContainer.state = State.STRUCT_FIELD;
        }
        this.handleSeparator();
        this.writeAnnotations();
        this.writeable.writeByte(openingCharacter);
        this._stepIn(type);
    }

    protected handleSeparator(): void {
        if (this.depth() === 0) {
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

    protected writeUtf8(s: string): void {
        this.writeable.writeBytes(encodeUtf8(s));
    }

    protected writeAnnotations(): void {
        for (const annotation of this._annotations) {
            this.writeSymbolToken(annotation);
            this.writeUtf8('::');
        }
        this._clearAnnotations();
    }

    protected _stepIn(container: IonType): void {
        this.containerContext.push(new Context(container));
    }

    protected writeSymbolToken(s: string): void {
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

    /**
     * Ion's textual representation doesn't distinguish between 32- and 64-bit floats.
     * This method provides a common implementation of [[writeFloat32]] and [[writeFloat64]], which
     * are distinct functions to satisfy the [[Writer]] interface.
     *
     * @param value - A numeric value to write as an Ion float.
     */
    private _writeFloat(value: number): void {
        this._serializeValue(IonTypes.FLOAT, value, this._floatSerializer);
    }

    /**
     * This method provides an implementation of Serializer<number> that can be used in calls to
     * [[_writeValue]]. It maintains the expected binding to `this` even when used as a callback.
     *
     * @param value
     */
    private readonly _floatSerializer: Serializer<number> = (value: number) => {
        TextWriter._serializeFloat(this, value);
    };

    private isSid(s: string): boolean {
        if (s.length > 1 && s.charAt(0) === '$'.charAt(0)) {
            const t = s.substr(1, s.length);
            return +t === +t;          // +str === +str is a one line "is integer?" hack
        }
        return false;
    }
}
