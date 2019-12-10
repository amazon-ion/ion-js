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

// Text reader.  This is a user reader built on top of
// the IonParserTextRaw parser.
//
// Handles system symbols, and conversion from the parsed
// input string to the desired Javascript value (scalar or
// object, such as IonValue).
import {Catalog} from "./IonCatalog";
import {Decimal} from "./IonDecimal";
import {defaultLocalSymbolTable, LocalSymbolTable} from "./IonLocalSymbolTable";
import {get_ion_type, ParserTextRaw} from "./IonParserTextRaw";
import {ion_symbol_table, makeSymbolTable} from "./IonSymbols";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {Reader} from "./IonReader";
import {StringSpan} from "./IonSpan";
import {Timestamp} from "./IonTimestamp";
import {fromBase64} from "./IonText";
import JSBI from "jsbi";
import {JsbiSupport} from "./JsbiSupport";
import IntSize from "./IntSize";

const BEGINNING_OF_CONTAINER = -2; // cloned from IonParserTextRaw
const EOF = -1;
const T_IDENTIFIER = 9;
const T_STRING1 = 11;
const T_CLOB2 = 14;
const T_CLOB3 = 15;
const T_STRUCT = 19;

export class TextReader implements Reader {
    private readonly _parser: ParserTextRaw;
    private _depth: number;
    private readonly _cat: Catalog;
    private _symtab: LocalSymbolTable;
    private _type: IonType | null;
    private _raw_type: number | undefined;
    private _raw: any | undefined;

    constructor(source: StringSpan, catalog?: Catalog) {
        if (!source) {
            throw new Error("a source Span is required to make a reader");
        }

        this._parser   = new ParserTextRaw(source);
        this._depth    = 0;
        this._cat      = catalog ? catalog : new Catalog();
        this._symtab   = defaultLocalSymbolTable();
        this._type     = null;
        this._raw_type = undefined;
        this._raw      = undefined;
    }

    load_raw() {
        let t: TextReader = this;
        if (t._raw !== undefined) return;
        if (t._raw_type === T_CLOB2 || t._raw_type === T_CLOB3) {
            t._raw = t._parser.get_value_as_uint8array(t._raw_type);
        } else {
            t._raw = t._parser.get_value_as_string(t._raw_type!);
        }
    }

    skip_past_container() {
        let type;
        let d = this.depth();  // we want to have read the EOC that matches the container we just saw
        this.stepIn();
        while (this.depth() > d) {
            type = this.next();
            if (type === null) { // end of container
                this.stepOut();
            } else if (type.isContainer && !this.isNull()) {
                this.stepIn();
            }
        }
    }

    isIVM(input: string, depth: number, annotations: string[]): boolean {
        if (depth > 0) return false;
        const ivm = "$ion_1_0";
        const prefix = "$ion_";
        if (input.length < ivm.length || annotations.length > 0) return false;

        let i = 0;

        while (i < prefix.length) {
            if (prefix.charAt(i) !== input.charAt(i)) return false;
            i++;
        }

        while (i < input.length && input.charAt(i) != '_') {
            let ch = input.charAt(i);
            if (ch < '0' || ch > '9') return false;
            i++;
        }
        i++;

        while (i < input.length) {
            let ch = input.charAt(i);
            if (ch < '0' || ch > '9') return false;
            i++;
        }
        if (input !== ivm) throw new Error("Only Ion version 1.0 is supported.");
        return true;
    }

    isLikeIVM(): boolean {
        return false;
    }

    next() {
        this._raw = undefined;
        if (this._raw_type === EOF) return null;

        if (this._raw_type !== BEGINNING_OF_CONTAINER
                && !this.isNull()
                && this._type
                && this._type.isContainer) {
            this.skip_past_container();
        }

        let p: ParserTextRaw = this._parser;
        for (; ;) {
            this._raw_type = p.next();
            if (this._raw_type === T_IDENTIFIER) {
                if (this._depth > 0) break;
                this.load_raw();
                if (!this.isIVM(this._raw, this.depth(), this.annotations())) break;
                this._symtab = defaultLocalSymbolTable();
                this._raw = undefined;
                this._raw_type = undefined;
            } else if (this._raw_type === T_STRING1) {
                if (this._depth > 0) break;
                this.load_raw();
                if (this._raw !== "$ion_1_0") break;
                this._raw = undefined;
                this._raw_type = undefined;
            } else if (this._raw_type === T_STRUCT) {
                if (p.annotations().length !== 1) break;
                if (p.annotations()[0] != ion_symbol_table) break;
                this._type = get_ion_type(this._raw_type);
                this._symtab = makeSymbolTable(this._cat, this);
                this._raw = undefined;
                this._raw_type = undefined;
            } else {
                break;
            }
        }

        // for system value (IVM's and symbol table's) we continue
        // around this
        this._type = get_ion_type(this._raw_type!);
        return this._type;
    }

    stepIn() {
        if (!this._type!.isContainer) {
            throw new Error("can't step in to a scalar value");
        }
        if (this.isNull()) {
            throw new Error("Can't step into a null container");
        }
        this._parser.clearFieldName();
        this._type = null;
        this._raw_type = BEGINNING_OF_CONTAINER;
        this._depth++;
    }

