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

// Ion Value Support classes.  These are classes that offer the
//       additional semantics necessary for long integers,
//       decimal, timestamp and lob values.
//
// ION._longint supports:
//
//      numberValue()
//      byteValue() - returns the bytes of the 
//      signum() - return -1, 0, or +1
//      isZero()
//      isNull()
//      isNegativeZero()
//      toString()
//      ION._longint.parse(string)
//      ION._longint.fromBytes(bytes, sign)
//      ION._longint.fromNumber(number)
//      ION._longint.ZERO
  
//    
//    ION._decimal supports:
//      new ION._decimal(value, exponent)
//      getNumber()
//      getDigits()
//      getScale()
//      isNull()
//      isZero()
//      isNegativeZero()
//      isZeroZero()
//      toString()
//      ION._decimal.parse(string)
//      ION._decimal.NULL - constant null value (non-null reference)
//      
//    This decimal is limited to 15 digits of precision but has an
//    exponent range that is +/- 15 digits as well.
//    
//    It also accepts 'e', 'E', 'f' and 'F' as valid starts for
//    the exponent (in addition to 'd' and 'D').
//    
//    If the string is undefined, empty or a null image it returns 
//    the decimal NULL.
//    
//    ION._timestamp supports:
//        new ION._timestamp(precision, offset, year, month, day, hour, minute, seconds)
//        new ION._timestamp() - returns a new null timestamp
//        new ION._timestamp(string) - parses the string to construct the timestamp
//        getEpochMilliseconds() 
//        isNull()
//        toString()
//        ION._timestamp.parse(string)
//        ION._timestamp.NULL - constant null value (non-null reference)
//        
//    The parse function returns a newly minted timestamp. If the string is
//    undefined, empty or a null image it returns the timestamp NULL.
//
// NOTE: it may be valuable to add support for an Ion int to handle
//       arbitrarily large integers (but not for now).  Which we'd use
//       for the decimal type value member if it were here.

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonValueSupport.js",
    msg: "IonValueSupport.js must follow Ion.js"
  };
}

