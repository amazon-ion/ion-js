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

namespace ION {
  const DEBUG_FLAG = true;

  function error(msg: string) {
    throw {message: msg, where: "IonParserBinaryRaw.ts"};
  }

  const EOF              = -1;  // EOF is end of container; distinct from undefined which is value has been consumed
  const ERROR            = -2;
  const TB_NULL          =  0;
  const TB_BOOL          =  1;
  const TB_INT           =  2;
  const TB_NEG_INT       =  3;
  const TB_FLOAT         =  4;
  const TB_DECIMAL       =  5;
  const TB_TIMESTAMP     =  6;
  const TB_SYMBOL        =  7;
  const TB_STRING        =  8;
  const TB_CLOB          =  9;
  const TB_BLOB          = 10;  // 0xa
  const TB_LIST          = 11;  // 0xb
  const TB_SEXP          = 12;  // 0xc
  const TB_STRUCT        = 13;  // 0xd
  const TB_ANNOTATION    = 14;  // 0xe
  const TB_UNUSED__      = 15;
  const TB_DATAGRAM      = 20;  // fake type of the top level
  const TB_SEXP_CLOSE    = 21;
  const TB_LIST_CLOSE    = 22;
  const TB_STRUCT_CLOSE  = 23;

  function get_ion_type(rt : number) : IonType {
    switch(rt) {
      case TB_NULL:          return IonTypes.NULL;
      case TB_BOOL:          return IonTypes.BOOL;
      case TB_INT:           return IonTypes.INT;
      case TB_NEG_INT:       return IonTypes.INT;
      case TB_FLOAT:         return IonTypes.FLOAT;
      case TB_DECIMAL:       return IonTypes.DECIMAL;
      case TB_TIMESTAMP:     return IonTypes.TIMESTAMP;
      case TB_SYMBOL:        return IonTypes.SYMBOL;
      case TB_STRING:        return IonTypes.STRING;
      case TB_CLOB:          return IonTypes.CLOB;
      case TB_BLOB:          return IonTypes.BLOB;
      case TB_SEXP:          return IonTypes.SEXP;
      case TB_LIST:          return IonTypes.LIST;
      case TB_STRUCT:        return IonTypes.STRUCT;
      default:               return undefined;
    };
  }

  const NIBBLE_MASK = 0xf;
  const BYTE_MASK =  0xff;
  const TYPE_SHIFT =    4;
  const BYTE_SHIFT =    8;

  const TS_SHIFT =      5;
  const TS_MASK =    0x1f;

  function validate_ts(ts) {
    if (DEBUG_FLAG) {
      if (typeof ts !== 'number'
       || ts < 0
       || ts > 0x30000000 // just a big size limit, 30 bits in keeping with the V8 optimization point for local ints
      ) {
        throw new Error("Debug fail - encode_type_stack");
      }
    }
  }

  function encode_type_stack(type_, len) {
    var ts = (len << TS_SHIFT) | (type_ & TS_MASK);
    validate_ts(ts);
    return ts;
  }

  function decode_type_stack_type(ts) {
    var type_ = ts & TS_MASK;
    validate_ts(ts);
    return type_;
  }

  function decode_type_stack_len(ts) {
    var len = ts >>> TS_SHIFT;
    validate_ts(ts);
    return len;
  }

  const LEN_VAR  =     14;  // 0xe
  const LEN_NULL =     15;  // 0xf

  const VINT_SHIFT =    7;
  const VINT_MASK  = 0x7f; 
  const VINT_FLAG  = 0x80;

  function high_nibble(tb) {
    return ((tb >> TYPE_SHIFT) & NIBBLE_MASK);
  }

  function low_nibble(tb: number) : number {
    return (tb & NIBBLE_MASK);
  }

  const UNICODE_MAX_ONE_BYTE_SCALAR       = 0x0000007F; // 7 bits     =  7 / 1 = 7    bits per byte
  const UNICODE_MAX_TWO_BYTE_SCALAR       = 0x000007FF; // 5 + 6 bits = 11 / 2 = 5.50 bits per byte
  const UNICODE_MAX_THREE_BYTE_SCALAR     = 0x0000FFFF; // 4 + 6+6    = 16 / 3 = 5.33 bits per byte
  const UNICODE_MAX_FOUR_BYTE_SCALAR      = 0x0010FFFF; // 3 + 6+6+6  = 21 / 4 = 5.25 bits per byte
  const UNICODE_THREE_BYTES_OR_FEWER_MASK = 0xFFFF0000; // if any bits under the f's are set the scalar is either 4 bytes long, or invalid (negative or too large)
  
