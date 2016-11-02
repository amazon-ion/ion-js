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

// IonParserBinaryRaw
//
// Handles parsing the Ion from a binary span.
// Returns on any value with value type. The 
//
// members of ParserBinaryRaw:
//    _in    = source span
//    _curr  = current value, only on scalars
//    _type  = binary type from the nibble
//    _len   = length of the unconsumed value
//    _null  = flag for null values (both the null type and other nulls)
//    _fid   = field symbol id if this value is in a struct
//    _as    = start of annotations for this value, or -1 if none
//    _ae    = end of annotations of this value
//    _a     = array of annotation symbol ids (loaded as needed)
//    _ts    = stack (array) of container types, starts with datagram
//
// methods:
//    isNull
//    depth
//    hasAnnotations
//    getAnnotation
//    ionType
//    next
//    stepIn
//    stepOut
//    numberValue
//    stringValue
//    decimalValue
//    timestampValue
//    byteValue 

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonParserBinaryRaw.js",
    msg: "IonParserBinaryRaw.js must follow Ion.js"
  };
}
ION.ParserBinaryRaw = ION.ParserBinaryRaw || (function() 
{
  var
    DEBUG_FLAG = true,
    error = function(msg) {
      ION.errorAt(msg, "IonParserBinaryRaw.js");
    },

    // these type decls (and the get_ion_type function) are cloned in IonBinaryReader.js
    EOF              = -1,  // EOF is end of container, distinct from undefined which is value has been consumed
    ERROR            = -2,
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
    TB_BLOB          = 10,  // 0xa
    TB_LIST          = 11,  // 0xb
    TB_SEXP          = 12,  // 0xc
    TB_STRUCT        = 13,  // 0xd
    TB_ANNOTATION    = 14,  // 0xe
    TB_UNUSED__      = 15,
    TB_DATAGRAM      = 20,  // fake type of the top level
    TB_SEXP_CLOSE    = 21,
    TB_LIST_CLOSE    = 22,
    TB_STRUCT_CLOSE  = 23,

    get_ion_type = function (rt) {
      switch(rt) {
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
      default:               return undefined;
      };
    },
  
    NIBBLE_MASK = 0xf,
    BYTE_MASK =  0xff,
    TYPE_SHIFT =    4,
    BYTE_SHIFT =    8,
    
    TS_SHIFT =      5,
    TS_MASK =    0x1f,
    validate_ts = function(ts) {
      if (DEBUG_FLAG) {
        if (typeof ts !== 'number'
         || ts < 0
         || ts > 0x30000000 // just a big size limit, 30 bits in keeping with the V8 optimization point for local ints
        ) {
          error("Debug fail - encode_type_stack");
        }
      }
    },
    encode_type_stack = function(type, len)
    {
      var ts = (len << TS_SHIFT) | (type & TS_MASK);
      validate_ts(ts);
      return ts;
    },
    decode_type_stack_type = function(ts)
    {
      var type = ts & TS_MASK;
      validate_ts(ts);
      return type;
    },
    decode_type_stack_len = function(ts)
    {
      var len = ts >>> TS_SHIFT;
      validate_ts(ts);
      return len;
    },

    LEN_VAR  =     14,  // 0xe
    LEN_NULL =     15,  // 0xf
    
    VINT_SHIFT =    7,
    VINT_MASK  = 0x7f, 
    VINT_FLAG  = 0x80,
    
    high_nibble = function(tb) {
      return ((tb >> TYPE_SHIFT) & NIBBLE_MASK);
    },
    low_nibble = function(tb) {
      return (tb & NIBBLE_MASK);
    },
    
    
    buf = new ArrayBuffer(8),              // TODO - what about threading?
    buf_as_bytes = new Uint8Array(buf),    //        we could new them locally in normal_float_to_bytes
    buf_as_double = new Float64Array(buf), //        but that seems wasteful. ... hmmm
    
    read_binary_float = function(span, len)
    {
      var ii;
      if (len === LEN_NULL) return undefined;
      if (len === 0) return 0.0;
      if (len !== 8) error("only 8 byte floats (aka double) is supported");
      for (ii=len; ii>0; ) {
        ii--;
        Uint8Array[ii] = span.next() & 0xff;
      }
      return buf_as_double;        
    },
    
    UNICODE_MAX_ONE_BYTE_SCALAR       = 0x0000007F, // 7 bits     =  7 / 1 = 7    bits per byte
    UNICODE_MAX_TWO_BYTE_SCALAR       = 0x000007FF, // 5 + 6 bits = 11 / 2 = 5.50 bits per byte
    UNICODE_MAX_THREE_BYTE_SCALAR     = 0x0000FFFF, // 4 + 6+6    = 16 / 3 = 5.33 bits per byte
    UNICODE_MAX_FOUR_BYTE_SCALAR      = 0x0010FFFF, // 3 + 6+6+6  = 21 / 4 = 5.25 bits per byte
    UNICODE_THREE_BYTES_OR_FEWER_MASK = 0xFFFF0000, // if any bits under the f's are set the scalar is either 4 bytes long, or invalid (negative or too large)
    
    UNICODE_ONE_BYTE_MASK             = 0x7F,       // 8-1 = 7 bits    
    UNICODE_ONE_BYTE_HEADER           = 0x00,       // the high bit is off
    UNICODE_TWO_BYTE_MASK             = 0x1F,       // 8-3 = 5 bits
    UNICODE_TWO_BYTE_HEADER           = 0xC0,       // 8 + 4 = 12 = 0xC0
    UNICODE_THREE_BYTE_HEADER         = 0xE0,       // 8+4+2 = 14 = 0xE0
    UNICODE_THREE_BYTE_MASK           = 0x0F,       // 4 bits
    UNICODE_FOUR_BYTE_HEADER          = 0xF0,       // 8+4+2+1 = 15 = 0xF0
    UNICODE_FOUR_BYTE_MASK            = 0x07,       // 3 bits
    UNICODE_CONTINUATION_BYTE_HEADER  = 0x80,
    UNICODE_CONTINUATION_BYTE_MASK    = 0x3F,       // 6 bits in each continuation char
    UNICODE_CONTINUATION_SHIFT        = 6,

    MAXIMUM_UTF16_1_CHAR_CODE_POINT   = 0x0000FFFF,
    SURROGATE_OFFSET                  = 0x00010000,
    SURROGATE_MASK                    = 0xFFFFFC00,  // 0b 1111 1100 0000 0000
    HIGH_SURROGATE                    = 0x0000D800,  // 0b 1101 1000 0000 0000
    LOW_SURROGATE                     = 0x0000DC00,  // 0b 1101 1100 0000 0000
    HIGH_SURROGATE_SHIFT              = 10,
    
    utf8_is_multibyte_char = function(scalar)
    {
      var is_multi = ((scalar & UNICODE_ONE_BYTE_MASK) !== UNICODE_ONE_BYTE_HEADER);
      return is_multi;
    },
    
    utf8_length_from_first_byte = function(scalar) 
    {
      // shift the top 4 bits to the bottom 
      // these have all the valid alternatives for
      // the first byte of the UTF8 sequence
      switch (scalar >> 4) {  
      case  0: // 0000
      case  1: // 0001
      case  2: // 0010
      case  3: // 0011
      case  4: // 0100
      case  5: // 0101
      case  6: // 0110
      case  7: // 0111
        return 1;
      case  8: // 1000
      case  9: // 1001
      case 10: // 1010
      case 11: // 1011
        return 2;
      case 12: // 1100
      case 13: // 1101
        return 3;
      case 14: // 1110
        return 4;
      case 15: // 1111 n/a (11110 is the first 5 byte value)
        error("invalid utf8");
      }
    },
    
    read_utf8_tail = function(span, c, len)
    {
      switch (len) {
      case 1:
          break;
      case 2:
          c = (c & UNICODE_TWO_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          break;
      case 3:
          c = (c & UNICODE_THREE_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          break;
      case 4:
          c = (c & UNICODE_FOUR_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          c = (c << 7) | ((span.next() & 0xff) & UNICODE_CONTINUATION_BYTE_MASK);
          break;
      default:
          error("invalid UTF8");
      }
      return c;
    },

    read_var_unsigned_int = function(span)
    {
      var b, v;
      
      do {
        b = span.next();
        v = (v << 7) | (b & 0x7f);
      } while ((b & 0x80) === 0);
      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) undefined;

      return v;
    },
    
    read_var_unsigned_int_past = function(span, pos, limit)
    {
      var b, v;
      
      while (pos < limit) {
        b = span.get(pos);
        pos++;
        v = (v << 7) | (b & 0x7f);
      } while ((b & 0x80) === 0);
      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) return undefined;

      return v;
    },
    
    read_var_signed_int = function(span) 
    {
      var b, 
          v = 0, 
          shift = 6,      // the first byte has only 6 bits so if we shift it we shift 6 (7 after than)
          is_neg = false;
      
      b = span.next();
      if ((b & 0x40) !== 0) {
        b = (b & (0x3f | 0x80));  // clears the sign bit
        is_neg = true;
      }
      
      // shift in all but the last byte (we've already read the first)
      while ((b & 0x80) === 0) {
        v = (v << shift);
        shift = 7;              // make sure we get all 7 bits for the 2nd and later bytes
        v = v | (b & 0x7f);
        b = span.next();
      }
      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) undefined;
      
      if (shift > 0) {
        v = (v << shift);
      }
      v = v | (b & 0x7f);
      
      // now we put the sign on, if it's needed
      if (is_neg) v = - v;
      
      return v;
    },
    
    read_var_signed_longint = function(span) 
    {
      var b, 
          v = 0, 
          bytes = [],
          dst = [],
          bit_count, byte_count,
          bits_to_copy, to_copy,
          dst_idx, src_idx,
          src_offset, dst_offset,
          is_neg = false;
      
      b = span.next();
      if ((b & 0x40) !== 0) {
        b = (b & (0x3f | 0x80));  // clears the sign bit
        is_neg = true;
      }
      
      // shift in all but the last byte (we've already read the first)
      while ((b & 0x80) === 0) {
        bytes.push(b & 0x7f);
        b = span.next();
      }
      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) return undefined;
      bytes.push(b & 0x7f);
      
      // now we need to compress the bytes
      bit_count = 6 + (bytes.length - 1) * 7;
      byte_count = Math.floor((bit_count + 1) / 8) + 1;
      
      dst_idx = byte_count - 1;
      src_idx = bytes.length - 1;
      
      src_offset = 0;
      dst_offset = 0;
      
      dst = [];
      dst[dst_idx] = 0;
      bits_to_copy = bit_count;
      
      while (bits_to_copy > 0) {
        to_copy = 7 - src_offset;
        if (to_copy > bits_to_copy) to_copy = bits_to_copy;
        // the next two steps clear the lower bits in src
        v = (bytes[src_idx] >> src_offset);
        v = v << dst_offset;
        dst[dst_idx] = (dst[dst_idx] | v) & 0xff; // we only want the lower 8 bits
        dst_offset += to_copy;
        if (dst_offset > 8) {
          dst_offset = 0;
          dst_idx--;
          dst[dst_idx] = 0
        }
        src_offset += to_copy;
        if (src_offset > 7) {
          src_offset = 0;
          src_idx--;
        }
        bits_to_copy -= to_copy;
      }
      if (bits_to_copy > 0 || src_idx > 0 || dst_idx > 0) {
        // need to test bit lengths of 0, 1, 6, 7, 8, 14, 15, 16, 18, 20, 21
        error("invalid state");
      }
      return new ION._longint.fromBytes(bytes, is_neg ? -1 : 1);
    },
    
    read_signed_int = function(span, len) 
    {
      var v = 0, b, is_neg = false;

      // they have to tell us the length
      if (len < 1) return 0;
      
      // the first byte get special treatment since it holds the sign
      b = span.next();
      len--; // we count the bytes as we read them
      if ((b & 0x80) !== 0) {
        b = (b & 0x7f);
        is_neg = true;
      }
      v = (b & 0xff);
      
      // shift in all but the last byte (we've already read the first)
      while (len > 0) {
        b = span.next(); 
        len--;
        v = v << 8;
        v = v | (b & 0xff);
      }
      
      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) return undefined;

      // now we put the sign on, if it's needed
      if (is_neg) v = - v;
      
      return v;
    },
    
    read_signed_longint = function(span, len) 
    {
      var v = [], b, signum = 1;

      // they have to tell us the length
      if (len < 1) return ION._longint.ZERO;
      
      // shift in all but the last byte (we've already read the first)
      while (len > 0) {
        b = span.next(); 
        len--;
        v.push(b & 0xff);
      }

      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) undefined;
      
      // check the sign
      if (v[0] & 0x80) {
        signum = -1;
        v[0] = v[0] & 0x7f; // remove the sign bit, we don't need it any longer
      }
      
      return ION._longint.fromBytes(v, signum);
    },

    
    read_unsigned_int = function(span, len) 
    {
      var v = 0, b;

      // they have to tell us the length
      if (len < 1) return 0;
      
      // shift in all but the last byte (we've already read the first)
      while (len > 0) {
        b = span.next(); 
        len--;
        v = v << 8;
        v = v | (b & 0xff);
      }

      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) undefined;
      
      return v;
    },
    
    read_unsigned_longint = function(span, len, signum) 
    {
      var v = [], b;

      // they have to tell us the length
      if (len < 1) return 0;
      
      // shift in all but the last byte (we've already read the first)
      while (len > 0) {
        b = span.next(); 
        len--;
        v.push(b & 0xff);
      }

      // if we run off the end the bytes will all by EOF, so we can just check once
      if (b === EOF) undefined;
      
      return ION._longint.fromBytes(v, signum);
    },
   
    read_decimal_value = function(span, len)
    {
      var pos, digits, exp, d;

      // so it's a normal value
      pos = span.position();
      exp = read_var_signed_longint(span);
      
      len = len - (span.position() - pos);
      digits = read_signed_longint(span, len);
      
      d = new ION._decimal(digits, exp);
      
      return d;
    },

    read_timestamp_value = function(span, len)
    {
      var v, pos, end,
          precision, offset, 
          year, month, day, 
          hour, minutes, seconds;

      if (len < 1) {
        precision = ION.precision.NULL
      }
      else {
        pos = span.position();
        end = pos + len;
        offset = read_var_signed_int(span);

        for (;;) { // fake loop to break out of ( in place of goto :) )
          year = read_var_unsigned_int(span);
          precision = ION.precision.YEAR;
          if (span.position() >= end) break;
          
          month = read_var_unsigned_int(span);
          precision = ION.precision.MONTH;
          if (span.position() >= end) break;
          
          day = read_var_unsigned_int(span);
          precision = ION.precision.DAY;
          if (span.position() >= end) break;
          
          hour = read_var_unsigned_int(span);
          precision = ION.precision.HOUR;
          if (span.position() >= end) break;
          
          minutes = read_var_unsigned_int(span);
          precision = ION.precision.MINUTE;
          if (span.position() >= end) break;
          
          seconds = read_decimal_value(span, end - span.position());
          if (seconds.getExponent() >= 0) {
            precision = ION.precision.SECONDS;
            seconds = seconds.numberValue();
          }
          else {
            precision = ION.precision.FRACTIONAL_SECONDS;
          }
          break;
        }
      }   
      v = new ION._timestamp(precision, offset, year, month, day, hour, minutes, seconds);
      return v;
    },
    from_char_code_fn = String.fromCharCode,
    read_string_value = function( span, len )
    {
      var s, b, char_len, chars = [];
      
      if (len < 1) return ""; // avoids an edge case failure in the apply below

      while (len > 0) {
        b = span.next();
        char_len = utf8_length_from_first_byte(b);
        len -= char_len;
        if (char_len > 1) {
          b = read_utf8_tail(span, b, char_len);
          if (b > MAXIMUM_UTF16_1_CHAR_CODE_POINT) {
            chars.push( ((((b - SURROGATE_OFFSET) >> 10) | HIGH_SURROGATE) & 0xffff) );
            b = ((((unicodeScalar - SURROGATE_OFFSET) & 0x3ff) | LOW_SURROGATE) & 0xffff);
          }
        }
        chars.push(b);
      }

      s = from_char_code_fn.apply(String, chars);
      return s;
    },
    
    empty_array = [],
    clear_value = function(t) 
    {
      t._raw_type = EOF;
      t._curr     = undefined;
      t._a        = empty_array;
      t._as       = -1;
      t._null     = false;
      t._fid      = -1;
      t._len      = -1;
    },
    
    load_length = function(t, tb)
    {
      t._len = low_nibble(tb);
      switch(t._len) {
      case 1:
        if (high_nibble(tb) === TB_STRUCT) {
          // special case of a struct with a length of 1 (which
          // is otherwise not possible since the minimum value
          // length is 1 and struct fields have a field name as 
          // well so the min field length is 2 - 1 marks this as 
          // an ordered struct (fields are in fid order)
          t._len = read_var_unsigned_int(t._in);
        }
        t._null = false;
        break;
      case LEN_VAR:
        t._null = false;
        t._len = read_var_unsigned_int(t._in);
        break;
      case LEN_NULL:
        t._null = true;
        t._len = 0;
        break;
      default:
        t._null = false;
        break;
      }
      return;
    },
    
    load_next = function(t) 
    {
      var rt, tb;
      t._as = -1;
      if (t._in.is_empty()) {
        clear_value(t);
        return undefined;
      }
      tb  = t._in.next();
      rt = high_nibble(tb);
      load_length(t, tb);
      if (rt === TB_ANNOTATION) {
        if (t._len < 1 && t.depth() === 0) {
          rt = load_ivm(t);
        }
        else {
          rt = load_annotations(t);
        }
      }
      if (rt === TB_NULL) {
        t._null = true;
      }
      t._raw_type = rt;
      return rt;
    },
    
    load_annotations = function(t) 
    {
      var tb, type, annotation_len;
      if (t._len < 1 && t.depth() === 0) {
          type = load_ivm(t);
      }
      else {
        annotation_len = read_var_unsigned_int(t._in);
        t._as = t._in.position();
        t._in.skip(annotation_len);
        t._ae = t._in.position();
        tb = t._in.next();
        load_length(t, tb);
        type = high_nibble(tb);
      }
      return type;
    },
    
    ivm_sid = ION.IVM.sid,
    ivm_image_0 = ION.IVM.binary[0],
    ivm_image_1 = ION.IVM.binary[1],
    ivm_image_2 = ION.IVM.binary[2],
    ivm_image_3 = ION.IVM.binary[3],
    load_ivm = function(t)
    {
      var span = t._in;
      if (span.next() !== ivm_image_1) error("invalid binary Ion at "+span.position());
      if (span.next() !== ivm_image_2) error("invalid binary Ion at "+span.position());
      if (span.next() !== ivm_image_3) error("invalid binary Ion at "+span.position());
      t._curr = ivm_sid;
      t._len = 0;
      return TB_SYMBOL;
    },
    
    load_annotation_values = function(t)
    {        
      var a, b, pos, limit, arr;
      if ((pos = t._as) < 0) return;  // nothing to do, 
      arr = [];
      limit = t._ae;
      a = 0;
      while (pos < limit) {
        b = t._in.get(pos);
        pos++;
        a = (a << VINT_SHIFT) | (b & VINT_MASK);  // OR in the 7 useful bits
        if ((b & VINT_FLAG) !== 0) {
          // once we have the last byte, add it to our list and start the next
          arr.push(a);
          a = 0;
        }
      }
      t._a = arr;
      return;
    },
    MAX_BYTES_FOR_INT_IN_NUMBER = 6, // = floor(52 /* sig fig bits in number */ / 8)
    load_value = function(t)
    {
      var b, c, len;
      if (t.isNull() || t._curr !== undefined) return;
      switch(t._raw_type) {
      case TB_BOOL:
        c = (t._len === 1) ? true : false;
        break;
      case TB_INT:
        if (t._len === 0) {
          c = 0;
        } 
        else if (t._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
          c = read_unsigned_int(t._in, t._len);
        }
        else {
          c = read_unsigned_longint(t._in, t._len, 1);
        }
        break;
      case TB_NEG_INT:
        if (t._len === 0) {
          c = 0;
        } 
        else if (t._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
          c = -read_unsigned_int(t._in, t._len);
        }
        else {
          c = read_unsigned_longint(t._in, t._len, -1);
        }
        break;
      case TB_FLOAT:
        // only 64 bit float is supported
        if (t._len != 8) {
          error("unsupported floating point type (only 64bit, len of 8, is supported), len = "+t._len);
        }
        c = read_binary_float(t._in, t._len);
        break;
      case TB_DECIMAL:
        if (t._len === 0) {
          c = ION._decimal.ZERO;
        } 
        else {
          c = read_decimal_value(t._in, t._len);
        }
        break;
      case TB_TIMESTAMP:
        c = read_timestamp_value(t._in, t._len);
        break;
      case TB_SYMBOL:
        // TODO: add symbol table look up here !
        c = "$"+read_unsigned_int(t._in, t._len).toString();
        break;
      case TB_STRING:
        c = read_string_value(t._in, t._len);
        break;
      case TB_CLOB:
      case TB_BLOB:
        if (t.isNull()) break;
        len = t._len;
        c = [];
        while(len--) {
          b = t._in.next();
          c.unshift(b & BYTE_MASK);
        }
        break;
      default:
        break;
      }
      t._curr = c;
      return;
    }
    ;
  
  
  
