define(["require", "exports", "./IonBinary", "./IonDecimal", "./IonTypes", "./IonConstants", "./IonLongInt", "./IonPrecision", "./IonTimestamp"], function (require, exports, IonBinary, IonDecimal_1, IonTypes_1, IonConstants_1, IonLongInt_1, IonPrecision_1, IonTimestamp_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const DEBUG_FLAG = true;
    function error(msg) {
        throw { message: msg, where: "IonParserBinaryRaw.ts" };
    }
    const EOF = -1;
    const ERROR = -2;
    const TB_UNUSED__ = 15;
    const TB_DATAGRAM = 20;
    const TB_SEXP_CLOSE = 21;
    const TB_LIST_CLOSE = 22;
    const TB_STRUCT_CLOSE = 23;
    function get_ion_type(rt) {
        switch (rt) {
            case IonBinary.TB_NULL: return IonTypes_1.IonTypes.NULL;
            case IonBinary.TB_BOOL: return IonTypes_1.IonTypes.BOOL;
            case IonBinary.TB_INT: return IonTypes_1.IonTypes.INT;
            case IonBinary.TB_NEG_INT: return IonTypes_1.IonTypes.INT;
            case IonBinary.TB_FLOAT: return IonTypes_1.IonTypes.FLOAT;
            case IonBinary.TB_DECIMAL: return IonTypes_1.IonTypes.DECIMAL;
            case IonBinary.TB_TIMESTAMP: return IonTypes_1.IonTypes.TIMESTAMP;
            case IonBinary.TB_SYMBOL: return IonTypes_1.IonTypes.SYMBOL;
            case IonBinary.TB_STRING: return IonTypes_1.IonTypes.STRING;
            case IonBinary.TB_CLOB: return IonTypes_1.IonTypes.CLOB;
            case IonBinary.TB_BLOB: return IonTypes_1.IonTypes.BLOB;
            case IonBinary.TB_SEXP: return IonTypes_1.IonTypes.SEXP;
            case IonBinary.TB_LIST: return IonTypes_1.IonTypes.LIST;
            case IonBinary.TB_STRUCT: return IonTypes_1.IonTypes.STRUCT;
            default: return undefined;
        }
        ;
    }
    const TS_SHIFT = 5;
    const TS_MASK = 0x1f;
    function validate_ts(ts) {
        if (DEBUG_FLAG) {
            if (typeof ts !== 'number'
                || ts < 0
                || ts > 0x30000000) {
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
    const VINT_SHIFT = 7;
    const VINT_MASK = 0x7f;
    const VINT_FLAG = 0x80;
    function high_nibble(tb) {
        return ((tb >> IonBinary.TYPE_SHIFT) & IonBinary.NIBBLE_MASK);
    }
    function low_nibble(tb) {
        return (tb & IonBinary.NIBBLE_MASK);
    }
    const UNICODE_MAX_ONE_BYTE_SCALAR = 0x0000007F;
    const UNICODE_MAX_TWO_BYTE_SCALAR = 0x000007FF;
    const UNICODE_MAX_THREE_BYTE_SCALAR = 0x0000FFFF;
    const UNICODE_MAX_FOUR_BYTE_SCALAR = 0x0010FFFF;
    const UNICODE_THREE_BYTES_OR_FEWER_MASK = 0xFFFF0000;
    const UNICODE_ONE_BYTE_MASK = 0x7F;
    const UNICODE_ONE_BYTE_HEADER = 0x00;
    const UNICODE_TWO_BYTE_MASK = 0x1F;
    const UNICODE_TWO_BYTE_HEADER = 0xC0;
    const UNICODE_THREE_BYTE_HEADER = 0xE0;
    const UNICODE_THREE_BYTE_MASK = 0x0F;
    const UNICODE_FOUR_BYTE_HEADER = 0xF0;
    const UNICODE_FOUR_BYTE_MASK = 0x07;
    const UNICODE_CONTINUATION_BYTE_HEADER = 0x80;
    const UNICODE_CONTINUATION_BYTE_MASK = 0x3F;
    const UNICODE_CONTINUATION_SHIFT = 6;
    const MAXIMUM_UTF16_1_CHAR_CODE_POINT = 0x0000FFFF;
    const SURROGATE_OFFSET = 0x00010000;
    const SURROGATE_MASK = 0xFFFFFC00;
    const HIGH_SURROGATE = 0x0000D800;
    const LOW_SURROGATE = 0x0000DC00;
    const HIGH_SURROGATE_SHIFT = 10;
    function utf8_is_multibyte_char(scalar) {
        var is_multi = ((scalar & UNICODE_ONE_BYTE_MASK) !== UNICODE_ONE_BYTE_HEADER);
        return is_multi;
    }
    function utf8_length_from_first_byte(scalar) {
        switch (scalar >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return 1;
            case 8:
            case 9:
            case 10:
            case 11:
                return 2;
            case 12:
            case 13:
                return 3;
            case 14:
                return 4;
            case 15:
                error("invalid utf8");
        }
    }
    function read_utf8_tail(span, c, len) {
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
    function read_var_unsigned_int(span) {
        var b, v;
        do {
            b = span.next();
            v = (v << 7) | (b & 0x7f);
        } while ((b & 0x80) === 0);
        if (b === EOF)
            undefined;
        return v;
    }
    function read_var_unsigned_int_past(span, pos, limit) {
        var b, v;
        while (pos < limit) {
            b = span.valueAt(pos);
            pos++;
            v = (v << 7) | (b & 0x7f);
        }
        while ((b & 0x80) === 0)
            ;
        if (b === EOF)
            return undefined;
        return v;
    }
    function read_var_signed_int(span) {
        var b, v = 0, shift = 6, is_neg = false;
        b = span.next();
        if ((b & 0x40) !== 0) {
            b = (b & (0x3f | 0x80));
            is_neg = true;
        }
        while ((b & 0x80) === 0) {
            v = (v << shift);
            shift = 7;
            v = v | (b & 0x7f);
            b = span.next();
        }
        if (b === EOF)
            undefined;
        if (shift > 0) {
            v = (v << shift);
        }
        v = v | (b & 0x7f);
        if (is_neg)
            v = -v;
        return v;
    }
    function read_var_signed_longint(span) {
        var b, v = 0, bytes = [], dst = [], bit_count, byte_count, bits_to_copy, to_copy, dst_idx, src_idx, src_offset, dst_offset, is_neg = false;
        b = span.next();
        if ((b & 0x40) !== 0) {
            b = (b & (0x3f | 0x80));
            is_neg = true;
        }
        while ((b & 0x80) === 0) {
            bytes.push(b & 0x7f);
            b = span.next();
        }
        if (b === EOF)
            return undefined;
        bytes.push(b & 0x7f);
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
            if (to_copy > bits_to_copy)
                to_copy = bits_to_copy;
            v = (bytes[src_idx] >> src_offset);
            v = v << dst_offset;
            dst[dst_idx] = (dst[dst_idx] | v) & 0xff;
            dst_offset += to_copy;
            if (dst_offset > 8) {
                dst_offset = 0;
                dst_idx--;
                dst[dst_idx] = 0;
            }
            src_offset += to_copy;
            if (src_offset > 7) {
                src_offset = 0;
                src_idx--;
            }
            bits_to_copy -= to_copy;
        }
        if (bits_to_copy > 0 || src_idx > 0 || dst_idx > 0) {
            error("invalid state");
        }
        return IonLongInt_1.LongInt.fromBytes(bytes, is_neg ? -1 : 1);
    }
    function read_signed_int(span, len) {
        var v = 0, b, is_neg = false;
        if (len < 1)
            return 0;
        b = span.next();
        len--;
        if ((b & 0x80) !== 0) {
            b = (b & 0x7f);
            is_neg = true;
        }
        v = (b & 0xff);
        while (len > 0) {
            b = span.next();
            len--;
            v = v << 8;
            v = v | (b & 0xff);
        }
        if (b === EOF)
            return undefined;
        if (is_neg)
            v = -v;
        return v;
    }
    function read_signed_longint(span, len) {
        var v = [], b, signum = 1;
        if (len < 1)
            return IonLongInt_1.LongInt.ZERO;
        while (len > 0) {
            b = span.next();
            len--;
            v.push(b & 0xff);
        }
        if (b === EOF)
            undefined;
        if (v[0] & 0x80) {
            signum = -1;
            v[0] = v[0] & 0x7f;
        }
        return IonLongInt_1.LongInt.fromBytes(v, signum);
    }
    function read_unsigned_int(span, len) {
        var v = 0, b;
        if (len < 1)
            return 0;
        while (len > 0) {
            b = span.next();
            len--;
            v = v << 8;
            v = v | (b & 0xff);
        }
        if (b === EOF)
            undefined;
        return v;
    }
    function read_unsigned_longint(span, len, signum) {
        var v = [], b;
        if (len < 1)
            throw new Error("no length supplied");
        while (len > 0) {
            b = span.next();
            len--;
            v.push(b & 0xff);
        }
        if (b === EOF)
            return undefined;
        return IonLongInt_1.LongInt.fromBytes(v, signum);
    }
    function read_decimal_value(span, len) {
        var pos, digits, exp, d;
        pos = span.position();
        exp = read_var_signed_longint(span);
        len = len - (span.position() - pos);
        digits = read_signed_longint(span, len);
        d = new IonDecimal_1.Decimal(digits, exp);
        return d;
    }
    function read_timestamp_value(span, len) {
        var v, pos, end, precision, offset, year, month, day, hour, minutes, seconds;
        if (len < 1) {
            precision = IonPrecision_1.Precision.NULL;
        }
        else {
            pos = span.position();
            end = pos + len;
            offset = read_var_signed_int(span);
            for (;;) {
                year = read_var_unsigned_int(span);
                precision = IonPrecision_1.Precision.YEAR;
                if (span.position() >= end)
                    break;
                month = read_var_unsigned_int(span);
                precision = IonPrecision_1.Precision.MONTH;
                if (span.position() >= end)
                    break;
                day = read_var_unsigned_int(span);
                precision = IonPrecision_1.Precision.DAY;
                if (span.position() >= end)
                    break;
                hour = read_var_unsigned_int(span);
                precision = IonPrecision_1.Precision.HOUR_AND_MINUTE;
                if (span.position() >= end)
                    break;
                minutes = read_var_unsigned_int(span);
                if (span.position() >= end)
                    break;
                seconds = read_decimal_value(span, end - span.position());
                precision = IonPrecision_1.Precision.SECONDS;
                break;
            }
        }
        v = new IonTimestamp_1.Timestamp(precision, offset, year, month, day, hour, minutes, seconds);
        return v;
    }
    var from_char_code_fn = String.fromCharCode;
    function read_string_value(span, len) {
        var s, b, char_len, chars = [];
        if (len < 1)
            return "";
        while (len > 0) {
            b = span.next();
            char_len = utf8_length_from_first_byte(b);
            len -= char_len;
            if (char_len > 1) {
                b = read_utf8_tail(span, b, char_len);
                if (b > MAXIMUM_UTF16_1_CHAR_CODE_POINT) {
                    chars.push(((((b - SURROGATE_OFFSET) >> 10) | HIGH_SURROGATE) & 0xffff));
                    b = ((((b - SURROGATE_OFFSET) & 0x3ff) | LOW_SURROGATE) & 0xffff);
                }
            }
            chars.push(b);
        }
        s = from_char_code_fn.apply(String, chars);
        return s;
    }
    const empty_array = [];
    const ivm_sid = IonConstants_1.IVM.sid;
    const ivm_image_0 = IonConstants_1.IVM.binary[0];
    const ivm_image_1 = IonConstants_1.IVM.binary[1];
    const ivm_image_2 = IonConstants_1.IVM.binary[2];
    const ivm_image_3 = IonConstants_1.IVM.binary[3];
    const MAX_BYTES_FOR_INT_IN_NUMBER = 6;
    const ZERO_POINT_ZERO = new Float64Array([0.0]);
    class ParserBinaryRaw {
        constructor(source) {
            this.buf = new ArrayBuffer(8);
            this.buf_as_bytes = new Uint8Array(this.buf);
            this.buf_as_double = new Float64Array(this.buf);
            this._raw_type = EOF;
            this._len = -1;
            this._curr = undefined;
            this._null = false;
            this._fid = -1;
            this._as = -1;
            this._ae = -1;
            this._a = [];
            this._ts = [TB_DATAGRAM];
            this._in_struct = false;
            this._in = source;
        }
        read_binary_float(span, len) {
            var ii;
            if (len === IonBinary.LEN_NULL)
                return undefined;
            if (len === 0)
                return ZERO_POINT_ZERO;
            if (len !== 8)
                error("only 8 byte floats (aka double) is supported");
            for (ii = len; ii > 0;) {
                ii--;
                this.buf_as_double[ii] = span.next() & 0xff;
            }
            return this.buf_as_double;
        }
        clear_value() {
            this._raw_type = EOF;
            this._curr = undefined;
            this._a = empty_array;
            this._as = -1;
            this._null = false;
            this._fid = -1;
            this._len = -1;
        }
        load_length(tb) {
            let t = this;
            t._len = low_nibble(tb);
            switch (t._len) {
                case 1:
                    if (high_nibble(tb) === IonBinary.TB_STRUCT) {
                        t._len = read_var_unsigned_int(t._in);
                    }
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
        load_next() {
            let t = this;
            var rt, tb;
            t._as = -1;
            if (t._in.is_empty()) {
                t.clear_value();
                return undefined;
            }
            tb = t._in.next();
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
        load_annotations() {
            let t = this;
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
        load_ivm() {
            let t = this;
            var span = t._in;
            if (span.next() !== ivm_image_1)
                throw new Error("invalid binary Ion at " + span.position());
            if (span.next() !== ivm_image_2)
                throw new Error("invalid binary Ion at " + span.position());
            if (span.next() !== ivm_image_3)
                throw new Error("invalid binary Ion at " + span.position());
            t._curr = ivm_sid;
            t._len = 0;
            return IonBinary.TB_SYMBOL;
        }
        load_annotation_values() {
            let t = this;
            var a, b, pos, limit, arr;
            if ((pos = t._as) < 0)
                return;
            arr = [];
            limit = t._ae;
            a = 0;
            while (pos < limit) {
                b = t._in.valueAt(pos);
                pos++;
                a = (a << VINT_SHIFT) | (b & VINT_MASK);
                if ((b & VINT_FLAG) !== 0) {
                    arr.push(a);
                    a = 0;
                }
            }
            t._a = arr;
        }
        load_value() {
            let t = this;
            var b, c, len;
            if (t.isNull() || t._curr !== undefined)
                return;
            switch (t._raw_type) {
                case IonBinary.TB_BOOL:
                    c = (t._len === 1) ? true : false;
                    break;
                case IonBinary.TB_INT:
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
                case IonBinary.TB_NEG_INT:
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
                case IonBinary.TB_FLOAT:
                    if (t._len != 8) {
                        error("unsupported floating point type (only 64bit, len of 8, is supported), len = " + t._len);
                    }
                    c = t.read_binary_float(t._in, t._len);
                    break;
                case IonBinary.TB_DECIMAL:
                    if (t._len === 0) {
                        c = IonDecimal_1.Decimal.ZERO;
                    }
                    else {
                        c = read_decimal_value(t._in, t._len);
                    }
                    break;
                case IonBinary.TB_TIMESTAMP:
                    c = read_timestamp_value(t._in, t._len);
                    break;
                case IonBinary.TB_SYMBOL:
                    c = "$" + read_unsigned_int(t._in, t._len).toString();
                    break;
                case IonBinary.TB_STRING:
                    c = read_string_value(t._in, t._len);
                    break;
                case IonBinary.TB_CLOB:
                case IonBinary.TB_BLOB:
                    if (t.isNull())
                        break;
                    len = t._len;
                    c = [];
                    while (len--) {
                        b = t._in.next();
                        c.unshift(b & IonBinary.BYTE_MASK);
                    }
                    break;
                default:
                    break;
            }
            t._curr = c;
        }
        next() {
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
            switch (t._raw_type) {
                case IonBinary.TB_STRUCT:
                case IonBinary.TB_LIST:
                case IonBinary.TB_SEXP:
                    break;
                default:
                    throw new Error("you can only 'stepIn' to a container");
            }
            len = t._in.getRemaining() - t._len;
            ts = encode_type_stack(t._raw_type, len);
            t._ts.push(ts);
            t._in_struct = (t._raw_type === IonBinary.TB_STRUCT);
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
            t._in_struct = (parent_type === IonBinary.TB_STRUCT);
            t.clear_value();
            r = t._in.getRemaining();
            t._in.skip(r);
            t._in.setRemaining(l);
        }
        isNull() {
            return this._null;
        }
        depth() {
            return this._ts.length - 1;
        }
        getFieldId() {
            return this._fid;
        }
        hasAnnotations() {
            return (this._as >= 0);
        }
        getAnnotation(index) {
            var a, t = this;
            if ((t._a === undefined) || (t._a.length === 0)) {
                t.load_annotation_values();
            }
            a = t._a[index];
            return a;
        }
        ionType() {
            return get_ion_type(this._raw_type);
        }
        getValue() {
            throw new Error("E_NOT_IMPL");
        }
        numberValue() {
            var n = undefined, t = this;
            if (!t.isNull()) {
                t.load_value();
                switch (t._raw_type) {
                    case IonBinary.TB_INT:
                    case IonBinary.TB_NEG_INT:
                    case IonBinary.TB_FLOAT:
                    case IonBinary.TB_SYMBOL:
                        n = t._curr;
                        break;
                    case IonBinary.TB_DECIMAL:
                        n = t._curr.getNumber();
                        break;
                    default:
                        break;
                }
            }
            return n;
        }
        stringValue() {
            var s = undefined, t = this;
            switch (t._raw_type) {
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
                    return s;
            }
            if (t.isNull()) {
                s = "null";
                switch (t._raw_type) {
                    case IonBinary.TB_BOOL:
                    case IonBinary.TB_INT:
                    case IonBinary.TB_NEG_INT:
                    case IonBinary.TB_FLOAT:
                    case IonBinary.TB_DECIMAL:
                    case IonBinary.TB_TIMESTAMP:
                    case IonBinary.TB_SYMBOL:
                    case IonBinary.TB_STRING:
                        s = s + "." + t.ionType().name;
                        break;
                }
            }
            else {
                t.load_value();
                switch (t._raw_type) {
                    case IonBinary.TB_BOOL:
                    case IonBinary.TB_INT:
                    case IonBinary.TB_NEG_INT:
                    case IonBinary.TB_DECIMAL:
                    case IonBinary.TB_TIMESTAMP:
                        s = t._curr.toString();
                        break;
                    case IonBinary.TB_FLOAT:
                        s = t.numberValue().toString();
                        if (s.indexof("e") === -1) {
                            s = s + "e0";
                        }
                        break;
                    case IonBinary.TB_STRING:
                        s = t._curr;
                        break;
                }
            }
            return s;
        }
        decimalValue() {
            var n = undefined, t = this;
            if (!t.isNull() && t._raw_type === IonBinary.TB_DECIMAL) {
                t.load_value();
                n = t._curr;
            }
            return n;
        }
        timestampValue() {
            var n = undefined, t = this;
            if (!t.isNull() && t._raw_type === IonBinary.TB_TIMESTAMP) {
                t.load_value();
                n = t._curr;
            }
            return n;
        }
        byteValue() {
            var bytes = undefined, t = this;
            switch (t._raw_type) {
                case IonBinary.TB_CLOB:
                case IonBinary.TB_BLOB:
                    if (t.isNull())
                        break;
                    t.load_value();
                    bytes = t._curr;
                    break;
                default:
                    break;
            }
            return bytes;
        }
        booleanValue() {
            if (this._raw_type === IonBinary.TB_BOOL) {
                return this._curr;
            }
            else {
                return undefined;
            }
        }
    }
    exports.ParserBinaryRaw = ParserBinaryRaw;
});
//# sourceMappingURL=IonParserBinaryRaw.js.map