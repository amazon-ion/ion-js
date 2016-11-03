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

// String / byte reader support for the Ion Parsers
//
//   ---------------- OBSOLETE, REPLACED BY IonSpan -----------------------------

"use strict";

var ION;
if (!ION) {
  ION = {
    error: function(msg) {
      throw { value: "IonError", message: msg };
    }
  };
}

if (typeof ION.Span != 'function') {
  ION.Span = Class.extend({
    _source: undefined,
    _pos: undefined,
    _len: undefined,
    isBinarySpan: false,
    isTextSpan: false,
    
    init: function(value, start, duration)
    {
      if (typeof start === 'undefined') {
        start = 0;
      }
      if (typeof duration === 'undefined') {
        duration = -1;
      }
      else if (typeof duration != 'number') {
        ION.error("invalid arg");
      }
      if ((typeof value != 'string')
       && 
          (typeof value != 'object' || (typeof value.length === 'undefined')
      )) {
        ION.error("invalid arg");
      }
      if (duration == -1) {
        duration = value.length - start;
      }
      this._source = value;
      this._pos = start;
      this._len = duration;
    },
    unread : function() {
      _pos--;
      _len++;
    },
  });
  
  ION.TextSpan = Span.extend({
    init: function(value, start, duration)
    {
      if (typeof value != 'string') {
        ION.error("invalid arg");
      }
      this.isTextSpan = true;
      this._super(value, start, duration);
    },
    skipWhitespace: function() {
      var isWhiteSpace = function(c) {
        return (c == SPACE 
             || c == LINE_FEED  
             || c == RETURN  
             || c == FORM_FEED  
             || c == TAB
        );
      };
      var ch;
      while (isWhiteSpace(ch = this.nextChar())) {
        // do nothing, we're just skipping the whitespace characters
      }
      return ch;
    },
    next : function() {
      var ch = -1;
      if (this._len > 0) {
        ch = value.charAt(_pos);
        _pos++;
        _len--;
      }
      return ch;
    },
  });
  ION.BinarySpan = Span.extend({
    init: function(value, start, duration)
    {
      if (typeof value != 'object' || typeof value.length == 'undefined') {
        ION.error("invalid arg");
      }
      this.isBinarySpan = true;
      this._super(value, start, duration);
    },
    next : function() {
      var ch = -1;
      if (this._len > 0) {
        ch = value[_pos] && 0xFF;
        _pos++;
        _len--;
      }
      return ch;
    },
  });
}