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

// Text reader.  This is a user reader built on top of
// the IonParserTextRaw parser.
//
// Handles system symbols, and conversion from the parsed
// input string to the desired Javascript value (scalar or
// object, such as IonValue).
import { Catalog } from "./IonCatalog";
import { Decimal } from "./IonDecimal";
import { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
import { get_ion_type } from "./IonParserTextRaw";
import { getSystemSymbolTable } from "./IonSystemSymbolTable";
import { ion_symbol_table } from "./IonSymbols";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IVM } from "./IonConstants";
import { LocalSymbolTable } from "./IonLocalSymbolTable";
import { makeSymbolTable } from "./IonSymbols";
import { ParserTextRaw } from "./IonParserTextRaw";
import { Reader } from "./IonReader";
import { StringSpan } from "./IonSpan";
import { Timestamp } from "./IonTimestamp";
import { fromBase64 } from "./IonText";
import { is_digit } from "./IonText";

const RAW_STRING = new IonType( -1, "raw_input", true,  false, false, false );

const BEGINNING_OF_CONTAINER = -2; // cloned from IonParserTextRaw
const EOF = -1;
const T_IDENTIFIER = 9;
const T_STRING1 = 11;
const T_STRUCT = 19;

export class TextReader implements Reader {
  private _parser: ParserTextRaw;
  private _depth: number;
  private _cat: Catalog;
  private _symtab: LocalSymbolTable;
  private _type: IonType;
  private _raw_type: number;
  private _raw: any;

  constructor(source: StringSpan, catalog?: Catalog) {
    if (!source) {
      throw new Error("a source Span is required to make a reader");
    }

    this._parser   = new ParserTextRaw(source);
    this._depth    = 0;
    this._cat      = catalog ? catalog : new Catalog();
    this._symtab   = defaultLocalSymbolTable();
    this._type     = undefined;
    this._raw_type = undefined;
    this._raw      = undefined;
  }

  load_raw() {
    let t: TextReader = this;
    if (t._raw !== undefined) return;
    t._raw = t._parser.get_value_as_string(t._raw_type);
    return;
  }

  skip_past_container() {
    let type;
    let d = this.depth();  // we want to have read the EOC that matches the container we just saw
    this.stepIn();
    while (this.depth() > d) {
      type = this.next();
      if (type === undefined) { // end of container
          this.stepOut();
      } else if (type.container && !this.isNull()) {
          this.stepIn();
      }
    }
  }

    isIVM(input : string) : boolean {
        if (this.depth() > 0) return false;
        if (input.length < 6 || this.annotations().length > 0) return false;
        let prefix = "$ion_";
        let i = 0;

        while (i < prefix.length) {
            if (prefix.charAt(i) !== input.charAt(i)) return false;
            i++;
        }

        while (i < input.length && input.charAt(i) != '_') {
            let tempChar = input.charAt(i);
            if (tempChar < '0' || tempChar > '9') return false;
            i++;
        }
        i++;
        while (i < input.length && i < input.length) {
            let tempChar = input.charAt(i);
            if (tempChar < '0' || tempChar > '9') return false;
            i++;
        }
        if (input !== "$ion_1_0") throw new Error("Only Ion version 1.0 is supported.");
        return true;
    }

