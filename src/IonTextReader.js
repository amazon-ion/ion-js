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

"use strict";

var ION;
if (!ION 
  || typeof ION.ParserTextRaw !== "function" 
  || typeof ION.getSystemSymbolTable !== "function"
) {
  throw {
    name: "IonError",
    where: "loading TextReader.js",
    msg: "IonTextReader.js must follow Ion.js, IonSymbols.js and IonParserTextRaw.js"
  };
}

ION.TextReader = ION.TextReader || (function() 
{
  var 
    RAW_STRING = new ION.IonType( -1, "raw_input", true,  false, false, false ),
    ERROR = new ION.IonType( -2, "error", true,  false, false, false ),
    BOC = -2, // cloned from IonParserTextRaw
    EOF = -1,
    T_IDENTIFIER = 9,
    T_STRUCT = 19
  ;

  var 
  TextReader_class = function(source, catalog) 
  {
    if (!source) ION.error("a source Span is required to make a reader");
    this._parser   = new ION.ParserTextRaw(source);
    this._depth    = 0;
    this._cat      = catalog;
    this._symtab   = ION.getSystemSymbolTable();
    this._type     = ERROR;
    this._raw_type = EOF;
    this._raw      = undefined;
  },
  
  load_raw = function(t) {
    if (t._raw !== undefined) return;
    if (t.isNull()) return;
    t._raw = t._parser._get_value_as_string(t._raw_type);
    return;
  },
  skip_past_container = function(t) {
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
  },
  
  TextReader_impl = {
    next : function() {
      var type, p, rt, t = this;
      t._raw = undefined;
      if (t._type === EOF) return undefined;
      if (t._type && t._type.container) {
        skip_past_container(t);
      }
      p = t._parser;
      for (;;) {
        t._raw_type = rt = p.next();
        if (t._depth > 0) break;
        if (rt === T_IDENTIFIER) { 
          load_raw(t);
          if (t._raw != ION.IVM.text) break;
          t._symtab = ION.getSystemSymbolTable();
        }
        else if (rt === T_STRUCT) {
          if (p._ann.length !== 1) break;
          if (p._ann[0] != ION.ion_symbol_table) break;
          t._symtab = ION.makeSymbolTable(t._cat, t);
        }
        else {
          break;
        }
      }
      // for system value (IVM's and symbol table's) we continue 
      // around this
      type = p.get_ion_type(rt);
      t._type = type || EOF;
      return type;
    },
    stepIn : function() {
      var t = this;
      if (!t._type.container) {
        ION.error("can't step in to a scalar value");
      }
      t._type = BOC;
      t._depth++;
    },
    stepOut : function() {
      var t = this;
      while ( t._type != EOF ) {
        t.next();
      }
      t._type = undefined;
      t._depth--;
    },
    
    valueType : function() {
      return this._type;
    },
    depth : function() {
      return this._depth;
    },
    fieldName : function() {
      return this._parser._fieldname;
    },
    annotations : function() {
      return this._parser._ann;
    },
    isNull : function() {
      if (this._type == ION.NULL) return true;
      return this._parser.isNull();
    },
    stringValue : function() {
      var i, s, t = this;
      load_raw(t);
      if (t.isNull()) {
        s = "null";
        if (t._type != ION.NULL) {
          s += "." + t._type.name;
        }
      }
      else if (t._type.scalar) {
        // BLOB is a scalar by you don't want to just use the string 
        // value otherwise all other scalars are fine as is
        if (t._type !== ION.BLOB) {
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
    },
    numberValue : function() {
      if (!this._type.number) {
        return undefined;
      }
      return this._parser.numberValue();
    },
    byteValue : function() {
      ION.error("E_NOT_IMPL: byteValue");
    },
    ionValue : function() {
      ION.error("E_NOT_IMPL: ionValue");
    },
  };

  TextReader_class.prototype = TextReader_impl;
  TextReader_class.prototype.constructor = TextReader_class;
  return TextReader_class;
})();