ION._longint = ION._longint || (function() 
{
  var 
  zero_bytes   = [ 0 ],
  zero_string  =  "0",
  longInt_zero = {
    s : 0,            // sign, +1 or -1, or 0
    d : zero_string,  // base 10 digits, aka string, highest to lowest
    b : zero_bytes,   // base 256 digits, aka bytes, highest to lowest
  },
  byte_base   = 256,
  byte_mask   = 0xff,
  byte_shift  = 8,
  string_base = 10,
  char_plus   = '+'.charCodeAt(0),
  char_minus  = '-'.charCodeAt(0),
  char_zero   = '0'.charCodeAt(0),

  _make_zero_array = function(len) {
    var ii, bytes = [];
    for (ii = len; ii > 0; ) {
      ii--;
      bytes[ii] = 0;
    }
    return bytes;
  },
  _make_copy = function(bytes) {
    var idx, copy = [];
    for (idx = bytes.length; idx > 0; ) {
      idx--;
      copy[idx] = bytes[idx];
    }
    return copy;
  },
  
  _isNull = function(t) {
    return (t.b === undefined && t.d === undefined);
  },
  _div_d = function(bytes, digit) {
    // destructive in place divide by digit
    // returns the remainder if any (or 0)
    var tmp, nd,
        r = 0,
        len = bytes.length,
        idx = 0;
    if (digit >= byte_base) {
      fail("div_d can't divide by "+digit+", max is one base "+byte_base+" digit");
    }
    while (idx < len) {
      nd = bytes[idx] + (r * byte_base);
      tmp = Math.floor( nd / digit);
      bytes[idx] = tmp;
      r = nd - (tmp * digit);
      idx++
    }
    return r;
  },
  _is_zero_bytes = function(bytes) {
    var ii, len = bytes.length;
    for (ii=len; ii>0; ) {
      ii--;
      if (bytes[ii] > 0) return false;
    }
    return true;
  },
  isZero = function(t) {
    if (_isNull(t)) return false;
    if (t.s === 0) return true;
    if (typeof t.b === 'object') return _is_zero_bytes(t.b);
    return (t.s === '0');
  },
  isNegativeZero = function(t) {
    return (isZero(t) && (t.s === -1));
  },
  _d = function(t) { // forces creation of base 10 string
    var dec, str, bytes, len, dg, src, dst;
    if (t.d === undefined) {
      if (isZero(t)) {
        t.d = zero_string;
      }
      else {
        bytes = _make_copy(t.b); // make a copy
        len = bytes.length;
        dec = _make_zero_array(len * 3);
        dst = 0;
        for (;;) {
          if (_is_zero_bytes(bytes)) break;
          dg = _div_d(bytes, string_base);
          dec[dst++] = dg;
        }
        for (src = dst; src >= 0; src--) {
          if (dec[src] > 0) break;
        }
        str = ""; // remember this version is for "time to market" not speed !
        for (; src >= 0; src--) {
          str = str + dec[src].toString();
        }
        t.d = str;
      }
    }
  },
  _add = function(bytes, v) {
    var l = bytes.length, dst, c, t;
    if (v >= byte_base) {
      fail("_add can't add "+digit+", max is one base "+byte_base+" digit");
    }
    for (dst = l; dst >= 0; ) {  // we do all digits
      dst--;
      t = bytes[dst] + v;
      bytes[dst] = t & byte_mask;  // bottom 8 bits are the new digit
      v = t >> byte_shift;             // bits above 8 are carry
      if (v === 0) break;     // add until there's nothing left to carry 
    }
    if (v !== 0) {
      fail("this add doesn't support increasing the number of digits");
    }
  },
  _mult = function(bytes, v) {
    var l = bytes.length, dst, c, t;
    if (v >= byte_base) {
      fail("_mult can't add "+digit+", max is one base "+byte_base+" digit");
    }
    c = 0;
    for (dst = l; dst >= 0; ) {  // we do all digits
      dst--;
      t = (bytes[dst] * v) + c;
      bytes[dst] = t & byte_mask;
      c = t >> byte_shift;
    }
    if (c !== 0) {
      fail("this mult doesn't support increasing the number of digits");
    }
  },
  _b = function(t) { // forces creation of base 256 byte array
    var bytes, dec, dst, src, len, dg;
    if (t.b === undefined) {
      if (isZero(t)) {
        t.b = zero_bytes;
      }
      else {
        dec = t.d;
        len = dec.length;
        bytes = _make_zero_array(len);
        src = 0;
        for (;;) {
          dg = dec.charCodeAt(src) - char_zero;
          _add(bytes, dg);
          src++;
          if (src >= len) break;
          _mult(bytes, string_base);
        }
        // we start at 1 because we always want at least 1 byte in the array
        for (dst = 1; dst < len; dst++) {
          if (bytes[dst] > 0) break;
        }
        t.b = bytes.slice(dst);
      }
    }
  },
  numberValue = function(t) {
    var ii, bytes, n, len;
    if (_isNull(t)) return undefined;
    _b(t);
    n = 0;
    bytes = t.b;
    len = bytes.length;
    for (ii=0; ii<len; ii++) {
      n = (n * byte_base) + bytes[ii]; // not shift so that floating point will work
    }
    return n * t.s; // apply the sign
  },
  toString = function(t) {
    if (_isNull(t)) return undefined;
    _d(t);
    return ((t.s < 0) ? "-" : "") + t.d;
  },
  _digitString = function(t) {  // used by decimal
    _d(t);
    return t.d;
  },
  stringValue = function(t) {
    if (_isNull(t)) return undefined;
    return t.toString();
  },
  byteValue = function(t) {
    if (_isNull(t)) return undefined;
    _b(t);
    // need to address sign !!!
    return make_copy(t.b);
  },
  signum = function(t) {
    return t.s;
  },
  
  longInt_impl = { 
    numberValue :   function() { return numberValue(this); },
    stringValue :   function() { return stringValue(this); },
    byteValue :     function() { return byteValue(this); },
    toString :      function() { return toString(this); },
    signum :        function() { return signum(this); },
    isNull :        function() { return _isNull(this); },
    isZero :        function() { return isZero(this); },
    isNegativeZero: function() { return isNegativeZero(this); },
    _digits :       function() { return _digitString(this); },
  },
  LongInt_class = function(str, bytes, signum) {
    var t = this;
    t.s  = signum;  // sign, +1 or -1, or 0
    t.d  = str;     // base 10 digits, aka string
    t.b  = bytes;   // base 256 digits, aka bytes
    return;
  };
  LongInt_class.prototype = longInt_impl;
  LongInt_class.prototype.constructor = LongInt_class;

  LongInt_class["NULL"] = new LongInt_class(undefined, undefined, 0);
  LongInt_class["ZERO"] = new LongInt_class(zero_string, zero_bytes, 0);
  LongInt_class["parse"] = function(str) {
    var t, ii, 
      signum = 1, 
      dec = str.trim();

    switch(dec.charCodeAt(0)) {
    case char_little_n:
      if (dec !== "null" && dec !== "null.int") {
        fail("invalid integer format");
      }
      dec = undefined;
      signum = 0;
      break;
    case char_minus:
      signum = -1;
      // fall through to plus, then to default
    case char_plus:
      dec = dec.slice(1);
      // fall through
    default:
      for (ii=0; ii<d.length; ii++) { // strip leading zero's
        if (dec.charCodeAt(ii) !== char_zero) break;  // '0'
      }
      if (ii < dec.length) { // first trim the leading zero's
        dec = dec.slice(ii);
      }
      for (ii=dec.length; ii>0;) {
        ii--;
        if (ION.is_digit(dec.charCodeAt(ii)) === false) {
          fail("invalid integer");
        }
      }
      if (dec.length < 1) {
        fail("invalid integer");
      }
    }
    t = new LongInt_class(dec, undefined, signum);
    return t;
  };
  LongInt_class["fromBytes"] = function(bytes, signum)
  {
    var t, ii, len = bytes.length;
    // input array is in order of high to low
    for (ii=0; ii < len; ii++) {
      if (bytes[ii] !== 0) break;
    }
    if (ii >= len) {
      if (signum === 1) signum = 0; // we don't convert a -0, just a +something
      bytes = zero_bytes;
    }
    else {
      bytes = bytes.slice(ii);
    }
    t = new LongInt_class(undefined, bytes, signum);
    return t;
  },
  LongInt_class["fromNumber"] = function(n) 
  {
    var signum, d, t;
    if (isNaN(n)) {
      signum = 0;
    }
    else if (n === 0) {
      signum = (1/n === 1/-0.0) ? -1 : 0;
      d = zero_string;
    }
    else {
      if (n < 0) {
        signum = -1;
        n = -n;
      }
      else {
        signum = 1;
      }
      n = Math.floor(n);
      d = n.toString();
    }
    t = new LongInt_class(d, undefined, signum);
    return t;
  };

  return LongInt_class
})();