    isLikeIVM() : boolean {
      return false;
    }

next() {
    this._raw = undefined;
    if (this._raw_type === EOF) return undefined;

    let should_skip: boolean =
    this._raw_type !== BEGINNING_OF_CONTAINER
    && !this.isNull()
    && this._type
    && this._type.container;
    if (should_skip) this.skip_past_container();

    let p: ParserTextRaw = this._parser;
    for (;;) {
        this._raw_type = p.next();
        if (this._raw_type === T_IDENTIFIER) {
            if (this._depth > 0) break;
            this.load_raw();
            if (!this.isIVM(this._raw)) break;
            this._symtab = defaultLocalSymbolTable();
            this._raw = undefined;
            this._raw_type = undefined;
        }else if (this._raw_type === T_STRING1) {
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
    this._type = get_ion_type(this._raw_type);
    return this._type;
  }

  stepIn() {
    if (!this._type.container) {
      throw new Error("can't step in to a scalar value");
    }
    if (this.isNull()) {
      throw new Error("Can't step into a null container");
    }
    this._parser.clearFieldName();
    this._raw_type = BEGINNING_OF_CONTAINER;
    this._depth++;
  }

  stepOut() {
    this._parser.clearFieldName();
    while ( this._raw_type != EOF ) {
      this.next();
    }
    this._raw_type = undefined;
    this._depth--;
  }

  valueType() : IonType {
    return this._type;
  }

  depth() : number {
    return this._depth;
  }

    fieldName() : string {
        let str = this._parser.fieldName();
        let raw_type = this._parser.fieldNameType();
        if(raw_type === T_IDENTIFIER && (str.length > 1 && str.charAt(0) === '$'.charAt(0))) {
            let tempStr = str.substr(1, str.length);
            if (+tempStr === +tempStr) {//look up sid, +str === +str is a one line is integer hack
                let symbol = this._symtab.getSymbol(Number(tempStr));
                if(symbol === undefined) throw new Error("Unresolveable symbol ID, symboltokens unsupported.");
                return symbol;
            }
        }
        return str;
    }

  annotations() : string[] {
    return this._parser.annotations();
  }

  isNull() : boolean {
    if (this._type === IonTypes.NULL) return true;
    return this._parser.isNull();
  }

    stringValue() : string {
        this.load_raw();
        if (this.isNull()) return (this._type === IonTypes.NULL) ? "null" : "null." + this._type.name;
        if (this._type.scalar) {
            // BLOB is a scalar by you don't want to just use the string
            // value otherwise all other scalars are fine as is
            switch(this._type) {
                case IonTypes.BLOB:
                    return this._raw;
                case IonTypes.SYMBOL:
                    if(this._raw_type === T_IDENTIFIER && (this._raw.length > 1 && this._raw.charAt(0) === '$'.charAt(0))){
                        let tempStr = this._raw.substr(1, this._raw.length);
                        if (+tempStr === +tempStr) {//look up sid, +str === +str is a one line is integer hack
                            let symbol = this._symtab.getSymbol(Number(tempStr));
                            if(symbol === undefined) throw new Error("Unresolveable symbol ID, symboltokens unsupported.");
                            return symbol;
                        }
                    }
                    return this._raw;
                default:
                    return this._raw;
            }
        } else {
            throw new Error("Cannot create string representation of non-scalar values.");
        }
    }

  numberValue() {
    if (!this._type.num) {
      return undefined;
    }
    return this._parser.numberValue();
  }

  byteValue() : Uint8Array {
    this.load_raw();
    if(this.isNull()) return null;
    switch(this._type){
        case IonTypes.CLOB : {
            let length = this._raw.length;
            let data = new Uint8Array(length);
            for(let i = 0; i < this._raw.length; i++){
                data[i] = this._raw.charCodeAt(i);
            }
            return data;
        }
        case IonTypes.BLOB : {
            return fromBase64(this._raw);
        }
        default:
            throw new Error(this._type.name + ".byteValue() is not supported.");
    }
  }

  booleanValue() {
    if (this._type !== IonTypes.BOOL) {
      return undefined;
    }
    return this._parser.booleanValue();
  }

    decimalValue() : Decimal {
        if(this.isNull()) return null;
        return Decimal.parse(this.stringValue());
    }

    timestampValue() : Timestamp {
        if(this.isNull()) return null;
        return Timestamp.parse(this.stringValue());
    }

    value() {
        switch(this._type) {
            case IonTypes.NULL :
                return null;
            case IonTypes.BOOL : {
                return this.booleanValue();
            }
            case IonTypes.INT : {
                return this.numberValue();
            }
            case IonTypes.FLOAT : {
                return this.numberValue();
            }
            case IonTypes.DECIMAL : {
                return this.decimalValue();
            }
            case IonTypes.SYMBOL : {
                return this.stringValue();
            }
            case IonTypes.STRING : {
                return this.stringValue();
            }
            case IonTypes.TIMESTAMP : {
                return this.timestampValue();
            }
            case IonTypes.CLOB : {
                return this.byteValue();
            }
            case IonTypes.BLOB : {
                return this.byteValue();
            }
            default : {
                return undefined;
            }
        }
    }
}
