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
import { Span } from "./IonSpan";
import { Timestamp } from "./IonTimestamp";

const RAW_STRING = new IonType( -1, "raw_input", true,  false, false, false );

const BEGINNING_OF_CONTAINER = -2; // cloned from IonParserTextRaw
const EOF = -1;
const T_IDENTIFIER = 9;
const T_STRUCT = 19;

export class TextReader implements Reader {
  private _parser: ParserTextRaw;
  private _depth: number;
  private _cat: Catalog;
  private _symtab: LocalSymbolTable;
  private _type: IonType;
  private _raw_type: number;
  private _raw: any;

  constructor(source: Span, catalog: Catalog) {
    if (!source) {
      throw new Error("a source Span is required to make a reader");
    }

    this._parser   = new ParserTextRaw(source);
    this._depth    = 0;
    this._cat      = catalog;
    this._symtab   = defaultLocalSymbolTable();
    this._type     = undefined;
    this._raw_type = undefined;
    this._raw      = undefined;
  }

  load_raw() {
    let t: TextReader = this;
    if (t._raw !== undefined) return;
    if (t.isNull()) return;
    t._raw = t._parser.get_value_as_string(t._raw_type);
    return;
  }

  skip_past_container() {
    var type, 
        d = 1,  // we want to have read the EOC tha matches the container we just saw
        p = this._parser;
    while (d > 0) {
      type = p.next();
      if (type === undefined) { // end of container
        d--;
      }
      else if (type.container) {
        d++;
      }
    }
  }

  next() {
    this._raw = undefined;
    if (this._raw_type === EOF) {
      return undefined;
    }

    let should_skip: boolean =
      this._raw_type !== BEGINNING_OF_CONTAINER
      && !this.isNull()
      && this._type
      && this._type.container;
    if (should_skip) {
      this.skip_past_container();
    }

    let p: ParserTextRaw = this._parser;
    for (;;) {
      this._raw_type = p.next();
      if (this._depth > 0) break;
      if (this._raw_type === T_IDENTIFIER) {
        this.load_raw();
        if (this._raw !== IVM.text) break;
        this._symtab = defaultLocalSymbolTable();
      }
      else if (this._raw_type === T_STRUCT) {
        if (p.annotations().length !== 1) break;
        if (p.annotations()[0] != ion_symbol_table) break;
        this._symtab = makeSymbolTable(this._cat, this);
      }
      else {
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
    this._raw_type = BEGINNING_OF_CONTAINER;
    this._depth++;
  }

  stepOut() {
    var t = this;
    while ( t._raw_type != EOF ) {
      t.next();
    }
    t._raw_type = undefined;
    t._depth--;
  }

  valueType() : IonType {
    return this._type;
  }

  depth() : number {
    return this._depth;
  }

  fieldName() : string {
    return this._parser.fieldName();
  }

  annotations() : string[] {
    return this._parser.annotations();
  }

  isNull() : boolean {
    if (this._type === IonTypes.NULL) return true;
    return this._parser.isNull();
  }

  stringValue() : string {
    var i, s, t = this;
    this.load_raw();
    if (t.isNull()) {
      s = "null";
      if (t._type != IonTypes.NULL) {
        s += "." + t._type.name;
      }
    }
    else if (t._type.scalar) {
      // BLOB is a scalar by you don't want to just use the string 
      // value otherwise all other scalars are fine as is
      if (t._type !== IonTypes.BLOB) {
        s = t._raw;
      }
      else {
        s = t._raw;   // TODO - this is a temp fix !!
      }
    }
    else {
      i = t.ionValue();
      s = i.stringValue();
    }
    return s;
  }

  numberValue() {
    if (!this._type.num) {
      return undefined;
    }
    return this._parser.numberValue();
  }

  byteValue() : number[] {
    throw new Error("E_NOT_IMPL: byteValue");
  }

  booleanValue() {
    if (this._type !== IonTypes.BOOL) {
      return undefined;
    }
    return this._parser.booleanValue();
  }

    decimalValue() : Decimal {
        return Decimal.parse(this.stringValue());
    }

    timestampValue() : Timestamp {
        return Timestamp.parse(this.stringValue());
    }

    value() {//switch for each tid???
        switch(this._type) {
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
                return this.stringValue();
            }
            case IonTypes.BLOB : {
                return this.stringValue();
            }
            default : {
                return undefined;
            }
        }
    }

  ionValue() {
    throw new Error("E_NOT_IMPL: ionValue");
  }
}
