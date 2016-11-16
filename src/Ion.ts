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
namespace ION {
  const DOUBLE_QUOTE = 34; // "\\\""
  const SINGLE_QUOTE = 39; // "\\\'"
  const SLASH =        92; // "\\\\"

  function _make_bool_array(str: string) {
    let i = str.length
    let a = [];
    a[128] = false;
    while (i > 0) {
      --i;
      a[str.charCodeAt(i)] = true;
    }
    return a;
  }

  const _is_operator_char = _make_bool_array("!#%&*+-./;<=>?@^`|~");
  const _is_numeric_terminator = _make_bool_array("{}[](),\"\'\ \t\n\r\u000c");
  const _is_letter = _make_bool_array("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const _is_hex_digit = _make_bool_array("0123456789abcdefABCDEF");
  const _is_letter_or_digit = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const _is_base64_char = _make_bool_array("+/0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const _is_whitespace = _make_bool_array(" \t\r\n\u000c");
  const _escapeStrings = {
    0 : "\\0",
    8 : "\\b",
    9 : "\\t",
    10 : "\\n",
    13 : "\\r",
    DOUBLE_QUOTE: "\\\"",
    SINGLE_QUOTE: "\\\'",
    SLASH: "\\\\",
  };
  const e = {
    name: "IonError",
    where: undefined,
    msg: "error",
  };

  function get_buf_type(buf) {
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
    return (b1 === IVM.binary[0]) ? 'binary' : 'text';
  }

  function makeBinaryReader(buf, options) : BinaryReader {
    var span = makeSpan(buf);
    var parser = new BinaryReader(span, options && options.catalog);
    return parser;
  }

  function makeTextReade(buf, options) : TextReader {
    var span = makeSpan(buf);
    var parser = new TextReader(span, options && options.catalog);
    return parser;
  }

    let ion = {
    EOF :                 -1,
    WHITESPACE_COMMENT1 : -2,
    WHITESPACE_COMMENT2 : -3,
    ESCAPED_NEWLINE     : -4,

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
        fixes.push([pos, c]);
        pos = this.nextEscape(s, pos);
      }
      if (fixes.length > 0) {
        s2 = "";
        ii=fixes.length;
        pos = s.length;
        while (ii--) {
          let fix = fixes[ii];
          let tail_len = pos - fix[0] - 1;
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
                    : get_buf_type(buf);
      var reader = (stype === 'binary') 
                 ? makeBinaryReader(buf, options) 
                 : makeTextReader(buf, options);
      return reader;
    },
  }
}
