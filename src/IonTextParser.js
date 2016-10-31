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

// Ion Text Parser - aka ION.UserTextParser
//
// Handles parsing text input as Ion.

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonTextParser.js",
    msg: "IonTextParser.js must follow Ion.js and IonSpan.js"
  };
}

if (typeof ION.makeTextParser !== 'function') {

  ION.makeTextParser = (function() 
  {
    var UserParser, SystemParser, makeTextParser,
        userParser, systemParser;
        
    var states = {
      // parse functions
      pf_bof : function() {
      },
      pf_datagram : function() {
        this._span.next();
        
      },
      pf_annotated_value : function() {
      },
      pf_value : function() {
      },
      pf_struct : function() {
      },
      pf_list : function() {
      },
      pf_sexp : function() {
      },
      pf_element1 : function() {
      },
      pf_element2 : function() {
      },
      pf_field : function() {
      },
      pf_string1 : function() {
      },
      pf_string2 : function() {
      },
      pf_string3 : function() {
      },
      pf_symbol : function() {
      },
      pf_number : function() {
      },
      pf_null : function() {
      },
      pf_bool : function() {
      },
    };
    
    
    
    var systemParser = {
      _span :  undefined,
      _fn :    ps_bof,       // initial state function
      _depth : 0,
      
      _type :  undefined,
      _ann :   undefined,
      _fname : undefined,
      _val :   undefined,
      
      init(span) {
        _span = span;
      },
      init_value : function() {
        this._type  = undefined;
        this._ann   = undefined;
        this._fname = undefined;
        this._val   = undefined;
      },
      next:       function() {
        if (_fn === undefined) return undefined; // EOF
        this.init_value();
        while( _fn != undefined && _type === undefined) {
          _fn = _fn.apply(this);
        }
        return _type;
      },
      stepIn: function() {
      },
      stepOut: function() {
      },
      type:    function() {
        return _type;
      },
      fieldName : function() {
        return _fname;
      },
      annotations : function() {
        return _ann;
      },
      _is_scalar : function () {
        return (this._type && this._type.scalar);
      },
      stringValue:  function() {
        if (this._is_scalar()) {
          if (_val === undefined) {
            ION.error("E_NOT_IMPL: read value");
          }
        }
        return _val;
      },
      numberValue:  function() {
        if (this._is_scalar()) {
          if (_val === undefined) {
            ION.error("E_NOT_IMPL: read value");
          }
        }
        return _val;
      },
      ionValue: function() {
      },
      readLob: function() {
      },
    };
    var userParser = {
      _sp : undefined,
      _syms : undefined,
      
      init(sysParser) {
        _sp = sysParser;
      },
      _set_sym :  function(syms) {
        _syms = syms;
      },
      isSystemValue : function() {
        if (this._depth != 0) return false;
        if (this._type === ION.STRUCT) {
          if (this._ann === undefined) return false;
          if (this._ann.length != 1) return false;
          if (this._ann[0] != ION.system_symbols.SYMBOL_TABLE) return false;
          return true;
        }
        else if (this._type === ION.SYMBOL) {
          return (this.getScalar() === ION.system_symbols.IVM.text);
        }
        return false;
      },
      next: function() {
        var t = _sp.next();
        while (this.isSystemValue()) { // possible symbol table
          if (t === ION.STRUCT) {
            this._set_syms(ION.makeSymbolTable(_syms, _sp));
          }
          else if (t === ION.SYMBOL) {
            this._set_syms(ION.getSystemSymbolTable());
          }
          else {
            ION.error("internal");
          }
          t = _sp.next();
        }
        return t;
      },
    };

    SystemParser = Class.extend(systemParser);
    UserParser = SystemParser.extend( userParser );

    makeTextParser = function(span, options) {
      var system_parser = new SystemParser();
      var new_parser = new UserParser();
      return new_parser;
    };
    return makeTextParser;
  })();
  
}