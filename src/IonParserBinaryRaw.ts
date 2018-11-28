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

import * as IonBinary from "./IonBinary";
import { decodeUtf8 } from "./IonUnicode";
import { Decimal } from "./IonDecimal";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IVM } from "./IonConstants";
import { LongInt } from "./IonLongInt";
import { Precision } from "./IonPrecision";
import { BinarySpan } from "./IonSpan";
import { Timestamp } from "./IonTimestamp";

const DEBUG_FLAG = true;

const EOF              = -1;  // EOF is end of container; distinct from undefined which is value has been consumed
const ERROR            = -2;
const TB_UNUSED__      = 15;
const TB_DATAGRAM      = 20;  // fake type of the top level
const TB_SEXP_CLOSE    = 21;
const TB_LIST_CLOSE    = 22;
const TB_STRUCT_CLOSE  = 23;

function get_ion_type(rt : number) : IonType {
  switch(rt) {
    case IonBinary.TB_NULL:          return IonTypes.NULL;
    case IonBinary.TB_BOOL:          return IonTypes.BOOL;
    case IonBinary.TB_INT:           return IonTypes.INT;
    case IonBinary.TB_NEG_INT:       return IonTypes.INT;
    case IonBinary.TB_FLOAT:         return IonTypes.FLOAT;
    case IonBinary.TB_DECIMAL:       return IonTypes.DECIMAL;
    case IonBinary.TB_TIMESTAMP:     return IonTypes.TIMESTAMP;
    case IonBinary.TB_SYMBOL:        return IonTypes.SYMBOL;
    case IonBinary.TB_STRING:        return IonTypes.STRING;
    case IonBinary.TB_CLOB:          return IonTypes.CLOB;
    case IonBinary.TB_BLOB:          return IonTypes.BLOB;
    case IonBinary.TB_SEXP:          return IonTypes.SEXP;
    case IonBinary.TB_LIST:          return IonTypes.LIST;
    case IonBinary.TB_STRUCT:        return IonTypes.STRUCT;
    default:               return undefined;
  };
}

const TS_SHIFT =      5;
const TS_MASK =    0x1f;

function validate_ts(ts) {
  if (DEBUG_FLAG) {
    if (typeof ts !== 'number' || ts < 0 || ts > 0x30000000) throw new Error("Debug fail - encode_type_stack");// just a big size limit, 30 bits in keeping with the V8 optimization point for local ints
  }
}

function encode_type_stack(type_, len) {
  var ts = (len << TS_SHIFT) | (type_ & TS_MASK);
  validate_ts(ts);
  return ts;
}

function decode_type_stack_type(ts) {
  validate_ts(ts);
  return ts & TS_MASK;
}

function decode_type_stack_len(ts) {
  validate_ts(ts);
  return ts >>> TS_SHIFT;
}

const VINT_SHIFT =    7;
const VINT_MASK  = 0x7f;
const VINT_FLAG  = 0x80;

function high_nibble(tb) {
  return ((tb >> IonBinary.TYPE_SHIFT) & IonBinary.NIBBLE_MASK);
}

function low_nibble(tb: number) : number {
  return (tb & IonBinary.NIBBLE_MASK);
}

const empty_array = [];

const ivm_sid = IVM.sid;
const ivm_image_0 = IVM.binary[0];
const ivm_image_1 = IVM.binary[1];
const ivm_image_2 = IVM.binary[2];
const ivm_image_3 = IVM.binary[3];

const MAX_BYTES_FOR_INT_IN_NUMBER = 6; // = floor(52 /* sig fig bits in number */ / 8)

export class ParserBinaryRaw {
  private _in: BinarySpan;
  private _raw_type: number = EOF;
  private _len: number = -1;
  private _curr = undefined;
  private _null: boolean = false;
  private _fid: number = -1;
  private _as: number = -1;
  private _ae: number = -1;
  private _a = [];
  private _ts = [ TB_DATAGRAM ];//this looks sketch af.
  private _in_struct: boolean = false;

  constructor(source : BinarySpan) {
    this._in = source;
  }

