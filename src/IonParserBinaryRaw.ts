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

import JSBI from "jsbi";
import {JsbiSupport} from "./JsbiSupport";
import * as IonBinary from "./IonBinary";
import {decodeUtf8} from "./IonUnicode";
import {Decimal} from "./IonDecimal";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {IVM} from "./IonConstants";
import {BinarySpan} from "./IonSpan";
import {Timestamp, TimestampPrecision} from "./IonTimestamp";
import SignAndMagnitudeInt from "./SignAndMagnitudeInt";
import {JsbiSerde} from "./JsbiSerde";

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

function encode_type_stack(type_, len) {
    var ts = (len << TS_SHIFT) | (type_ & TS_MASK);
    return ts;
}

function decode_type_stack_type(ts) {
    return ts & TS_MASK;
}

function decode_type_stack_len(ts) {
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
    private _ts = [ TB_DATAGRAM ];
    private _in_struct: boolean = false;

    constructor(source : BinarySpan) {
        this._in = source;
    }

    static _readFloatFrom(input: BinarySpan, numberOfBytes) : number {
        let tempBuf : DataView;
        switch(numberOfBytes) {
            case 0:
                return 0.0;
            case 4:
                tempBuf = new DataView(input.chunk(4).buffer);
                return tempBuf.getFloat32(0, false);
            case 8:
                tempBuf = new DataView(input.chunk(8).buffer);
                return tempBuf.getFloat64(0, false);
            case 15:
                return null;
            default:
                throw new Error("Illegal float length: " + numberOfBytes);
        }
    }

    private read_binary_float() : number {
        return ParserBinaryRaw._readFloatFrom(this._in, this._len);
    }

    static _readVarUnsignedIntFrom(input: BinarySpan) : number {
        let numberOfBits = 0;
        let byte;
        let magnitude = 0;

        while (true) {
            byte = input.next();
            magnitude = (magnitude << 7) | (byte & 0x7F);
            numberOfBits += 7;
            if (byte & 0x80) {
                break;
            }
        }

        if(numberOfBits > 31) {
            throw new Error("VarUInt values larger than 31 bits must be read using LongInt.");
        }

        return magnitude;
    }

    private readVarUnsignedInt() : number {
        return ParserBinaryRaw._readVarUnsignedIntFrom(this._in);
    }

    static _readVarSignedIntFrom(input: BinarySpan) : number {
        let v = input.next(), byte;
        let isNegative = v & 0x40;
        let stopBit = v & 0x80;
        v &= 0x3F;  // clears the sign/stop bit
        let bits = 6;
        while(!stopBit) {
            byte = input.next();
            stopBit = byte & 0x80;
            byte &= 0x7F;
            v <<= 7;
            v |= byte;
            bits += 7;
        }
        if(bits > 32) {
            throw new Error("VarInt values larger than 32 bits must be read using LongInt");
        }
        // now we put the sign on, if it's needed
        return isNegative? -v : v;
    }

    private readVarSignedInt() : number {
        return ParserBinaryRaw._readVarSignedIntFrom(this._in);
    }

    static _readSignedIntFrom(input: BinarySpan, numberOfBytes: number) : SignAndMagnitudeInt {
        if (numberOfBytes == 0) {
            return new SignAndMagnitudeInt(JsbiSupport.ZERO);
        }
        let bytes: Uint8Array = input.view(numberOfBytes);
        let isNegative = (bytes[0] & 0x80) == 0x80;
        let numbers = Array.prototype.slice.call(bytes);
        numbers[0] = bytes[0] & 0x7F;
        let magnitude: JSBI = JsbiSerde.fromUnsignedBytes(numbers);
        return new SignAndMagnitudeInt(magnitude, isNegative);
    }

    static _readUnsignedIntFrom(input: BinarySpan, numberOfBytes: number) : JSBI {
        return JsbiSerde.fromUnsignedBytes(Array.prototype.slice.call(input.view(numberOfBytes)));
    }

    private readUnsignedInt() : JSBI {
        return ParserBinaryRaw._readUnsignedIntFrom(this._in, this._len);
    }

    /**
     * Reads a Decimal value from the provided BinarySpan.
     *
     * @param input The BinarySpan to read from.
     * @param numberOfBytes The number of bytes used to represent the Decimal.
     */
    private static readDecimalValueFrom(input: BinarySpan, numberOfBytes: number) : Decimal {
        // Decimal representations have two components: exponent (a VarInt) and coefficient (an Int).
        // The decimal’s value is: coefficient * 10 ^ exponent

        let initialPosition = input.position();

        let exponent: number = ParserBinaryRaw._readVarSignedIntFrom(input);
        let numberOfExponentBytes = input.position() - initialPosition;
        let numberOfCoefficientBytes = numberOfBytes - numberOfExponentBytes;

        let signedInt = ParserBinaryRaw._readSignedIntFrom(input,  numberOfCoefficientBytes);
        let isNegative = signedInt.isNegative;
        let coefficient = isNegative ? JSBI.unaryMinus(signedInt.magnitude) : signedInt.magnitude;
        return Decimal._fromJsbiCoefficient(
            isNegative,
            coefficient,
            exponent
        );
    }

    private read_decimal_value() : Decimal {
        return ParserBinaryRaw.readDecimalValueFrom(this._in, this._len);
    }

    private read_timestamp_value() : Timestamp {
        if (!(this._len > 0)) {
            return null;
        }

        let offset: number;
        let year: number;
        let month: number;
        let day: number;
        let hour: number;
        let minute: number;
        let secondInt: number;
        let fractionalSeconds = Decimal.ZERO;
        let precision = TimestampPrecision.YEAR;

        let end = this._in.position() + this._len;
        offset = this.readVarSignedInt();
        if (this._in.position() < end) {
            year = this.readVarUnsignedInt();
        } else {
            throw new Error('Timestamps must include a year.');
        }
        if (this._in.position() < end) {
            month = this.readVarUnsignedInt();
            precision = TimestampPrecision.MONTH;
        }
        if (this._in.position() < end) {
            day = this.readVarUnsignedInt();
            precision = TimestampPrecision.DAY;
        }
        if (this._in.position() < end) {
            hour = this.readVarUnsignedInt();
            if (this._in.position() >= end) {
                throw new Error('Timestamps with an hour must include a minute.');
            } else {
                minute = this.readVarUnsignedInt();
            }
            precision = TimestampPrecision.HOUR_AND_MINUTE;
        }
        if (this._in.position() < end) {
            secondInt = this.readVarUnsignedInt();
            precision = TimestampPrecision.SECONDS;
        }
        if (this._in.position() < end) {
            let exponent: number = this.readVarSignedInt();
            let coefficient: JSBI = JsbiSupport.ZERO;
            let isNegative = false;
            if (this._in.position() < end) {
                let deserializedSignedInt = ParserBinaryRaw._readSignedIntFrom(this._in, end - this._in.position());
                isNegative = deserializedSignedInt._isNegative;
                coefficient = deserializedSignedInt._magnitude;
            }
            let dec = Decimal._fromJsbiCoefficient(isNegative, coefficient, exponent);
            let [_, fractionStr] = Timestamp._splitSecondsDecimal(dec);
            fractionalSeconds = Decimal.parse(secondInt + '.' + fractionStr);
        }

        let msSinceEpoch = Date.UTC(year, month ? month - 1 : 0, day ? day : 1, hour ? hour : 0, minute ? minute : 0, secondInt ? secondInt : 0, 0);
        msSinceEpoch = Timestamp._adjustMsSinceEpochIfNeeded(year, msSinceEpoch);
        let date = new Date(msSinceEpoch);
        return Timestamp._valueOf(date, offset, fractionalSeconds, precision);
    }

    private read_string_value() : string {
        return decodeUtf8(this._in.chunk(this._len));
    }

    private clear_value() : void {
        this._raw_type = EOF;
        this._curr     = undefined;
        this._a = empty_array;
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
                if (high_nibble(tb) === IonBinary.TB_STRUCT) {
                    // special case of a struct with a length of 1 (which
                    // is otherwise not possible since the minimum value
                    // length is 1 and struct fields have a field name as
                    // well so the min field length is 2 - 1 marks this as
                    // an ordered struct (fields are in fid order)
                    t._len = this.readVarUnsignedInt();
                }
                t._null = false;
                break;
            case IonBinary.LEN_VAR:
                t._null = false;
                t._len = this.readVarUnsignedInt();
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
        rt = high_nibble(tb);//load type
        t.load_length(tb);
        if (rt === IonBinary.TB_ANNOTATION) {
            if (t._len < 1 && t.depth() === 0) {
                rt = t.load_ivm();
            } else {
                rt = t.load_annotations();
            }
        }
        switch (rt) {
            case IonBinary.TB_NULL:
                t._null = true;
                break;
            case IonBinary.TB_BOOL:
                if (t._len === 0 || t._len === 1) {
                    t._curr = t._len === 1;
                    t._len = 0;
                }
                break;
        }
        t._raw_type = rt;
        return rt;
    }

    private load_annotations() {
        let t: ParserBinaryRaw = this;

        var tb, type_, annotation_len;
        if (t._len < 1 && t.depth() === 0) {
            type_ = t.load_ivm();
        } else {
            annotation_len = this.readVarUnsignedInt();
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

    /**
     * Positive integers and negative integers are both encoded as an unsigned integer magnitude.
     * This function will read in the magnitude, leaving it to the caller to set the value's sign as appropriate.
     */
    private _readIntegerMagnitude(): JSBI {
        if (this._len === 0) {
            return JsbiSupport.ZERO;
        }
        return this.readUnsignedInt();
    }

    private load_value() : void {
        if (this._curr != undefined) return;   // current value is already loaded
        if (this.isNull()) return null;
        switch(this._raw_type) {
            case IonBinary.TB_BOOL:
                break;
            case IonBinary.TB_INT:
                this._curr = this._readIntegerMagnitude();
                break;
            case IonBinary.TB_NEG_INT:
                this._curr = JSBI.unaryMinus(this._readIntegerMagnitude());
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
                this._curr = this.readUnsignedInt();
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
            this._fid = this.readVarUnsignedInt();
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

    _getSid() : number {
        this.load_value();
        if (this._raw_type == IonBinary.TB_SYMBOL) {
            return this._curr === undefined ? null : this._curr;
        }
        return null;
    }

    _stringRepresentation() : string {
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
                throw new Error("Cannot convert to string.");//this might cause errors which is good because we want to rat out all undefined behavior masking.
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
                    if (t._null) {
                        return null;
                    }
                    return t._curr;
            }
        }
    }

    byteValue() : Uint8Array {
        switch (this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_CLOB:
            case IonBinary.TB_BLOB:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
            default:
                throw new Error('Current value is not a blob or clob.');
        }
    }

    booleanValue() : boolean {
        switch (this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_BOOL:
                if (this.isNull()) {
                    return null;
                }
                return this._curr;
        }
        throw new Error('Current value is not a Boolean.')
    }

    decimalValue() : Decimal {
        switch (this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_DECIMAL:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
        }
        throw new Error('Current value is not a decimal.');
    }

    bigIntValue() : JSBI {
        switch (this._raw_type) {
            case IonBinary.TB_NULL:
                return null;
            case IonBinary.TB_INT:
            case IonBinary.TB_NEG_INT:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
            default:
                throw new Error('bigIntValue() was called when the current value was not an int.');
        }
    }

    numberValue() : number {
        switch(this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_INT:
            case IonBinary.TB_NEG_INT:
                if(this.isNull()) {
                    return null;
                }
                this.load_value();
                let bigInt: JSBI = this._curr;
                return JsbiSupport.clampToSafeIntegerRange(bigInt);
            case IonBinary.TB_FLOAT:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
            default:
                throw new Error('Current value is not a float or int.');
        }
    }

    stringValue() : string {
        switch (this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_STRING:
            case IonBinary.TB_SYMBOL:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
        }
        throw new Error('Current value is not a string or symbol.');
    }

    timestampValue() : Timestamp {
        switch (this._raw_type) {
            case IonBinary.TB_NULL: return null;
            case IonBinary.TB_TIMESTAMP:
                if (this.isNull()) {
                    return null;
                }
                this.load_value();
                return this._curr;
        }
        throw new Error('Current value is not a timestamp.');
    }
}

