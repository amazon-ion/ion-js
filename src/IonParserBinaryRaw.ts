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

import { Decimal } from "./IonDecimal";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IVM } from "./IonConstants";
import { LongInt } from "./IonLongInt";
import { Precision } from "./IonPrecision";
import { Span } from "./IonSpan";
import { Timestamp } from "./IonTimestamp";

const DEBUG_FLAG = true;

function error(msg: string) {
    throw {message: msg, where: "IonParserBinaryRaw.ts"};
}

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

function validate_ts(ts) {// just a big size limit, 30 bits in keeping with the V8 optimization point for local ints
    if (DEBUG_FLAG && (typeof ts !== 'number' || ts < 0 || ts > 0x30000000))
        throw new Error("Debug fail - encode_type_stack");
    return ts;
}

function encode_type_stack(type_, len) {
    return validate_ts((len << TS_SHIFT) | (type_ & TS_MASK));
}

function decode_type_stack_type(ts) {
    return validate_ts(ts & TS_MASK);
}

function decode_type_stack_len(ts) {
    return validate_ts(ts >>> TS_SHIFT);
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
return (scalar & UNICODE_ONE_BYTE_MASK) !== UNICODE_ONE_BYTE_HEADER;
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
            throw new Error("invalid utf8");
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
            throw new Error("invalid UTF8");
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
    if (b === EOF) return undefined;
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
    if (b === EOF) return undefined;

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
    if (b === EOF) return undefined;

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
    } else {
        pos = span.position();
        end = pos + len;
        offset = read_var_signed_int(span);
//this needs to go
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
            precision = Precision.HOUR_AND_MINUTE;
            if (span.position() >= end) break;

            minutes = read_var_unsigned_int(span);
            if (span.position() >= end) break;

            seconds = read_var_unsigned_int(span);
            precision = Precision.SECONDS;
            if (span.position() >= end) break;

            seconds += read_decimal_value(span, end - span.position());
            break;
        }
    }
    return new Timestamp(precision, offset, year, month, day, hour, minutes, seconds);
}