  const UNICODE_ONE_BYTE_MASK             = 0x7F;       // 8-1 = 7 bits    
  const UNICODE_ONE_BYTE_HEADER           = 0x00;       // the high bit is off
  const UNICODE_TWO_BYTE_MASK             = 0x1F;       // 8-3 = 5 bits
  const UNICODE_TWO_BYTE_HEADER           = 0xC0;       // 8 + 4 = 12 = 0xC0
  const UNICODE_THREE_BYTE_HEADER         = 0xE0;       // 8+4+2 = 14 = 0xE0
  const UNICODE_THREE_BYTE_MASK           = 0x0F;       // 4 bits
  const UNICODE_FOUR_BYTE_HEADER          = 0xF0;       // 8+4+2+1 = 15 = 0xF0
  const UNICODE_FOUR_BYTE_MASK            = 0x07;       // 3 bits
  const UNICODE_CONTINUATION_BYTE_HEADER  = 0x80;
  const UNICODE_CONTINUATION_BYTE_MASK    = 0x3F;       // 6 bits in each continuation char
  const UNICODE_CONTINUATION_SHIFT        = 6;

  const MAXIMUM_UTF16_1_CHAR_CODE_POINT   = 0x0000FFFF;
  const SURROGATE_OFFSET                  = 0x00010000;
  const SURROGATE_MASK                    = 0xFFFFFC00;  // 0b 1111 1100 0000 0000
  const HIGH_SURROGATE                    = 0x0000D800;  // 0b 1101 1000 0000 0000
  const LOW_SURROGATE                     = 0x0000DC00;  // 0b 1101 1100 0000 0000
  const HIGH_SURROGATE_SHIFT              = 10;

  function utf8_is_multibyte_char(scalar : number) : boolean {
    var is_multi = ((scalar & UNICODE_ONE_BYTE_MASK) !== UNICODE_ONE_BYTE_HEADER);
    return is_multi;
  }

  function utf8_length_from_first_byte(scalar: number) : number {
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
  }

  function read_utf8_tail(span: Span, c: number, len: number) : number {
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
  }

  function read_var_unsigned_int(span: Span) : number {
    var b, v;

    do {
      b = span.next();
      v = (v << 7) | (b & 0x7f);
    } while ((b & 0x80) === 0);
    // if we run off the end the bytes will all by EOF, so we can just check once
    if (b === EOF) undefined;

    return v;
  }

  function read_var_unsigned_int_past(span: Span, pos: number, limit: number) : number {
    var b, v;

    while (pos < limit) {
      b = span.valueAt(pos);
      pos++;
      v = (v << 7) | (b & 0x7f);
    } while ((b & 0x80) === 0);
    // if we run off the end the bytes will all by EOF, so we can just check once
    if (b === EOF) return undefined;

    return v;
  }

  function read_var_signed_int(span: Span) : number { 
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
  }

  function read_var_signed_longint(span: Span) : LongInt {
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
    return LongInt.fromBytes(bytes, is_neg ? -1 : 1);
  }

  function read_signed_int(span: Span, len: number) : number { 
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
  }

  function read_signed_longint(span: Span, len: number) : LongInt {
    var v = [], b, signum = 1;

    // they have to tell us the length
    if (len < 1) return LongInt.ZERO;
    
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
    
    return LongInt.fromBytes(v, signum);
  }

  function read_unsigned_int(span: Span, len: number) : number {
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
  }

  function read_unsigned_longint(span: Span, len: number, signum: number) : LongInt {
    var v = [], b;

    // they have to tell us the length
    if (len < 1) throw new Error("no length supplied");
    
    // shift in all but the last byte (we've already read the first)
    while (len > 0) {
      b = span.next(); 
      len--;
      v.push(b & 0xff);
    }

    // if we run off the end the bytes will all by EOF, so we can just check once
    if (b === EOF) return undefined;
    
    return LongInt.fromBytes(v, signum);
  }

  function read_decimal_value(span: Span, len: number) : Decimal {
    var pos, digits, exp, d;

    // so it's a normal value
    pos = span.position();
    exp = read_var_signed_longint(span);
    
    len = len - (span.position() - pos);
    digits = read_signed_longint(span, len);
    
    d = new Decimal(digits, exp);
    
    return d;
  }