  private read_binary_float() : number {
      let tempBuf : DataView;
      switch(this._len){
          case 0:
              return 0.0;
          case 4:
              tempBuf = new DataView(this._in.chunk(4).buffer)
              return tempBuf.getFloat32(0, false);
          case 8:
              tempBuf = new DataView(this._in.chunk(8).buffer)
              return tempBuf.getFloat64(0, false);
          case 15:
              return null;
      }
  }

    private read_var_unsigned_int() : number {
        let tempInt, byte = this._in.next();
        for(tempInt = byte & 0x7F; (byte & 0x80) === 0; byte = this._in.next()) {
            if(byte === EOF) throw new Error("EOF found in variable length unsigned int.");
            tempInt = (tempInt << 7) | (this._in.next() & 0x7F);
        }
        return tempInt;
    }

    private read_var_signed_int() : number {
        let v = 0, shift = 6, is_neg = false;

        let byte = this._in.next();
        if ((byte & 0x40) !== 0) {
            byte = byte & 0xBF;  // clears the sign bit
            is_neg = true;
        }
        while ((byte & 0x80) === 0) {
            v = (v << shift);
            shift = 7;              // make sure we get all 7 bits for the 2nd and later bytes
            v = v | (byte & 0x7f);
            byte = this._in.next();
        }
        // if we run off the end the bytes will all by EOF, so we can just check once
        if (byte === EOF) undefined;

        if (shift > 0) {
            v = (v << shift);
        }
        v = v | (byte & 0x7f);

        // now we put the sign on, if it's needed
        if (is_neg) v = - v;

        return v;
    }

    private readVarInt(signed : boolean){
        let buf = [];
        let sign = 1;
        let byte = 0;
        while(!(byte & 0x80)){
            byte = this._in.next();
            if(byte === EOF) throw new Error("Terminating bit not found.");
            if(signed) {
                if (!(byte & 0x40)) {
                    byte = byte & 0xbf;  // clears the sign bit
                    sign = -1;
                }
                signed = false;
            } else {
                buf.push(byte & 0x3f);
            }
        }
        return LongInt.fromBytes(new Uint8Array(buf), sign);
    }

    private read_var_signed_longint() : LongInt {
        return this.readVarInt(true);
    }

    private read_signed_longint() : LongInt {
        if (this._len < 1) return new LongInt(0);
        let v = new Uint8Array(this._len);
        let initial = this._in.next();
        let signum = initial & 0x80 ? -1 : 1;
        v[0] = initial & 0x7f;
        // shift in all but the last byte (we've already read the first)
        for(let i = 1; i < this._len; i++){
            v[i] = this._in.next();
        }

        return LongInt.fromBytes(v, signum);
    }

    private read_unsigned_int() : number {
        var v = 0, b;

        // they have to tell us the length
        if (this._len < 1) return 0;

        // shift in all but the last byte (we've already read the first)
        while (this._len > 0) {
            b = this._in.next();
            this._len--;
            v = v << 8;
            v = v | (b & 0xff);
        }

        // if we run off the end the bytes will all by EOF, so we can just check once
        if (b === EOF) undefined;

        return v;
    }

    private read_unsigned_longint(signum: number) : LongInt {

        // they have to tell us the length
        if (this._len < 1) throw new Error("no length supplied");
        let v = new Uint8Array(this._len);

        // shift in all but the last byte (we've already read the first)
        for(let i = 0; i < this._len; i++){
            v[i] = this._in.next();
        }

        // if we run off the end the bytes will all by EOF, so we can just check once
        if (v[this._len - 1] === EOF) return undefined;

        return LongInt.fromBytes(v, signum);
    }

    private read_decimal_value() : Decimal {
        var pos, digits, exp, d;

        // so it's a normal value
        pos = this._in.position();//what is this...
        exp = this.read_var_signed_int();
        digits = this.read_signed_longint();
        d = new Decimal(digits, exp);

        return d;
    }