    stepOut() {
        this._parser.clearFieldName();
        while (this._raw_type != EOF) {
            this.next();
        }
        this._raw_type = undefined;
        if (this._depth <= 0) {
            throw new Error('Cannot stepOut any further, already at top level');
        }
        this._depth--;
    }

    type(): IonType | null {
        return this._type;
    }

    depth(): number {
        return this._depth;
    }

    fieldName(): string | null {
        let str = this._parser.fieldName();
        if (str !== null) {
            let raw_type = this._parser.fieldNameType();
            if (raw_type === T_IDENTIFIER && (str.length > 1 && str[0] === '$')) {
                let tempStr = str.substr(1, str.length);
                if (+tempStr === +tempStr) {//look up sid, +str === +str is a one line is integer hack
                    let symbol = this._symtab.getSymbolText(Number(tempStr));
                    if (symbol === undefined) throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
                    return symbol;
                }
            }
        }
        return str;
    }

    annotations(): string[] {
        let ann : string[] = [];
        for (let str of this._parser.annotations()) {
            ann.push(str);
        }
        for (let i = 0; i < ann.length; i++) {
            if(ann[i].length > 1 && ann[i][0] === '$') {
                let tempStr = ann[i].substr(1, ann[i].length);
                if (+tempStr === +tempStr) {//look up sid, +str === +str is a one line is integer hack
                    let symbol = this._symtab.getSymbolText(Number(tempStr));
                    if(symbol === undefined || symbol === null) throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
                    ann[i] = symbol;
                }
            }
        }
        return ann;
    }

    isNull(): boolean {
        if (this._type === IonTypes.NULL) return true;
        return this._parser.isNull();
    }

    _stringRepresentation(): string | null {
        this.load_raw();
        if (this.isNull()) return (this._type === IonTypes.NULL) ? "null" : "null." + this._type!.name;
        return this._raw;
    }

    booleanValue(): boolean | null {
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.BOOL:
                return this._parser.booleanValue();
        }
        throw new Error('Current value is not a Boolean.')
    }

    byteValue(): Uint8Array | null {
        this.load_raw();
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.BLOB:
                if (this.isNull()) {
                    return null;
                }
                return fromBase64(this._raw);
            case IonTypes.CLOB:
                if (this.isNull()) {
                    return null;
                }
                return this._raw;
        }
        throw new Error('Current value is not a blob or clob.');
    }

    decimalValue(): Decimal | null {
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.DECIMAL:
                return Decimal.parse(this._stringRepresentation()!);
        }
        throw new Error('Current value is not a decimal.')
    }

    bigIntValue(): JSBI | null {
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.INT:
                return this._parser.bigIntValue();
        }
        throw new Error('bigIntValue() was called when the current value was a(n) ' + this._type!.name);
    }

    intSize(): IntSize {
        if (JsbiSupport.isSafeInteger(this.bigIntValue()!)) {
            return IntSize.Number;
        }
        return IntSize.BigInt;
    }

    numberValue(): number | null {
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.FLOAT:
            case IonTypes.INT:
                return this._parser.numberValue();
        }
        throw new Error('Current value is not a float or int.');
    }

    stringValue(): string | null {
        this.load_raw();
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.STRING:
                if (this._parser.isNull()) {
                    return null;
                }
                return this._raw;
            case IonTypes.SYMBOL:
                if (this._parser.isNull()) {
                    return null;
                }
                if (this._raw_type === T_IDENTIFIER && (this._raw.length > 1 && this._raw.charAt(0) === '$'.charAt(0))) {
                    let tempStr = this._raw.substr(1, this._raw.length);
                    if (+tempStr === +tempStr) {//look up sid, +str === +str is a one line is integer hack
                        let symbolId = Number(tempStr);
                        let symbol = this._symtab.getSymbolText(symbolId);
                        if (symbol === undefined) throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
                        return symbol;
                    }
                }
                return this._raw;
        }
        throw new Error('Current value is not a string or symbol.');
    }

    timestampValue(): Timestamp | null {
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.TIMESTAMP:
                return Timestamp.parse(this._stringRepresentation()!);
        }
        throw new Error('Current value is not a timestamp.')
    }

    value(): any {
        if (this._type && this._type.isContainer) {
            if (this.isNull()) {
                return null;
            }
            throw new Error('Unable to provide a value for ' + this._type.name + ' containers.');
        }
        switch (this._type) {
            case IonTypes.NULL:
                return null;
            case IonTypes.BLOB:
            case IonTypes.CLOB:
                return this.byteValue();
            case IonTypes.BOOL:
                return this.booleanValue();
            case IonTypes.DECIMAL:
                return this.decimalValue();
            case IonTypes.INT:
                return this.bigIntValue();
            case IonTypes.FLOAT:
                return this.numberValue();
            case IonTypes.STRING:
            case IonTypes.SYMBOL:
                return this.stringValue();
            case IonTypes.TIMESTAMP:
                return this.timestampValue();
            default:
                throw new Error('There is no current value.');
        }
    }
}