  function read_timestamp_value(span: Span, len: number) : Timestamp {
    var v, pos, end,
        precision, offset, 
        year, month, day, 
        hour, minutes, seconds;

    if (len < 1) {
      precision = Precision.NULL
    }
    else {
      pos = span.position();
      end = pos + len;
      offset = read_var_signed_int(span);

      for (;;) { // fake loop to break out of ( in place of goto :) )
        year = read_var_unsigned_int(span);
        precision = Precision.YEAR;
        if (span.position() >= end) break;
        
        month = read_var_unsigned_int(span);
        precision = Precision.MONTH;
        if (span.position() >= end) break;
        
        day = read_var_unsigned_int(span);
        precision = Precision.DAY;
        if (span.position() >= end) break;
        
        hour = read_var_unsigned_int(span);
        precision = Precision.HOUR;
        if (span.position() >= end) break;
        
        minutes = read_var_unsigned_int(span);
        precision = Precision.MINUTE;
        if (span.position() >= end) break;
        
        seconds = read_decimal_value(span, end - span.position());
        if (seconds.getExponent() >= 0) {
          precision = Precision.SECONDS;
          seconds = seconds.numberValue();
        }
        else {
          precision = Precision.FRACTIONAL_SECONDS;
        }
        break;
      }
    }   
    v = new Timestamp(precision, offset, year, month, day, hour, minutes, seconds);
    return v;
  }

  var from_char_code_fn = String.fromCharCode;