ION._decimal = ION._decimal || (function ()
{
  var Decimal_class,
  
  _isZero = function(t) {
    if (t.isNull()) return false;
    return t._value.isZero();
  },
  _isNegativeZero = function(t) {
    return (t.signum() === -1) && (t.isZero());
  },
  _isZeroZero = function(t) {
    if (_isZero(t)) {
      // TODO - is this right? negative scale is valid decimal places
      if (t._scale >= -1) {
        return (t.signum() >= 0);
      }
    }
    return false;
  },
  _numberValue = function(t) {
      var n = t._value.numberValue();
      n = n * Math.pow(10, t._exponent);
      return n;
  },
  _stringValue = function(t) {
    var v = t._value,
        s = t._exponent,
        image, decimal_location, ii, zeros, exp;
        
    if (t.isNull()) { // is null
      return "null.decimal";
    }

    image = v._digits();
    if (s < 0) {
      // negative shift - prefix decimal point this may require leading zero's
      if (image.length < s+1) {
        for (ii = s + 1 - image.length; ii>0; ii--) {
          image = "0" + image;
        }
      }
      decimal_location = image.length - s;
      image = image.substr(0, decimal_location) + "." + image.substr(decimal_location);
    }
    else if (s > 0) {
      // positive shift, 
      if (image.length > 1) {
        s = s + image.length - 1;
        image = image.substr(0, 1) + "." + image.substr(1);
      }
      image = image + "d" + s.toString();
    }
    
    if (v.signum() === -1) {
      image = "-" + image;
    }
    return image;
  },
  decimal_impl = 
  {
    _value    : ION._longint.ZERO, // see above
    _exponent : 0,                 // limit 51 bits or +/- 2**51
    
    isNull : function() {
      var isnull = (this._value === undefined);
      return isnull;
    },
    stringValue :     function() { return _toString(this); },
    numberValue :     function() { return _numberValue(this); },
    getDigits :       function() { return this._value; },
    getExponent :     function() { return this._exponent; },
    isZero :          function() { return _isZero(this); },
    isNegativeZero :  function() { return _isNegativeZero(this); },
    isZeroZero :      function() { return _isZeroZero(this); },
    toString :        function() { return _stringValue(this); },
  };
  
  Decimal_class = function(value, exponent) {
    this._value = value;
    this._exponent = exponent;
  };
  Decimal_class.prototype = decimal_impl;
  Decimal_class.prototype.constructor = Decimal_class;
  Decimal_class["NULL"] = new Decimal_class( undefined, undefined );
  Decimal_class["parse"] = function(str)
  {
    var v = undefined, 
        s = 0,
        is_negative = false,
        exp_is_negative = false,
        c, t;

    if (typeof str !== "string" || str.length < 0) {
      bad_decimal("only strings can be parsed");
    }

    c = str.charCodeAt(0);
    switch (c) {
    case 43:              // "+"
      str = str.substr(1);
      break;
    case 45:              //  "-"
      is_negative = true;
      str = str.substr(1);
      break;
    case 46:              //  "."
      c = str.charCodeAt(1);
      if (!ION.is_digit(c)) str = "0" + str;
      break;
    case 110:            // "n"
      if (str === "null" || str === "null.decimal") {
        return ION._decimal.NULL;
      }
      break;
    default:
      break;
    }
    c = str.charCodeAt(0);
    if (!ION.is_digit(c)) bad_decimal("invalid decimal");
    
    // now we really start decoding
    len = str.length;
    past_decimal = false;
    temp = 0;
    exponent = 0;
    for (ii=0; ii<len; ii++) {
      c = str.charCodeAt(ii);
      switch (c) {
      case 46: // decimal point
        past_decimal = true;
        break;
      case 48: case 49: case 50: case 51: case 52:  // '0' - '4'
      case 53: case 54: case 55: case 56: case 57:  // '5' - '9'
        v = v * 10 + c - 48;
        if (past_decimal) {
          exponent--;
        }
        break;
      case  68: case  69: case  70: // D, E, F  - exponent start
      case 100: case 101: case 102: // d, e, f
        if (decimal_location > ii) decimal_location = ii;
        v = temp;  // store this as the value
        temp = 0;  // not switch to adding up the exponent
        // check for an exponent sign
        c = str.charCodeAt(ii+1);
        if (c === 43) {  // '+'
          ii++;
          c = str.charCodeAt(ii+1);
        } 
        else if (c === 45) { // '-'
          exp_is_negative = true;
          ii++;
          c = str.charCodeAt(ii+1);
        } 
        if (!ION.is_digit(c)) {
          ii = len; // we're done - break us out of the for loop
        }
        past_decimal = false; // turn off any scale shifting, we're not in the value part any longer
        break;
      default:
        ii = len; // we're done - break out of the for loop
      }
    }
    if (v === undefined) { 
      // we never saw an exponent character, so our value is still in temp
      v = temp;
    }
    else {
      // we did see an exponent, so v is loaded and we need to adjust 
      // the exponent_shift we built up byte the user exponent
      if (exp_is_negative) {
        exponent -= temp;
      }
      else {
        exponent += temp;
      }
    }
    t = new ION._decimal(v, exponent);
    return t;
  };
  return Decimal_class;
  
})();

