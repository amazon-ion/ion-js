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

  function makeTextReader(buf, options) : TextReader {
    var span = makeSpan(buf);
    var parser = new TextReader(span, options && options.catalog);
    return parser;
  }

    let ion = {
    EOF :                 -1,
    WHITESPACE_COMMENT1 : -2,
    WHITESPACE_COMMENT2 : -3,
    ESCAPED_NEWLINE     : -4,

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
