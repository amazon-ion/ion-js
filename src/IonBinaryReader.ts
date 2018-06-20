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

// Binary reader.  This is a user reader built on top of
// the IonParserBinaryRaw parser.
//
// Handles system symbols, and conversion from the parsed
// input byte array  to the desired Javascript value (scalar or
// object, such as IonValue).
import { Catalog } from "./IonCatalog";
import { Decimal } from "./IonDecimal";
import { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
import { getSystemSymbolTable } from "./IonSystemSymbolTable";
import { Import } from "./IonImport";
import { ion_symbol_table_sid } from "./IonSymbols";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IVM } from "./IonConstants";
import { LocalSymbolTable } from "./IonLocalSymbolTable";
import { makeSymbolTable } from "./IonSymbols";
import { ParserBinaryRaw } from "./IonParserBinaryRaw";
import { Reader } from "./IonReader";
import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { Span } from "./IonSpan";
import { Timestamp } from "./IonTimestamp";

const RAW_STRING = new IonType( -1, "raw_input", true,  false, false, false );

const ERROR            = -3;
const BOC              = -2;
const EOF              = -1;
const TB_NULL          =  0;
const TB_BOOL          =  1;
const TB_INT           =  2;
const TB_NEG_INT       =  3;
const TB_FLOAT         =  4;
const TB_DECIMAL       =  5;
const TB_TIMESTAMP     =  6;
const TB_SYMBOL        =  7;
const TB_STRING        =  8;
const TB_CLOB          =  9;
const TB_BLOB          = 10;
const TB_SEXP          = 11;
const TB_LIST          = 12;
const TB_STRUCT        = 13;
const TB_ANNOTATION    = 14;
const TB_UNUSED__      = 15;
const TB_DATAGRAM      = 20;   // fake type of the top level
const TB_SEXP_CLOSE    = 21;
const TB_LIST_CLOSE    = 22;
const TB_STRUCT_CLOSE  = 23;

function get_ion_type(t: number) : IonType {
    switch(t) {
        case TB_NULL:          return IonTypes.NULL;
        case TB_BOOL:          return IonTypes.BOOL;
        case TB_INT:           return IonTypes.INT;
        case TB_NEG_INT:       return IonTypes.INT;
        case TB_FLOAT:         return IonTypes.FLOAT;
        case TB_DECIMAL:       return IonTypes.DECIMAL;
        case TB_TIMESTAMP:     return IonTypes.TIMESTAMP;
        case TB_SYMBOL:        return IonTypes.SYMBOL;
        case TB_STRING:        return IonTypes.STRING;
        case TB_CLOB:          return IonTypes.CLOB;
        case TB_BLOB:          return IonTypes.BLOB;
        case TB_SEXP:          return IonTypes.SEXP;
        case TB_LIST:          return IonTypes.LIST;
        case TB_STRUCT:        return IonTypes.STRUCT;
        default:               return undefined;
    };
}

export class BinaryReader implements Reader {
    private _parser: ParserBinaryRaw;
    private _cat: Catalog;
    private _symtab: LocalSymbolTable;
    private _type: number;
//where do shared symbol tables fall into place here?
    constructor(source: Span, catalog: Catalog) {
        this._parser   = new ParserBinaryRaw(source);
        this._cat      = catalog || new Catalog();
        this._symtab   = defaultLocalSymbolTable();
        this._type = BOC;
    }

    next() : IonType {
        if (this._type === EOF) return undefined;
        for (;;) {
            this._type = this._parser.next();
            if (this.depth() > 0) break;
            if (this._type === TB_SYMBOL) {
                let sid: number = this._parser.numberValue();
                if (sid !== IVM.sid) break;
                this._symtab = defaultLocalSymbolTable();
            } else if (this._type === TB_STRUCT) {
                if (!this._parser.hasAnnotations()) break;
                if (this._parser.getAnnotation(0) !== ion_symbol_table_sid) break;
                this._symtab = makeSymbolTable(this._cat, this);
            } else {
                break;
            }
        }
        return get_ion_type(this._type);
    }

    stepIn() : void {
        if (!get_ion_type(this._type).container) {
            throw new Error("can't step in to a scalar value");
        }
        this._parser.stepIn();
        this._type = BOC;
    }

    stepOut() : void {
        this._parser.stepOut();
        this._type = BOC;
    }

    valueType() : IonType {
        return get_ion_type(this._type);
    }

    depth() : number {
        return this._parser.depth();
    }

    fieldName() : string {
        return this.getSymbolString(this._parser.getFieldId());
    }

    hasAnnotations() : boolean {
        return this._parser.hasAnnotations();
    }

    annotations() : string[] {
        return null;//TODO
    }

    getAnnotation(index: number) : string {
        return this.getSymbolString(this._parser.getAnnotation(index));
    }

    isNull() : boolean {
        return (this._type === TB_NULL) || this._parser.isNull();
    }

    stringValue() : string {
        if (this.isNull()) return 'null.' + get_ion_type(this._type).name;
        if (this._type === TB_SYMBOL) return this.getSymbolString(this._parser.numberValue());
        return this._parser.stringValue();
    }

    numberValue() : number {
        return this._parser.numberValue();
    }

    byteValue() : number[] {
        return this._parser.byteValue();
    }

    ionValue() : never {
        throw new Error("E_NOT_IMPL: ionValue");
    }

    booleanValue() : boolean {
        return this._parser.booleanValue();
    }

    decimalValue() : Decimal {
        return this._parser.decimalValue();
    }

    timestampValue() : Timestamp {
        return this._parser.timestampValue();
    }

    value() : any {
        switch(this.valueType()) {
            case IonTypes.BLOB:
            case IonTypes.CLOB:
                return this.byteValue();
            case IonTypes.BOOL:
                return this.booleanValue();
            case IonTypes.DECIMAL:
                return this.decimalValue();
            case IonTypes.FLOAT:
            case IonTypes.INT:
                return this.numberValue();
            case IonTypes.STRING:
            case IonTypes.SYMBOL:
                return this.stringValue();//TODO split string and symbol logic
            case IonTypes.TIMESTAMP:
                return this.timestampValue();
            default:
                throw new Error('Cannot convert non scalars to string.');
        }
    }

    private getSymbolString(symbolId: number) : string {
        if(symbolId < 1) return null;//TODO sid0 support
        let symbol : string = this._symtab.getSymbol(symbolId);
        if(symbol === null) return "$" + symbolId.toString();
        return symbol;
    }
}

