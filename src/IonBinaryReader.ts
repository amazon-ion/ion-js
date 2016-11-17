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

namespace ION {
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

  function get_symbol_string(t, n: number) : string {
    var s = undefined;
    if (n > 0) {
      s = t._symtab.getName(n);
      if (typeof s === 'undefined') {
        s = "$" + n.toString();
      }
    }
    return s;
  }

  class BinaryReader implements Reader {
    private _parser: ParserBinaryRaw;
    private _cat;
    private _symtab;
    private _raw_type: number;

    constructor(source: Span, catalog) {
      this._parser   = new ParserBinaryRaw(source);
      this._cat      = catalog;
      this._symtab   = ION.getSystemSymbolTable();
      this._raw_type = BOC;
    }

    next() : IonType {
      var p, rt, t = this;
      if (t._raw_type === EOF) return undefined;
      p = t._parser;
      for (;;) {
        t._raw_type = rt = p.next();
        if (t.depth() > 0) break;
        if (rt === TB_SYMBOL) {
          let raw: number = p.numberValue();
          if (raw !== ION.IVM.sid) break;
          t._symtab = getSystemSymbolTable();
        }
        else if (rt === TB_STRUCT) {
          if (!p.hasAnnotations()) break;
          if (p.getAnnotation(0) !== ion_symbol_table_sid) break;
          t._symtab = makeSymbolTable(t._cat, t);
        }
        else {
          break;
        }
      }
      return get_ion_type(rt);
    }

    stepIn() : void {
      var t = this;
      if (!get_ion_type(t._raw_type).container) {
        throw new Error("can't step in to a scalar value");
      }
      t._parser.stepIn();
      t._raw_type = BOC;
    }

    stepOut() : void {
      var t = this;
      t._parser.stepOut();
      t._raw_type = BOC;
    }

    valueType() : IonType {
      return get_ion_type(this._raw_type);
    }

    depth() : number {
      return this._parser.depth();
    }

    fieldName() : string {
      var n, s, t = this;
      n = t._parser.getFieldId();
      s = get_symbol_string(t, n)
      return s;
    }

    hasAnnotations() : boolean {
      return this._parser.hasAnnotations();
    }

    getAnnotation(index: number) : string {
      var id, n, t = this;
      id = t._parser.getAnnotation(index);
      n = get_symbol_string(t, id);
      return n;
    }

    isNull() : boolean {
      var t = this,
          is_null = (t._raw_type === TB_NULL) || t._parser.isNull();
      return is_null;
    }

    stringValue() : string {
      var n, s, t = this, p = t._parser;
      if (t.isNull()) {
        s = "null";
        if (t._raw_type != TB_NULL) {
          s += "." + get_ion_type(t._raw_type).name;
        }
      }
      else if (get_ion_type(t._raw_type).scalar) {
        // BLOB is a scalar by you don't want to just use the string 
        // value otherwise all other scalars are fine as is
        if (t._raw_type === TB_SYMBOL) {
          n = p.numberValue();
          s = get_symbol_string(t, n);
        }
        else {
          s = p.stringValue();
        }
      }
      return s;
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
          return this.stringValue();
        case IonTypes.TIMESTAMP:
          return this.timestampValue();
        default:
          return undefined;
      }
    }
  }
}