function read_string_value(span: Span, len: number) : string {
    let s, b, char_len, chars = [];

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

    return String.fromCharCode.apply(String, chars);
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
    private _annotations = [];
    private _ts = [ TB_DATAGRAM ];
    private _in_struct: boolean = false;

    constructor(source: Span) {
        this._in = source;
    }

    private read_binary_float(span: Span, len: number) : Float64Array {
        var ii;
        if (len === IonBinary.LEN_NULL) return undefined;
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
        this._annotations        = empty_array;
        this._as       = -1;
        this._null     = false;
        this._fid      = -1;
        this._len      = -1;
    }

    private load_length(tb: number) {
        let t: ParserBinaryRaw = this;

        t._len = low_nibble(tb);
        switch(t._len) {
            case 1:
                if (high_nibble(tb) === IonBinary.TB_STRUCT) t._len = read_var_unsigned_int(t._in);
                // special case of a struct with a length of 1 (which is otherwise not possible since the minimum value
                // length is 1 and struct fields have a field name as well so the min field length is 2 - 1 marks this
                // as an ordered struct (fields are in fid order)
                t._null = false;
                break;
            case IonBinary.LEN_VAR:
                t._null = false;
                t._len = read_var_unsigned_int(t._in);
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
        let rt, tb;
        this._as = -1;
        if (this._in.is_empty()) {
            this.clear_value();
            return undefined;
        }
        tb  = this._in.next();
        rt = high_nibble(tb);
        this.load_length(tb);
        if (rt === IonBinary.TB_ANNOTATION) {
            if (this._len < 1 && this.depth() === 0) {
                rt = this.load_ivm();
            } else {
                rt = this.load_annotations();
            }
        }
        if (rt === IonBinary.TB_NULL) {
            this._null = true;
        }
        this._raw_type = rt;
        return rt;
    }

    private load_annotations() {
        if (this._len < 1 && this.depth() === 0) return this.load_ivm();
        let annotation_len = read_var_unsigned_int(this._in);
        this._as = this._in.position();
        this._in.skip(annotation_len);
        this._ae = this._in.position();
        let tb = this._in.next();
        this.load_length(tb);
        return high_nibble(tb);
    }

    private load_ivm() : number {
        if (this._in.next() !== ivm_image_1) throw new Error("invalid binary Ion at "+this._in.position());
        if (this._in.next() !== ivm_image_2) throw new Error("invalid binary Ion at "+this._in.position());
        if (this._in.next() !== ivm_image_3) throw new Error("invalid binary Ion at "+this._in.position());
        this._curr = ivm_sid;
        this._len = 0;
        return IonBinary.TB_SYMBOL;
    }

    private load_annotation_values() : void { //what does _as < 0 signify? that there are no annotations?
        if (this._as < 0) return;  // nothing to do,
        this._annotations = [];
        let annotation = 0, b;
        for(let pos = this._as; pos < this._ae; pos++) {
            b = this._in.valueAt(pos);
            annotation = (annotation << VINT_SHIFT) | (b & VINT_MASK);  // OR in the 7 useful bits
            if ((b & VINT_FLAG) !== 0) {
                // once we have the last byte, add it to our list and start the next
                this._annotations.push(annotation);
                annotation = 0;
            }
        }
    }

    private load_value() : void {
        if (this.isNull() || this._curr !== undefined) return;//wtf is this, we're masking bugs
        switch(this._raw_type) {
            case IonBinary.TB_BOOL:
                this._curr = (this._len === 1) ? true : false;
                break;
            case IonBinary.TB_INT:
                if (this._len === 0) {
                    this._curr = 0;
                } else if (this._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
                    this._curr = read_unsigned_int(this._in, this._len);
                } else {
                    this._curr = read_unsigned_longint(this._in, this._len, 1);
                }
                break;
            case IonBinary.TB_NEG_INT:
                if (this._len === 0) {
                    this._curr = 0;
                } else if (this._len < MAX_BYTES_FOR_INT_IN_NUMBER) {
                    this._curr = -read_unsigned_int(this._in, this._len);
                } else {
                    this._curr = read_unsigned_longint(this._in, this._len, -1);
                }
                break;
            case IonBinary.TB_FLOAT:
                // only 64 bit float is supported
                if (this._len != 8) throw new Error("unsupported floating point type (only 64bit, len of 8, is supported), len = "+this._len);
                this._curr = this.read_binary_float(this._in, this._len);
                break;
            case IonBinary.TB_DECIMAL:
                if (this._len === 0) {
                    this._curr = Decimal.ZERO;
                } else {
                    this._curr = read_decimal_value(this._in, this._len);
                }
                break;
            case IonBinary.TB_TIMESTAMP:
                this._curr = read_timestamp_value(this._in, this._len);
                break;
            case IonBinary.TB_SYMBOL:
            // TODO: add symbol table look up here !
                this._curr = "$"+read_unsigned_int(this._in, this._len).toString();
                break;
            case IonBinary.TB_STRING:
                this._curr = read_string_value(this._in, this._len);
                break;
            case IonBinary.TB_CLOB:
            case IonBinary.TB_BLOB:
                if (this.isNull()) break;
                let len = this._len;
                let tempCurrent = [];
                while(len--) {
                    tempCurrent.unshift(this._in.next() & IonBinary.BYTE_MASK);
                }
                this._curr = tempCurrent;
                break;
            default:
                throw new Error("Cannot load value from type: " + this._raw_type);
        }
    }

    next() : any {//clear value sounds like
        if (this._curr === undefined && this._len > 0) {
            this._in.skip(this._len);
        } else {
            this.clear_value();
        }
        if (this._in_struct) {
            this._fid = read_var_unsigned_int(this._in);
            if (this._fid === undefined) {
                return undefined;
            }
        }
        return this.load_next();
    }

    isContainer(type : IonBinary.TypeCodes){
        return type === IonBinary.TB_STRUCT || type === IonBinary.TB_LIST || type === IonBinary.TB_SEXP;
    }

    stepIn() : void{
        // _ts : [ T_DATAGRAM ], // (old _in limit << 4) & container type
        if(!this.isContainer(this._raw_type)) throw new Error("you can only 'stepIn' to a container");
        let len = this._in.getRemaining() - this._len; // when we stepOut we'll have consumed this value
        this._ts.push(encode_type_stack(this._raw_type, len));// (l << TS_SHIFT) | (t._raw_type & TS_MASK);
        this._in_struct = (this._raw_type === IonBinary.TB_STRUCT);
        this._in.setRemaining(this._len);
        this.clear_value();
    }

    stepOut() {
        if (this._ts.length < 2) throw new Error("you can't stepOut unless you stepped in");
        let ts = this._ts.pop();
        let length = decode_type_stack_len(ts);
        let parent_type = decode_type_stack_type(this._ts[this._ts.length - 1]);
        this._in_struct = (parent_type === IonBinary.TB_STRUCT);// is this for checking if we need fieldname logic?
        this.clear_value();

        // check to see if there is any of the container left in the
        // input span and skip over it if there is
        this._in.skip(this._in.getRemaining());

        // then reset what is remaining (remember we already
        // subtracted out the length of the just finished container
        this._in.setRemaining(length);
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

    getAnnotation(index: number) : any {//TODO shouldnt need to load annotations ever
        if (!this._annotations) this.load_annotation_values();
        return this._annotations[index];
    }

    ionType() : IonType {
        return get_ion_type(this._raw_type);
    }

    getValue() : never { // aka ionValue()
        throw new Error("E_NOT_IMPL");
    }

    numberValue() : number {
        if(this.isNull())throw new Error("null value cant be converted to number");
        this.load_value();//bug masks lie below needs to be rebuilt
        switch(this._raw_type) {
            case IonBinary.TB_INT:
            case IonBinary.TB_NEG_INT:
            case IonBinary.TB_FLOAT:
            case IonBinary.TB_SYMBOL:
                return this._curr;
            case IonBinary.TB_DECIMAL:
                return this._curr.getNumber();
            default:
                throw new Error("can't convert to number: " + this._raw_type);
        }
    }

    stringValue() : string {
        if(this.isContainer(this._raw_type)) throw new Error("cannot convert container to string.");

        this.load_value();
        if(this._raw_type === IonBinary.TB_STRING || this._raw_type === IonBinary.TB_SYMBOL) {
            if (this.isNull()) return 'null.'+ this.ionType().name;
            return this._curr;
        } else {
            throw new Error("Use the class APIs for non strings.")
        }
    }

    decimalValue() : Decimal {
        if(!this.isNull() && this._raw_type === IonBinary.TB_DECIMAL) {
        this.load_value();
        return this._curr;
        }
    }

    timestampValue() : Timestamp {
    if (this._raw_type !== IonBinary.TB_TIMESTAMP) throw new Error("Not a timestamp: " + this.ionType().name);
    this.load_value();
    return this._curr;
    }

    byteValue() : number[] {
        if (this._raw_type !== IonBinary.TB_BLOB && this._raw_type !== IonBinary.TB_CLOB) throw new Error("Not a byte value: " + this.ionType().name);
        this.load_value();
        return this._curr;
    }

    booleanValue() : boolean {
        if (this._raw_type !== IonBinary.TB_BOOL) throw new Error("Not a boolean value: " + this.ionType().name);
            return this._curr;
    }
}
