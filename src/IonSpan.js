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

// Parser_number
//
// Handles parsing the Ion number formats from a text span.
// including: int, float, decimal, and timestamp

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonSpan.js",
    msg: "IonSpan.js must follow Ion.js"
  };
}

ION.makeSpan = ION.makeSpan || (function() 
{
  ION.SPAN_TYPE_STRING = 0;
  ION.SPAN_TYPE_BINARY = 1;
  ION.SPAN_TYPE_SUB_FLAG = 2;
  ION.SPAN_TYPE_SUB_STRING = ION.SPAN_TYPE_SUB_FLAG | ION.SPAN_TYPE_STRING;
  ION.SPAN_TYPE_SUB_BINARY = ION.SPAN_TYPE_SUB_FLAG | ION.SPAN_TYPE_BINARY;
  
  var 
    MAX_POS = 1024*1024*1024, // 1 gig 
    LINE_FEED =  10,
    CARRAIGE_RETURN = 13,
      DEBUG_FLAG = true,
    error = function() 
    { 
      ION.error("span error"); 
    },
    validate = function(n) 
    { 
      if (DEBUG_FLAG) {
        if (typeof n !== 'number') error("invalid value in span");
        if (!isFinite(n)) error("invalid value in span");
      }
    };

  // prototype for the string scanner /"subclass"
  var string_span = 
  {
    _type : undefined,
    _src : undefined,
    _pos : 0,
    _start : 0,
    _limit : 0,
    _line : 0,
    _old_line_start : 0,
    _line_start : 0,

    init : function (src, start, len) // Span(string)
    {
      this._type = ION.SPAN_TYPE_STRING;
      this._line = 1;
      this._src = src;
      this._limit = src.length;
      if (typeof start !== 'undefined') {
        this._pos = start;
        if (typeof len !== 'undefined') {
          this._limit = start + len;
        }
      }
      this._start = this._pos;
      this._line_start = this._pos;
      validate(this._start);
      validate(this._limit);
      validate(this._pos);
    },
    position : function()
    {
      return this._pos - this._start;
    },
    getRemaining : function()
    {
      return this._limit - this._pos;
    },
    setRemaining : function(r)
    {
      validate(r);
      this._limit = r + this._pos;
    },
    is_empty : function() 
    {
      validate(this._pos);
      validate(this._limit);
      return (this._pos >= this._limit);
    },
    next : function()
    {
      var ch;
      if (this.is_empty()) {
        if (this._pos > MAX_POS) {
          ION.error("span position is out of bounds");
        }
        this._pos++; // we increment this even though we don't use it (this 
                     // should not have other issues since past the end is 
                     // still past the end) to allow unread to be happy
        return ION.EOF;
      }
      ch = this._src.charCodeAt(this._pos);
      if (ch === CARRAIGE_RETURN) {
        if (this.peek() != LINE_FEED) {
          this._inc_line(ch);
        }
      }
      else if (ch == LINE_FEED) {
        this._inc_line(ch);
      }
      this._pos++;
      return ch;
    },
    _inc_line : function () {
        this._old_line_start = this._line_start;
        this._line++;
        this._line_start = this._pos;
    },
    unread : function(ch)
    {
      if (this._pos <= this._start) error();
      this._pos--;
      if (ch < 0) {
        if (this.is_empty() != true) error();
        return;
      }
      // we can only unread across 1 new line
      if (this._pos == this._line_start) {
          this._line_start = this._old_line_start;
          this._line--;
      }
      if (ch != this.peek()) error();  // DEBUG
    },
    peek : function()
    {
      if (this.is_empty()) return ION.EOF;
      return this._src.charCodeAt(this._pos);
    },
    skip : function(dist) {
      validate(dist);
      this._pos += dist;
      if (this._pos > this._limit) {
        this._pos = this._limit;
      }
    },
    get : function(ii) {
      if (ii < this._start || ii >= this._limit) return ION.EOF;
      return this._src.charCodeAt(ii);
    },
    line_number : function()
    {
      return this._line;
    },
    offset : function()
    {
      return this._pos - this._line_start;
    },
  };
  var StringSpan = function() {};
  StringSpan.prototype = string_span;
  StringSpan.prototype.constructor = StringSpan;
  
  // prototype for the binary scanner "subclass"
  var binary_span = 
  {
    _type : undefined,
    _src : undefined,
    _pos : 0,
    _start : 0,
    _limit : 0,

    init : function (src, start, len) // Span(byte array)
    {
      this._type = ION.SPAN_TYPE_BINARY
      this._src = src;
      this._limit = src.length;
      if (typeof start !== 'undefined') {
        this._start = start;
        if (typeof len !== 'undefined') {
          this._limit = start + len;
        }
      }
      this._start = this._pos;
      validate(this._pos);
      validate(this._limit);
    },
    position : function()
    {
      return this._pos - this._start;
    },
    getRemaining : function()
    {
      return this._limit - this._pos;
    },
    setRemaining : function(r)
    {
      validate(r);
      this._limit = r + this._pos;
    },
    is_empty : function() 
    {
      validate(this._pos);
      validate(this._limit);
      return (this._pos >= this._limit);
    },
    next : function()
    {
      var b;
      if (this.is_empty()) {
        if (this._pos > MAX_POS) {
          ION.error("span position is out of bounds");
        }
        this._pos++;
        return ION.EOF;
      }
      b = this._src[this._pos];
      this._pos++;
      return (b & 0xFF);
    },
    unread : function(b)
    {
      if (this._pos <= this._start) error();
      this._pos--;
      if (b == ION.EOF) {
        if (this.is_empty() == false) error();
      }
      if (b != this.peek()) error();    // DEBUG
    },
    peek : function()
    {
      if (this.is_empty()) return ION.EOF;
      return (this._src[this._pos] & 0xFF);
    },
    skip : function(dist) {
      validate(dist);
      this._pos += dist;
      if (this._pos > this._limit) {
        this._pos = this._limit;
      }
    },
    get : function(ii) {
      if (ii < this._start || ii >= this._limit) return undefined;
      return (this._src[ii] & 0xFF);
    },
  };
  var BinarySpan = function() {};
  BinarySpan.prototype = binary_span;
  BinarySpan.prototype.constructor = BinarySpan;

  // make this into a "class", it's a constructor who's prototype is the parser above
  // and we make the prototype parser's constructor this constructor function
  var makeSpan_impl = function (src, start, len) {
    var span = undefined,
        src_type = typeof src
    ;
    if (src_type === 'undefined') error();
    if (src_type === 'string') {
      span = new StringSpan();
      span.init(src, start, len);
    }
    else if (src_type === 'object') {
      if (typeof (src.isSpan) === 'undefined') { // probably an array
        span = new BinarySpan();
        span.init(src, start, len);
      }
      else if (arg.isSpan) {
        var actual_len = src._limit - src._pos - start;
        if (actual_len > len) actual_len = len;
        switch(this._type) {
        case ION.SPAN_TYPE_STRING:
        case ION.SPAN_TYPE_SUB_STRING:
          span = new StringSpan();
          span.init(src._src, src._pos, actual_len);
          break;
        case ION.SPAN_TYPE_BINARY:
        case ION.SPAN_TYPE_SUB_BINARY:
          span = new BinarySpan();
          span.init(src._src, src._pos + start, actual_len);
          break;
        default:
          break;
        }
      }
    }
    if (span === undefined) {
      ION.error("invalid span source");
    }
    return span;
  };

  return makeSpan_impl;
}
)(); // and we call the closure