  function read_string_value(span: Span, len: number) : string {
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
          b = ((((b - SURROGATE_OFFSET) & 0x3ff) | LOW_SURROGATE) & 0xffff);
        }
      }
      chars.push(b);
    }

    s = from_char_code_fn.apply(String, chars);
    return s;
  }

  const empty_array = [];

  const ivm_sid = IVM.sid;
  const ivm_image_0 = IVM.binary[0];
  const ivm_image_1 = IVM.binary[1];
  const ivm_image_2 = IVM.binary[2];
  const ivm_image_3 = IVM.binary[3];

  const MAX_BYTES_FOR_INT_IN_NUMBER = 6; // = floor(52 /* sig fig bits in number */ / 8)

  const ZERO_POINT_ZERO = new Float64Array([0.0]);

  export class ParserBinaryRaw {
    private buf = new ArrayBuffer(8);                   // TODO - what about threading?
    private buf_as_bytes = new Uint8Array(this.buf);    //        we could new them locally in normal_float_to_bytes
    private buf_as_double = new Float64Array(this.buf); //        but that seems wasteful. ... hmmm

    private _in: Span;
    private _raw_type: number = EOF;
    private _len: number = -1;
    private _curr = undefined;
    private _null: boolean = false;
    private _fid: number = -1;
    private _as: number = -1;
    private _ae: number = -1;
    private _a = [];
    private _ts = [ TB_DATAGRAM ];
    private _in_struct: boolean = false;

    constructor(source: Span) {
      this._in = source;
    }

    private read_binary_float(span: Span, len: number) : Float64Array {
      var ii;
      if (len === LEN_NULL) return undefined;
      if (len === 0) return ZERO_POINT_ZERO;
      if (len !== 8) error("only 8 byte floats (aka double) is supported");
      for (ii=len; ii>0; ) {
        ii--;
        this.buf_as_double[ii] = span.next() & 0xff;
      }
      return this.buf_as_double;
    }

    private clear_value() : void { 
      this._raw_type = EOF;
      this._curr     = undefined;
      this._a        = empty_array;
      this._as       = -1;
      this._null     = false;
      this._fid      = -1;
      this._len      = -1;
    }

    private load_length(tb: number)
    {
      let t: ParserBinaryRaw = this;

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
    }

    private load_next() : number {
      let t: ParserBinaryRaw = this;

      var rt, tb;
      t._as = -1;
      if (t._in.is_empty()) {
        t.clear_value();
        return undefined;
      }
      tb  = t._in.next();
      rt = high_nibble(tb);
      t.load_length(tb);
      if (rt === TB_ANNOTATION) {
        if (t._len < 1 && t.depth() === 0) {
          rt = t.load_ivm();
        }
        else {
          rt = t.load_annotations();
        }
      }
      if (rt === TB_NULL) {
        t._null = true;
      }
      t._raw_type = rt;
      return rt;
    }

    private load_annotations() {
      let t: ParserBinaryRaw = this;

      var tb, type_, annotation_len;
      if (t._len < 1 && t.depth() === 0) {
          type_ = t.load_ivm();
      }
      else {
        annotation_len = read_var_unsigned_int(t._in);
        t._as = t._in.position();
        t._in.skip(annotation_len);
        t._ae = t._in.position();
        tb = t._in.next();
        t.load_length(tb);
        type_ = high_nibble(tb);
      }
      return type_;
    }

    private load_ivm() : number {
      let t: ParserBinaryRaw = this;

      var span = t._in;
      if (span.next() !== ivm_image_1) throw new Error("invalid binary Ion at "+span.position());
      if (span.next() !== ivm_image_2) throw new Error("invalid binary Ion at "+span.position());
      if (span.next() !== ivm_image_3) throw new Error("invalid binary Ion at "+span.position());
      t._curr = ivm_sid;
      t._len = 0;
      return TB_SYMBOL;
    }

    private load_annotation_values() : void {
      let t: ParserBinaryRaw = this;

      var a, b, pos, limit, arr;
      if ((pos = t._as) < 0) return;  // nothing to do, 
      arr = [];
      limit = t._ae;
      a = 0;
      while (pos < limit) {
        b = t._in.valueAt(pos);
        pos++;
        a = (a << VINT_SHIFT) | (b & VINT_MASK);  // OR in the 7 useful bits
        if ((b & VINT_FLAG) !== 0) {
          // once we have the last byte, add it to our list and start the next
          arr.push(a);
          a = 0;
        }
      }
      t._a = arr;
    }

    private load_value() : void {
      let t: ParserBinaryRaw = this;

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
          c = t.read_binary_float(t._in, t._len);
          break;
        case TB_DECIMAL:
          if (t._len === 0) {
            c = Decimal.ZERO;
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
    }

    next() : any {
      var rt, t = this;
      if (t._curr === undefined && t._len > 0) {
        t._in.skip(t._len);
      }
      else {
        t.clear_value();
      }
      if (t._in_struct) {
        t._fid = read_var_unsigned_int(t._in);
        if (t._fid === undefined) {
          return undefined;
        }
      }
      rt = t.load_next();
      return rt;
    }

    stepIn() {
      var len, ts, t = this;
      // _ts : [ T_DATAGRAM ], // (old _in limit << 4) & container type
      switch(t._raw_type) {
        case TB_STRUCT:
        case TB_LIST:
        case TB_SEXP: 
          break;
        default:
          throw new Error("you can only 'stepIn' to a container");
      }
      len = t._in.getRemaining() - t._len; // when we stepOut we'll have consumed this value
      ts = encode_type_stack(t._raw_type, len); // (l << TS_SHIFT) | (t._raw_type & TS_MASK);
      t._ts.push(ts);
      t._in_struct = (t._raw_type === TB_STRUCT);
      t._in.setRemaining(t._len);
      t.clear_value();
    }

    stepOut() {
      var parent_type, ts, l, r, t = this;
      if (t._ts.length < 2) {
        error("you can't stepOut unless you stepped in");
      }
      ts = t._ts.pop();
      l = decode_type_stack_len(ts);
      parent_type = decode_type_stack_type(t._ts[t._ts.length - 1]);
      t._in_struct = (parent_type === TB_STRUCT);
      t.clear_value();

      // check to see if there is any of the container left in the 
      // input span and skip over it if there is
      r = t._in.getRemaining();
      t._in.skip(r);
      
      // then reset what is remaining (remember we already 
      // subtracted out the length of the just finished container
      t._in.setRemaining(l);
    }

    isNull() : boolean {
      return this._null;
    }

    depth() : number {
      return this._ts.length - 1;
    }

    getFieldId() : number {
      return this._fid;
    }

    hasAnnotations() : boolean {
      return (this._as >= 0);
    }

    getAnnotation(index: number) : any {
      var a, t = this;
      if ((t._a === undefined) || (t._a.length === 0)) {
        t.load_annotation_values();
      }
      a = t._a[index];
      return a;
    }

    ionType() : IonType {
      return get_ion_type(this._raw_type);
    }

    getValue() : never { // aka ionValue()
      throw new Error("E_NOT_IMPL");
    }

    numberValue() : number {
      var n = undefined, 
          t = this;
      if (!t.isNull()) {
        t.load_value();
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
    }

    stringValue() : string {
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
        t.load_value();
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
    }

    decimalValue() : Decimal {
      var n = undefined, 
          t = this;
      if (!t.isNull() && t._raw_type === TB_DECIMAL) {
        t.load_value();
        n = t._curr;
      }
      return n;
    }

    timestampValue() : Timestamp {
      var n = undefined, 
          t = this;
      if (!t.isNull() && t._raw_type === TB_TIMESTAMP) {
        t.load_value();
        n = t._curr;
      }
      return n;
    }

    byteValue() : number[] {
      var bytes = undefined, t = this;

      switch(t._raw_type) {
        case TB_CLOB:
        case TB_BLOB:
          if (t.isNull()) break;
          t.load_value();
          bytes = t._curr;
          break;
        default: 
          break;
      }
      return bytes;
    }

    booleanValue() : boolean {
      if (this._raw_type === TB_BOOL) {
        return this._curr; 
      } else {
        return undefined;
      }
    }
  }
}
