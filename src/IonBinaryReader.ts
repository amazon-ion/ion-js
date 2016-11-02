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

"use strict";

var ION;
if (!ION 
  || typeof ION.getSystemSymbolTable !== "function"
  || typeof ION._decimal !== "function"
  || typeof ION.ParserBinaryRaw !== "function"
) {
  throw {
    name: "IonError",
    where: "loading TextReader.js",
    msg: "IonTextReader.js must follow Ion.js, IonSymbols.js, IonValueSupport.js, and IonParserBinaryRaw"
  };
}

ION.BinaryReader = ION.BinaryReader || (function() 
{
  var 
    RAW_STRING = new ION.IonType( -1, "raw_input", true,  false, false, false ),
    
    // these type decls (and the get_ion_type function) are cloned in IonBinaryReader.js
    // EOF is end of container, distinct from undefined which is value has been consumed
    ERROR            = -3,
    BOC              = -2,
    EOF              = -1,
    TB_NULL          =  0,
    TB_BOOL          =  1,
    TB_INT           =  2,
    TB_NEG_INT       =  3,
    TB_FLOAT         =  4,
    TB_DECIMAL       =  5,
    TB_TIMESTAMP     =  6,
    TB_SYMBOL        =  7,
    TB_STRING        =  8,
    TB_CLOB          =  9,
    TB_BLOB          = 10,
    TB_SEXP          = 11,
    TB_LIST          = 12,
    TB_STRUCT        = 13,
    TB_ANNOTATION    = 14,
    TB_UNUSED__      = 15,
    TB_DATAGRAM      = 20,   // fake type of the top level
    TB_SEXP_CLOSE    = 21,
    TB_LIST_CLOSE    = 22,
    TB_STRUCT_CLOSE  = 23,

    get_ion_type = function (t) {
      switch(t) {
      case TB_NULL:          return ION.NULL;
      case TB_BOOL:          return ION.BOOL;
      case TB_INT:           return ION.INT;
      case TB_NEG_INT:       return ION.INT;
      case TB_FLOAT:         return ION.FLOAT;
      case TB_DECIMAL:       return ION.DECIMAL;
      case TB_TIMESTAMP:     return ION.TIMESTAMP;
      case TB_SYMBOL:        return ION.SYMBOL;
      case TB_STRING:        return ION.STRING;
      case TB_CLOB:          return ION.CLOB;
      case TB_BLOB:          return ION.BLOB;
      case TB_SEXP:          return ION.SEXP;
      case TB_LIST:          return ION.LIST;
      case TB_STRUCT:        return ION.STRUCT;
      default:              return undefined;
      };
    },
    get_symbol_string = function(t, n) {
      var s = undefined;
      if (n > 0) {
        s = t._symtab.getName(n);
        if (typeof s === 'undefined') {
          s = "$" + n.toString();
        }
      }
      return s;
    }
  ;

  var 
  BinaryReader_class = function(source, catalog) 
  {
    if (!source) ION.error("a source Span is required to make a reader");
    this._parser   = new ION.ParserBinaryRaw(source);
    this._cat      = catalog;
    this._symtab   = ION.getSystemSymbolTable();
    this._raw_type = BOC;
  },
  binary_reader_impl = 
  {
    next : function() {
      var p, rt, t = this;
      if (t._raw_type === EOF) return undefined;
      p = t._parser;
      for (;;) {
        t._raw_type = rt = p.next();
        if (t.depth() > 0) break;
        if (rt === TB_SYMBOL) {
          t._raw = p.numberValue();
          if (t._raw !== ION.IVM.sid) break;
          t._symtab = ION.getSystemSymbolTable();
        }
        else if (rt === TB_STRUCT) {
          if (!p.hasAnnotations()) break;
          if (p.getAnnotation(0) !== ION.ion_symbol_table_sid) break;
          t._symtab = ION.makeSymbolTable(t._cat, t);
        }
        else {
          break;
        }
      }
      return get_ion_type(rt);
    },
    stepIn : function() {
      var t = this;
      if (!get_ion_type(t._raw_type).container) {
        ION.error("can't step in to a scalar value");
      }
      t._parser.stepIn();
      t._raw_type = BOC;
    },
    stepOut : function() {
      var t = this;
      t._parser.stepOut();
      t._raw_type = BOC;
    },
    valueType : function() {
      return get_ion_type(this._raw_type);
    },
    depth : function() {
      return this._parser.depth();
    },
    fieldName : function() {
      var n, s, t = this;
      n = t._parser.getFieldId();
      s = get_symbol_string(t, n)
      return s;      
    },
    hasAnnotations : function() {
      return this._parser.hasAnnotations();
    },
    getAnnotation : function(index) {
      var id, n, t = this;
      id = t._parser.getAnnotation(index);
      n = get_symbol_string(t, id);
      return n;
    },
    isNull : function() {
      var t = this,
          is_null = (t._raw_type === TB_NULL) || t._parser.isNull();
      return is_null;
    },
    stringValue : function() {
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
    },
    numberValue : function() {
      return this._parser.numberValue();
    },
    byteValue : function() {
      return this._parser.byteValue();
    },
    ionValue : function() {
      ION.error("E_NOT_IMPL: ionValue");
    },
  };

  BinaryReader_class.prototype = binary_reader_impl;
  BinaryReader_class.prototype.constructor = BinaryReader_class;
  return BinaryReader_class;
})();