/////////////////////////////////////////////////////////
//
//  Prototype for IonParserBinaryRaw (soon to be) Class
//
/////////////////////////////////////////////////////////

  var  
  ParserBinaryRaw_class = function (source)
  {
    var t = this;
    t._in       = source
    t._raw_type = EOF;
    t._len      = -1;
    t._curr     = undefined;
    t._null     = false;
    t._fid      = -1;
    t._as       = -1;
    t._ae       = -1;
    t._a        = [];
    t._ts       = [ TB_DATAGRAM, ]; // (old _in limit << 4) & container type
  },
  ParserBinaryRaw_impl = 
  {
    next : function () {
      var rt, t = this;
      if (t._curr === undefined && t._len > 0) {
        t._in.skip(t._len);
      }
      else {
        clear_value(t);
      }
      if (t._in_struct) {
        t._fid = read_var_unsigned_int(t._in);
        if (t._fid === undefined) {
          return undefined;
        }
      }
      rt = load_next(t);
      return rt;
    },
    stepIn : function() {
      var len, ts, t = this;
      // _ts : [ T_DATAGRAM ], // (old _in limit << 4) & container type
      switch(t._raw_type) {
      case TB_STRUCT:
      case TB_LIST:
      case TB_SEXP: 
        break;
      default:
        error("you can only 'stepIn' to a container");
      }
      len = t._in.getRemaining() - t._len; // when we stepOut we'll have consumed this value
      ts = encode_type_stack(t._raw_type, len); // (l << TS_SHIFT) | (t._raw_type & TS_MASK);
      t._ts.push(ts);
      t._in_struct = (t._raw_type === TB_STRUCT);
      t._in.setRemaining(t._len);
      clear_value(t);
    },
    stepOut : function() {
      var parent_type, ts, l, r, t = this;
      if (t._ts.length < 2) {
        error("you can't stepOut unless you stepped in");
      }
      ts = t._ts.pop();
      l = decode_type_stack_len(ts);
      parent_type = decode_type_stack_type(t._ts[t._ts.length - 1]);
      t._in_struct = (parent_type === TB_STRUCT);
    clear_value(t);

      // check to see if there is any of the container left in the 
      // input span and skip over it if there is
      r = t._in.getRemaining();
      t._in.skip(r);
      
      // then reset what is remaining (remember we already 
      // subtracted out the length of the just finished container
      t._in.setRemaining(l);
    },
    isNull : function() {
      return this._null;
    },
    depth : function() {
      return this._ts.length - 1;
    },
    getFieldId : function() {
      return this._fid;
    },
    hasAnnotations : function() {
      return (this._as >= 0);
    },
    getAnnotation  : function(index) {
      var a, t = this;
      if ((t._a === undefined) || (t._a.length === 0)) {
        load_annotation_values(t);
      }
      a = t._a[index];
      return a;
    },
    ionType : function() {
      return get_ion_type(this._raw_type);
    },
    getValue : function() { // aka ionValue()
      error("E_NOT_IMPL");
    },
    numberValue : function() 
    {
      var n = undefined, 
          t = this;
      if (!t.isNull()) {
        load_value(t);
        switch(t._raw_type) {
        case TB_INT: 
        case TB_NEG_INT:
        case TB_FLOAT:
        case TB_SYMBOL:
          n = t._curr;
          break;
        case TB_DECIMAL:
          n = t._curr.getNumber();
          break;
        default: 
          break; // return undefined or ION.error("can't convert to number");
        }
      }
      return n;
    },
    stringValue : function() 
    {
      var s = undefined,
          t = this;
      switch(t._raw_type) {
      case TB_NULL: case TB_BOOL: case TB_INT: case TB_NEG_INT: case TB_FLOAT:
      case TB_DECIMAL: case TB_TIMESTAMP: case TB_SYMBOL: case TB_STRING:
        break;
      default: 
        return s; // return undefined or ION.error("can't convert to number");
      }
      if (t.isNull()) {
        s = "null";
        switch(t._raw_type) {
        case TB_BOOL: case TB_INT: case TB_NEG_INT: case TB_FLOAT:
        case TB_DECIMAL: case TB_TIMESTAMP: case TB_SYMBOL: case TB_STRING:
          s = s + "." + t.ionType().name;
          break;
        }
      }
      else {
        load_value(t);
        switch(t._raw_type) {
        case TB_BOOL:
        case TB_INT:
        case TB_NEG_INT:
        case TB_DECIMAL:
        case TB_TIMESTAMP:
          s = t._curr.toString();
          break;
        case TB_FLOAT:
          s = t.numberValue().toString();
          if (s.indexof("e") === -1) {
            s = s + "e0"; // force this to exponent form so we recognize it as binary float
          }
          break;
        case TB_STRING:
          s = t._curr;
          break;
        }
      }
      return s;
    },
    decimalValue : function() 
    {
      var n = undefined, 
          t = this;
      if (!t.isNull() && t._raw_type === TB_DECIMAL) {
        load_value(t);
        n = t._curr;
      }
      return n;
    },
    timestampValue : function() 
    {
      var n = undefined, 
          t = this;
      if (!t.isNull() && t._raw_type === TB_TIMESTAMP) {
        load_value(t);
        n = t._curr;
      }
      return n;
    },
    byteValue : function() 
    {
      var bytes = undefined, t = this;

      switch(t._raw_type) {
      case TB_CLOB:
      case TB_BLOB:
        if (t.isNull()) break;
        load_value(t);
        bytes = t._curr;
        break;
      default: 
        break;
      }
      return bytes;
    },
  };
  ParserBinaryRaw_class.prototype = ParserBinaryRaw_impl;
  ParserBinaryRaw_class.prototype.constructor = ParserBinaryRaw_class;
  return ParserBinaryRaw_class;
})();
