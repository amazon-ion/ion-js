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

"use strict";

var ION;
var D = function(msg) {
  window.alert("DEBUG: "+msg);
}
if (typeof ION === 'undefined') {
  ION = (function() {
    var DOUBLE_QUOTE = 34,// "\\\""
        SINGLE_QUOTE = 39,// "\\\'"
        SLASH =        92;// "\\\\"
        
    var _make_bool_array = function(str) {
                            var ii=str.length, a=[];
                            a[128] = false;
                            while (ii>0) {
                              --ii;
                              a[str.charCodeAt(ii)] = true;
                            }
                            return a;
                         };
    var
      _is_operator_char = _make_bool_array("!#%&*+-./;<=>?@^`|~"),
      _is_numeric_terminator =  _make_bool_array("{}[](),\"\'\ \t\n\r\u000c"),
      _is_letter = _make_bool_array("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
      _is_hex_digit = _make_bool_array("0123456789abcdefABCDEF"),
      _is_letter_or_digit = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
      _is_base64_char = _make_bool_array("+/0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"),
      _is_whitespace = _make_bool_array(" \t\r\n\u000c"),
      _escapeStrings = {
        0 : "\\0",
        8 : "\\b",
        9 : "\\t",
        10 : "\\n",
        13 : "\\r",
        DOUBLE_QUOTE: "\\\"",
        SINGLE_QUOTE: "\\\'",
        SLASH: "\\\\",
      },
      e = {
        name: "IonError",
        where: undefined,
        msg: "error",
      };
      

    var Class = (function() {
      var initializing = false;

      var make_wrapper = function(name, fn1, super_fn) {
        var fn2 = function() {
                  var tmp = this._super;

                  // Add a new ._super() method that is the same method
                  // but on the super-class.
                  this._super = super_fn;

                  // we do the apply here so the calling code doesn't have to
                  // there's some overhead as this is done even if this function
                  // doesn't call the _super function.
                  var ret = fn1.apply(this, arguments);

                  // The method only need to be bound temporarily, so we
                  // remove it when we're done executing
                  this._super = tmp;

                  return ret;
                };
        return fn2;
      };

      // The base Class implementation 
      var BaseClass = function(){ 
                        /* (this constructor does nothing) */ 
                      };
      
      // Create a new Class that inherits from this class
      // props is a struct of properties to be added in the
      // new derived class (see for loop below)
      BaseClass.extend = function(props) 
      {
        var _super = this.prototype;
        
        // Instantiate a base class (but only create the instance,
        // don't run the init constructor). This creates a new
        // ION.Class instance which we'll update into a 
        initializing = true;
        var proto = new this();    
        initializing = false;
        
        // Copy the properties over onto the new prototype
        for (var name in props) {
          var prop = props[name];
          var super_prop = _super[name];
          var isvalue = !(  (typeof prop == "function") 
                         && (typeof super_prop == "function")
                         );
          
          // when we override a function we wrap the new variant of the
          // function with a function that sets the _super member of
          // the instance before invoking the supplied function. This
          // allows the _super() call in the code to have the correct
          // 'this' value and operate just as one would expect. Avoiding
          // the prototype.FN.apply(this,arguments) syntax.
          // [it seems that the init function must call the super
          // init if it exists.  Do we want to enforce that here? Or
          // depend on the class developers to do the right thing? ]
          proto[name] = isvalue ? prop : make_wrapper(name, prop, super_prop);
        }
        
        // The dummy class constructor
        var NewClass = function () {
          // All construction is actually done in the init method
          if ( !initializing && this.init ) {
            this.init.apply(this, arguments);
          }
        }
        
        // Populate our constructed prototype object
        NewClass.prototype = proto;
        
        // Enforce the constructor to be what we expect
        NewClass.prototype.constructor = NewClass;

        // And make this class extendable
        NewClass.extend = arguments.callee;

        return NewClass;
      };

      return BaseClass;
    })();

    IonType = Class.extend({
      bid:      0,
      name:     undefined,
      scalar:   undefined,
      lob:      undefined,
      number:   undefined,
      container:undefined,

      init : function( bid, name, scalar, lob, number, container ){
        this.bid      = bid;
        this.name     = name;
        this.scalar   = scalar;
        this.lob      = lob;
        this.number   = number;
        this.container = container;
      },
    });
    
    var
     // type                  ( bid, name,        scalar, lob, number, container )
      _NULL      = new IonType(  0, "null",       true,  false, false, false ),
      _BOOL      = new IonType(  1, "bool",       true,  false, false, false ),
      _INT       = new IonType(  2, "int",        true,  false, true,  false ),
      _FLOAT     = new IonType(  4, "float",      true,  false, true,  false ),
      _DECIMAL   = new IonType(  5, "decimal",    true,  false, false, false ),
      _TIMESTAMP = new IonType(  6, "timestamp",  true,  false, false, false ),
      _SYMBOL    = new IonType(  7, "symbol",     true,  false, false, false ),
      _STRING    = new IonType(  8, "string",     true,  false, false, false ),
      _CLOB      = new IonType(  9, "clob",       true,  true,  false, false ),
      _BLOB      = new IonType( 10, "blob",       true,  true,  false, false ),
      _LIST      = new IonType( 11, "list",       false, false, false, true  ),
      _SEXP      = new IonType( 12, "sexp",       false, false, false, true  ),
      _STRUCT    = new IonType( 13, "struct",     false, false, false, true  ),
      _DATAGRAM  = new IonType( 20, "datagram",   false, false, false, true  ),
      _BOC       = new IonType( -2, "boc",        false, false, false, false )
      ;

    
    var ion = {
      NULL :      _NULL,
      BOOL :      _BOOL,
      INT :       _INT,
      FLOAT :     _FLOAT,
      DECIMAL :   _DECIMAL,
      TIMESTAMP : _TIMESTAMP,
      SYMBOL :    _SYMBOL,
      STRING :    _STRING,
      CLOB :      _CLOB,
      BLOB :      _BLOB,
      LIST :      _LIST,
      SEXP :      _SEXP,
      STRUCT :    _STRUCT,
      DATAGRAM :  _DATAGRAM,
      BOC :       _BOC,
      
      types : [ _NULL, _BOOL, _INT, _FLOAT, _DECIMAL, _TIMESTAMP, _SYMBOL, _STRING, _CLOB, _BLOB, _LIST, _SEXP, _STRUCT, ],
      
      IVM :   { text: "$ion_1_0", binary: [ 224 /*0xE0*/, 1 /*0x01*/, 0 /*0x00*/, 234 /*0xEA*/ ], sid : 3 },
      EOF :                 -1,
      WHITESPACE_COMMENT1 : -2,
      WHITESPACE_COMMENT2 : -3,
      ESCAPED_NEWLINE     : -4,
      
      error : function(message) 
      {
        e.msg = message;
        throw e;
      },
      errorAt : function(message, location) 
      {
        e.msg = message;
        e.where = location;
        throw e;
      },
      toHex : function ( c, len )
      {
        var s = "";
        while (c > 0) {
          s += "0123456789ABCDEF".charAt(c && 0xf);
          c = c / 16;
        }
        if (s.length < len) {
          s = "000000000" + s; // TODO: 9 0's, 9 > max len expected (but what about bigger than that?)
          s = s.substring(s.length - len, s.length); 
        }
      },
      escapeSequence : function(c)
      {
        var s = _escapeStrings[c];
        if (typeof s === 'undefined') {
          if (c < 256) {
            s = "\\x" + this.toHex(c,2);
          }
          else if (c <= 0xFFFF) {
            s = "\\u" + this.toHex(c,4);
          }
          else {
            s = "\\U" + this.toHex(c,8);
          }
        }
        return s;
      },
      needsEscape : function(c)  // TODO: this whole swath of fns probably has a JS technique somewhere
      {
        if (c < 32) return true;
        if (c > 126) return true;
        if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === SLASH) return true;
        return false;
      },
      nextEscape : function(s, prev) // this actually counts backwards to -1
      {
        while (prev-- > 0) {
          if (this.needsEscape(s.charCodeAt(prev))) break;
        }
        return prev;
      },
      escapeString : function(s, pos)
      {
        var fixes = [], c, old_len, new_len, ii, s2;
        while (pos >= 0) {
          c = s.charCodeAt(pos);
          if (!this.needsEscape(c)) break;
          fixes.append([pos, c]);
          pos = this.nextEscape(s, pos);
        }
        if (fixes.length > 0) {
          s2 = "";
          ii=fixes.length;
          pos = s.length;
          while (ii--) {
            fix = fixes[ii];
            tail_len = pos - fix[0] - 1;
            if (tail_len > 0) {
              s2 = this.escapeSequence(fix[1]) + s.substring(fix[0]+1,pos) + s2;
            }
            else {
              s2 = s.substring(fix[0]+1,pos) + s2;
            }
            pos = fix[0] - 1;
          }
          if (pos >= 0) {
            s2 = s.substring(0,pos) + s2;
          }
          s = s2;
        }
        return s;
      },
      asAscii: function(s) {
        if (typeof s === 'undefined') {
          s = "undefined::null";
        }
        else if (typeof s == 'number') {
          s = ""+s;
        }
        else if (typeof s != 'string') {
          var esc = this.nextEscape(s, s.length);
          if (esc >= 0) {
            s = this.escapeString(s, esc);
          }
        }
        return s;
      },
      get_buf_type : function (buf) {
        var b1, btype = typeof buf;
        if (btype === 'undefined' || typeof buf.length === 'undefined') this.error("invalid input");
        if (btype === 'string') {
          b1 = buf.charCodeAt(0);
        }
        else if (btype === 'object') { //probably array, object with length
          b1 = buf[0];
        }
        else {
          this.error("invalid input");
        }
        return (b1 === ION.IVM.binary[0]) ? 'binary' : 'text';
      },

      is_operator_char : function(ch) {
        return _is_operator_char[ch];
      },
      is_numeric_terminator : function(ch) {
        if (ch == -1) return true;
        return _is_numeric_terminator[ch];
      },
      is_letter : function(ch) {
        return _is_letter[ch];
      },
      is_digit : function(ch) {
        if (ch < 48 || ch > 57) return false;
        return true;
      },
      is_hex_digit : function(ch) {
        return _is_hex_digit[ch];
      },
      is_letter_or_digit : function(ch) {
        return _is_letter_or_digit[ch];
      },
      is_base64_char : function(ch) {
        return _is_base64_char[ch];
      },
      is_whitespace : function(ch) {
        if (ch > 32) return false;
        if (ch == this.WHITESPACE_COMMENT1) return true;
        if (ch == this.WHITESPACE_COMMENT2) return true;
        if (ch == this.ESCAPED_NEWLINE)     return true;
        return _is_whitespace[ch];
      },
      
      makeReader : function( buf, options ) {
        var stype =  options && (typeof options.sourceType === 'undefined') 
                      ? options.sourceType 
                      : ION.get_buf_type(buf);
        var reader = (stype === 'binary') 
                   ? ION.makeBinaryReader(buf, options) 
                   : ION.makeTextReader(buf, options);
        return reader;
      },
      makeBinaryReader : function (buf, options) 
      {
	    var span = ION.makeSpan(buf);
        var parser = new ION.BinaryReader(span, options && options.catalog);
        return parser;
      },
      makeTextReader : function (buf, options)
      {
        var span = ION.makeSpan(buf);
        var parser = new ION.TextReader(span, options && options.catalog);
        return parser;
      },
    };
    ion.IonType = IonType;
    ion.Class = Class;
    return ion;
  })();
}