    private read_timestamp_value() : Timestamp {
        let offset = null;
        let timeArray = [null, null, null, null, null, null];
        let precision = 0;
        if (this._len < 1) {
            precision = Precision.NULL
        } else {
            let end = this._in.position() + this._len;
            offset = this.read_var_signed_int();
            while(this._in.position() < end) {
                if(precision  === Precision.SECONDS) {
                    let second = this.read_var_unsigned_int();
                    let exp = this.read_var_signed_int();
                    let coef = this.read_signed_longint();
                    let decimal = new Decimal(coef, exp);
                    //timeArray[precision] = decimal.add();
                } else {
                    timeArray[precision] = this.read_var_unsigned_int();
                    precision++;
                }
            }
        }
        return new Timestamp(precision, offset, timeArray[0], timeArray[1], timeArray[2], timeArray[3], timeArray[4], timeArray[5]);
    }

    private read_string_value() : string {
        return decodeUtf8(this._in.chunk(this._len));
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
        if (high_nibble(tb) === IonBinary.TB_STRUCT) {
          // special case of a struct with a length of 1 (which
          // is otherwise not possible since the minimum value
          // length is 1 and struct fields have a field name as
          // well so the min field length is 2 - 1 marks this as
          // an ordered struct (fields are in fid order)
          t._len = this.read_var_unsigned_int();
        }
        t._null = false;
        break;
      case IonBinary.LEN_VAR:
        t._null = false;
        t._len = this.read_var_unsigned_int();
        break;
      case IonBinary.LEN_NULL:
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
    if (rt === IonBinary.TB_ANNOTATION) {
      if (t._len < 1 && t.depth() === 0) {
        rt = t.load_ivm();
      }
      else {
        rt = t.load_annotations();
      }
    }
    if (rt === IonBinary.TB_NULL) {
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
      annotation_len = this.read_var_unsigned_int();
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
    return IonBinary.TB_SYMBOL;
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
        if (this.isNull()) return null;
        switch(this._raw_type) {
            case IonBinary.TB_BOOL:
                this._curr = this._len === 1;
                break;
            case IonBinary.TB_INT:
                if (this._len === 0) {
                    this._curr = 0;
                } else if (this._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
                    this._curr = this.read_unsigned_int();
                } else {
                    this._curr = this.read_unsigned_longint(1);
                }
                break;
            case IonBinary.TB_NEG_INT:
                if (this._len === 0) {
                    this._curr = 0;
                } else if (this._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
                    this._curr = -this.read_unsigned_int();
                } else {
                    this._curr = this.read_unsigned_longint(-1);
                }
                break;
            case IonBinary.TB_FLOAT:
                this._curr = this.read_binary_float();
                break;
            case IonBinary.TB_DECIMAL:
                if (this._len === 0) {
                    this._curr = Decimal.ZERO;
                } else {
                    this._curr = this.read_decimal_value();
                }
                break;
            case IonBinary.TB_TIMESTAMP:
                this._curr = this.read_timestamp_value();
                break;
            case IonBinary.TB_SYMBOL:

                break;
            case IonBinary.TB_STRING:
                this._curr = this.read_string_value();
                break;
            case IonBinary.TB_CLOB:
            case IonBinary.TB_BLOB:
                if (this.isNull()) break;
                this._curr = this._in.chunk(this._len);
                break;
            default:
                throw new Error('Unexpected type: ' + this._raw_type);
        }
    }

  next() : any {
    if (this._curr === undefined && this._len > 0) {
      this._in.skip(this._len);
    } else {
      this.clear_value();
    }
    if (this._in_struct) {
      this._fid = this.read_var_unsigned_int();
      if (this._fid === undefined) {
        return undefined;
      }
    }
    return this.load_next();
  }

  stepIn() {
    var len, ts, t = this;
    // _ts : [ T_DATAGRAM ], // (old _in limit << 4) & container type
    switch(t._raw_type) {
      case IonBinary.TB_STRUCT:
      case IonBinary.TB_LIST:
      case IonBinary.TB_SEXP:
        break;
      default:
        throw new Error("you can only 'stepIn' to a container");
    }
    len = t._in.getRemaining() - t._len; // when we stepOut we'll have consumed this value
    ts = encode_type_stack(t._raw_type, len); // (l << TS_SHIFT) | (t._raw_type & TS_MASK);
    t._ts.push(ts);
    t._in_struct = (t._raw_type === IonBinary.TB_STRUCT);
    t._in.setRemaining(t._len);
    t.clear_value();
  }

  stepOut() {
    var parent_type, ts, l, r, t = this;
    if (t._ts.length < 2) {
      throw new Error("you can't stepOut unless you stepped in");
    }
    ts = t._ts.pop();
    l = decode_type_stack_len(ts);
    parent_type = decode_type_stack_type(t._ts[t._ts.length - 1]);
    t._in_struct = (parent_type === IonBinary.TB_STRUCT);
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

    getAnnotations() : any {
        var a, t = this;
        if ((t._a === undefined) || (t._a.length === 0)) {
            t.load_annotation_values();
        }
        return t._a;
    }

  getAnnotation(index: number) : any {
    var a, t = this;
    if ((t._a === undefined) || (t._a.length === 0)) {
      t.load_annotation_values();
    }
    return t._a[index];
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
    if (t.isNull()) return null;
    t.load_value();
    switch(t._raw_type) {
        case IonBinary.TB_INT:
        case IonBinary.TB_NEG_INT:
        case IonBinary.TB_FLOAT:
        case IonBinary.TB_SYMBOL:
          return t._curr;
        case IonBinary.TB_DECIMAL:
          return t._curr.getNumber();
        default:
          throw new Error("Cannot convert to number.");//this might cause errors which is good because we want to rat out all undefined behavior masking.
    }
  }

    stringValue() : string {
        let t = this;
        switch(t._raw_type) {
            case IonBinary.TB_NULL:
            case IonBinary.TB_BOOL:
            case IonBinary.TB_INT:
            case IonBinary.TB_NEG_INT:
            case IonBinary.TB_FLOAT:
            case IonBinary.TB_DECIMAL:
            case IonBinary.TB_TIMESTAMP:
            case IonBinary.TB_SYMBOL:
            case IonBinary.TB_STRING:
                break;
            default:
                throw new Error("Cannot convert to number.");//this might cause errors which is good because we want to rat out all undefined behavior masking.
        }
        if (t.isNull()) {
            switch(t._raw_type) {
                case IonBinary.TB_BOOL:
                case IonBinary.TB_INT:
                case IonBinary.TB_NEG_INT:
                case IonBinary.TB_FLOAT:
                case IonBinary.TB_DECIMAL:
                case IonBinary.TB_TIMESTAMP:
                case IonBinary.TB_SYMBOL:
                case IonBinary.TB_STRING:
                    "null." + t.ionType().name;
                    break;
            }
        } else {
            t.load_value();
            switch(t._raw_type) {
                case IonBinary.TB_BOOL:
                case IonBinary.TB_INT:
                case IonBinary.TB_NEG_INT:
                case IonBinary.TB_DECIMAL:
                case IonBinary.TB_TIMESTAMP:
                    return t._curr.toString();
                case IonBinary.TB_FLOAT:
                    let s = t.numberValue().toString();//this is really slow
                    if (s.indexOf("e") === -1) return s + "e0"; // force this to exponent form so we recognize it as binary float
                case IonBinary.TB_STRING:
                    return t._curr;
            }
        }
    }

  decimalValue() : Decimal {
    if(this._raw_type !== IonBinary.TB_DECIMAL) throw new Error('Value not of type decimal.')
    if (this.isNull()) return null;
    this.load_value();
    return this._curr;
  }

  timestampValue() : Timestamp {
    if(this._raw_type !== IonBinary.TB_TIMESTAMP) throw new Error('Value not of type timestamp.')
    if (this.isNull()) return null;
    this.load_value();
    return this._curr;
  }

    byteValue() : Uint8Array {
        switch(this._raw_type) {
            case IonBinary.TB_CLOB:
            case IonBinary.TB_BLOB:
                if (this.isNull()) break;
                this.load_value();
                return this._curr;
            default:
                throw new Error(this._raw_type + " does not support byteValue API.");
        }
    }

  booleanValue() : boolean {
    if (this._raw_type === IonBinary.TB_BOOL) {
      return this._curr;
    } else {
      return undefined;
    }
  }
}