ION._timestamp = ION._timestamp || (function()
{
  var 
    MIN_SECONDS =     0,
    MAX_SECONDS =    60,
    MIN_MINUTE =      0,
    MAX_MINUTE =     59,
    MIN_HOUR =        1,
    MAX_HOUR =       23,
    MIN_DAY =         1,
    MAX_DAY =        31,
    MIN_MONTH =       1,
    MAX_MONTH =      12,
    MIN_YEAR =        0,
    MAX_YEAR =     9999,
    MIN_OFFSET = -14*60, // minutes in timezone offset - see W3C timezone definition
    MAX_OFFSET =  14*60,
    DAYS_PER_MONTH = [
      -1,          // months start at 1, so we fill the 0 slot
      31, 29, 31,  // jan, feb, mar
      30, 31, 30,  // apr, may, june
      31, 31, 30,  // jul, aug, sep
      31, 30, 31,  // oct, nov, dec
    ],
    P_EMPTY = -1,
    P_NULL = 0,
    P_YEAR = 1,
    P_MONTH = 2,
    P_DAY = 3,
    P_HOUR = 4,
    P_MINUTE = 5,
    P_SECONDS = 6,
    P_FRACTIONAL_SECONDS = 7,
    
    _to_2_digits = function(v)
    {
      var s;
      if (typeof v !== "number") return "??";   // TODO: what do we want to do about this? (including "don't care")
      s = v.toString();
      switch (s.length) {
      case 0:  return "??";
      case 1:  return "0"+s;
      case 2:  return s;
      default: return s.substr(s.length-2,2);
      }
    },
    to_4_digits = function(v)
    {
      var s;
      if (typeof v !== "number") return "??";   // TODO: what do we want to do about this? (including "don't care")
      s = v.toString();
      switch (s.length) {
      case 0:  return "??";
      case 1:  return "000"+s;
      case 2:  return "00"+s;
      case 3:  return "0"+s;
      case 4:  return s;
      default: return s.substr(s.length-4,4);
      }
    },
    read_digits = function(str, pos, len) {
      var ii, c, v = 0;
      for (ii=pos; ii<pos+len; ii++) {
        c = str.charCodeAt(ii) - 48;
        if (c < 0 && c > 9) return -1;
        v = (v * 10) + c;
      }
      return v;
    },
    S_year        =  1,
    S_month       =  2,
    S_day         =  3,
    S_hour        =  4,
    S_minute      =  5,
    S_seconds     =  6,
    S_frac_secs   =  7,
    S_offset      =  8,
    S_offset_p    =  9,
    S_offset_m    = 10,
    S_offset_mins = 11,
    S_zoffset     = 12,
    time_parser_states = {
    // state {f: field,         p: precision, len,    t: transitions { char : state, ... } }
      year:  {f: S_year,        p: P_YEAR,    len: 4, t: { "T": "off", "-": "month" } },
      month: {f: S_month,       p: P_MONTH,   len: 2, t: { "T": "off", "-": "day" } } ,
      day:   {f: S_day,         p: P_DAY,     len: 2, t: { "T": "hour" } } ,
      hour:  {f: S_hour,        p: -1,        len: 2, t: { ":": "min" } },
      min:   {f: S_minute,      p: P_MINUTE,  len: 2, t: { ":": "secs", "+": "poff", "-": "moff", "Z": "zulu" } },
      secs:  {f: S_seconds,     p: P_SECONDS, len: 2, t: { ".": "frac", "+": "pofft", "-": "moff", "Z": "zulu" } },
      frac:  {f: S_frac_secs,   p: P_SECONDS, len: 2, t: { "+": "poff", "-": "moff", "Z": "zulu" } },
      off:   {f: S_offset,      p: -1,        len: 0, t: { "+": "poff", "-": "moff", "Z": "zulu" } },
      poff:  {f: S_offset_p,    p: -1,        len: 2, t: { ":": "omins" } },
      moff:  {f: S_offset_m,    p: -1,        len: 2, t: { ":": "omins" } },
      omins: {f: S_offset_mins, p: -1,        len: 2, t: { } },
      zulu:  {f: S_zoffset,     p: -1,        len: 0, t: { } },
    },
    SECS_PER_MIN    = 60,
    SECS_PER_HOUR   = 60 * 60,
    SECS_PER_DAY    = 24 * 60 * 60,
    DAYS_TO_MONTH   = (function() {
      var m, d = 0, a = [];
      for (m=1; m<13; m++) {
        a.shift(d);
        d += DAYS_PER_MONTH[m];
      }
      return a;
    })(),
    is_leapyear = function(year) {
      if ((year % 4) > 0) return false; // not divisible by 4, it's not
      if ((year % 100) > 0) return true; // not divisible by 100, (but div by 4), it IS
      return (year % 1000); // 100's also divisible by 1000 ARE otherwise they're not
    },
    days_to_start_of_month = function(month, year)
    {
      var d = DAYS_TO_MONTH[month];
      if (month > 2 && !is_leapyear(year)) d -= 1; // subtract out feb 29th
      return d;
    },
    days_to_start_of_year = function(year)
    {
      var d = year * 365;
      d += Math.floor(year/4);    // all divisible by 4's are leap years
      d -= Math.floor(year/100);  // all 100's are not - take them out
      d += Math.floor(year/1000); // all 1000' are leap years - put them back in
      return d;
    },
    SECONDS_AT_EPOCH_START = (function() {
      // unix epoch 1970-01-01T00:00z
      var d = days_to_start_of_year(1970) * SECS_PER_DAY;
      return d;
    })(),
    is_decimal = function(v) {
      if (typeof v === 'object' && typeof v.getExponent === 'function') {
        return true;
      }
      return false;
    },
    bad_timestamp = function(m)
    {
      if (typeof m === "number") {
        m = "invalid format for timestamp at offset" + m;
      }
      throw { msg: m, where: "IonValueSupport.timestamp.parse" };
    }
  ;
    
  var 
    Timestamp_class,
    _is_valid = function(t)
    {
      var s;
      if (t._p === P_NULL) return true; // null
      
      if_false:for(;;) {
        if (typeof t._offset !== "number" || t._offset < MIN_OFFSET || t._offset > MAX_OFFSET) break if_false;
        switch (t._p) {
        default:
          break if_false;
          
        case P_SECONDS:
        case P_FRACTIONAL_SECONDS:
          if (typeof t._seconds === 'number') {
            s = t._seconds;
          }
          else if (is_decimal(t._seconds)) {
            s = t._seconds.numberValue();
          }
          else {
            break if_false;
          }
          if (s < MIN_SECONDS || s >= MAX_SECONDS) break if_false;
          if (t._p ===  P_SECONDS && s !== Math.floor(s)) break if_false; // precision says no fraction, but there's fraction here
        case P_MINUTE:
          if (typeof t._minute !== "number" || t._minute < MIN_MINUTE || t._minute > MAX_MINUTE) break if_false;
        case P_HOUR:
          if (typeof t._hour !== "number" || t._hour < MIN_HOUR || t._hour > MAX_HOUR) break if_false;
        case P_DAY:
          if (typeof t._day !== "number" || t._day < MIN_DAY || t._day > MAX_DAY) break if_false;
        case P_MONTH:
          if (typeof t._month !== "number" || t._month < MIN_MONTH || t._month > MAX_MONTH) break if_false;
        case P_YEAR:
          if (typeof t._year !== "number" || t._year < MIN_YEAR || t._year > MAX_YEAR) break if_false;
        }

        if (t._p > P_MONTH) {
          // check the days per month - first the general case
          if (t._day > DAYS_PER_MONTH[t._month]) break if_false;

          // now the special case for feb 29th and leap year
          if (t._month === 2 && t._day === 29) {
            if (!is_leapyear(t._year)) break if_false; // not a leap year and they say feb 29th, nope
          }
        }
        return true;
      }
      return false; // we end up here when we "break if_false"
    },
    _milliseconds = function(t) 
    {
      var n, p;
      p = t._p;

      switch(p) {
      case P_NULL:
        return undefined;
      case P_FRACTIONAL_SECONDS:
        n = t._seconds.getNumber(); 
        break;
      case P_SECONDS:
        n = t._seconds;
        break;
      default:
        n = 0;
        break;
      }
      switch(p) {
      case P_FRACTIONAL_SECONDS:
      case P_SECONDS:
      case P_MINUTE:
        n += t._minute * SECS_PER_MIN;
      case P_HOUR:
        n += t._hour * SECS_PER_HOUR;
      case P_DAY:
        n += (t._day - 1) * SECS_PER_DAY;
      case P_MONTH:
        n += days_to_start_of_month(t._month, t._year) * SECS_PER_DAY;
      case P_YEAR:
        n += days_to_start_of_year(t._year) * SECS_PER_DAY;
        break;
      }
      n = n = (t._offset * 60);         // adjust back the offset to get GMT
      n = n - SECONDS_AT_EPOCH_START;   // back up for the epoch
      n = n / 1000;                     // we did say milliseconds
      return n;
    },
    _stringValue = function(t) {
      var o, image = undefined;
      
      switch(t._p) {
      default: throw { msg: "invalid value for timestamp precision", where: "IonValueSupport.timestamp.toString" };
      case P_NULL:
        return "null.timestamp";
      case P_SECONDS:
      case P_FRACTIONAL_SECONDS:
        image = t._seconds.toString();
      case P_MINUTE:
        image = _to_2_digits(t._minute) + (image ? ":" + image : "");
      case P_HOUR:
        image = _to_2_digits(t._hour) + (image ? ":" + image : "");
      case P_DAY:
        image = _to_2_digits(t._day) + (image ? "T" + image : "");
      case P_MONTH:
        image = _to_2_digits(t._month) + (image ? "-" + image : "");
      case P_YEAR:
        if (t._p === P_YEAR) {
          image = to_4_digits(t._year) + "T";
        }
        else if (t._p === P_MONTH) {
          image = to_4_digits(t._year) + "-" + image + "T";
        }
        else {
          image = to_4_digits(t._year) + "-" + image;
        }
      }
      
      // hours : minute (for offset)
      o = t._offset;
      if (t._p > P_DAY || o === undefined) {  // TODO: is this right?
        if (o === undefined) {
          image = image + "Z";
        }
        else {
          if (o < 0) {
            o = -o;
            image = image + "-";
          }
          else {
            image = image + "+";
          }
          image = image + _to_2_digits(Math.floor(o / 60));
          image = image + ":" + _to_2_digits(o - Math.floor(o / 60));
        }
      }
      return image;
    },
    
    timestamp_impl = 
    {
      _year :      0, 
      _month :     0,
      _day :       0,
      _hour :      0,
      _minute :    0,
      _seconds :   0,
      _offset :    0,
      _p :    P_NULL,  // 1==year,  6=seconds, 7=fractional seconds
   
      getEpochMilliseconds : function() { return _milliseconds(this); },
      numberValue          : function() { return _milliseconds(this); },
      toString             : function() { return _stringValue(this); },
      stringValue          : function() { return _stringValue(this); },
      
      isNull : function() {
        return (this._p === P_NULL);
      },      
      getZuluYear : function()
      {
        return (this._p >= P_YEAR) ? this._year : undefined;
      },
      getZuluMonth : function()
      {
        return (this._p >= P_MONTH) ? this._month : undefined;
      },
      getZuluDay : function()
      {
        return (this._p >= P_DAY) ? this._day : undefined;
      },
      getZuluHour : function()
      {
        return (this._p >= P_HOUR) ? this._hour : undefined;
      },
      getZuluMinute : function()
      {
        return (this._p >= P_MINUTE) ? this._minute : undefined;
      },
      getZuluSeconds : function()
      {
        return (this._p >= P_SECONDS) ? this._seconds : undefined;
      },
      getOffset : function()
      {
        return (this._p > P_NULL) ? this._offset : undefined;
      },
      getPrecision : function() {
        return this._p;
      },    
    }
  ;
    
  Timestamp_class = function(precision, offset, 
                             year, month, day, 
                             hour, minute, seconds
                            )
  {
    var t = this;
    if (arguments.length < 1) {
      // null
      t._p = P_NULL;
      return;
    }
    if (arguments.length === 1 && typeof precision == "string") {
      // if precision is a string we'll parse it (and it's also the only argument
      t._p = P_EMPTY;
      ION._timestamp.parse(precision, t);
      return;
    }

    // otherwise the values should be as named
    switch (arguments.length) {
    case 2: break;
    default: // ignore excess argument ??
    case 8: 
      if (typeof seconds === "number" && Math.floor(seconds) === seconds) {
        // we allow whole number seconds to be specified as a number
        // in which case we convert it to a decimal value
        t._seconds = new ION._decimal(ION._longint.fromNumber(seconds), 0);
      }
      else {
        // otherwise we use whatever is passed in and we'll check it in "is_valid"
        t._seconds = seconds;
      }
      // we fall through for all of these
    case 7: t._minute = minute;
    case 6: t._hour = hour;
    case 5: t._day = day;
    case 4: t._month = month;
    case 3: t._year = year;
    }
    t._p = precision;
    t._offset = offset;

    if (!_is_valid(t)) {
      t._p = 0;
      throw { msg: "invalid timestamp initialization", where: "IonValueSupport.timestamp.init" };
    }
  };
  Timestamp_class.prototype = timestamp_impl;
  Timestamp_class.prototype.constructor = Timestamp_class;

  Timestamp_class["NULL"] = new Timestamp_class(P_NULL);
  Timestamp_class["parse"] = function(str, target)
  {
    var t, v, c, state, pos, limit, 
        precision, offset, 
        year, month, day, hour, minute, seconds;
        
    if (target !== undefined && target._p !== P_EMPTY) bad_timestamp("invalid target");
    
    if (typeof str !== "string") bad_timestamp( "only strings get to be parsed" );
    
    if (str.length < 1) return ION._timestamp.NULL;
    if (str.charCodeAt(0) === 110) {  // "n"
      if (str === "null") return ION._timestamp.NULL;
      if (str === "null.timestamp") return ION._timestamp.NULL;
      bad_timestamp(0);
    }
    
    pos = 0;
    state = time_parser_states.year;
    limit = str.length;

    while (pos < limit) {
      if (state.len > 0) {
        v = read_digits(str, pos, state.len);
        if (v < 0) bad_timestamp(pos);
        pos = pos + state.len;
      }
      switch(state.f) {
      case S_year:        year = v;                                 break;
      case S_month:       month = v;                                break;
      case S_day:         day = v;                                  break;
      case S_hour:        hour = v;                                 break;
      case S_minute:      minute = v;                               break;
      case S_seconds:     seconds = v;                              break;
                                       // 1234-67-89T12:45:78.dddd
      case S_frac_secs:   seconds = new decimal(str.substr(17, pos - 17)); break;
      case S_offset:                                                break;
      case S_offset_p:    offset = v * 60;                          break;
      case S_offset_m:    offset = -v * 60;                         break;
      case S_offset_mins: offset += (offset < -0) ? -v : v;         break;
      case S_zoffset:     offset = -0.0;                            break;
      default:            bad_timestamp("invalid internal state");
      }
      if (state.p != -1) {
        precision = state.p;
        if (!(pos < limit)) break;
      }
      c = str.charCodeAt(pos);
      state = state.t[c];
      if (state === undefined) bad_timestamp(pos);
      pos++;
    }
    t = new Timestamp_class(precision, offset, year, month, day, hour, minute, seconds);
    return t;
  };
  
  ION.precision = {
    EMPTY :              P_EMPTY,
    NULL :               P_NULL,
    YEAR :               P_YEAR,
    MONTH :              P_MONTH,
    DAY :                P_DAY,
    HOUR :               P_HOUR,
    MINUTE :             P_MINUTE,
    SECONDS :            P_SECONDS,
    FRACTIONAL_SECONDS : P_FRACTIONAL_SECONDS,
  };
  
  return Timestamp_class;
} )();
          