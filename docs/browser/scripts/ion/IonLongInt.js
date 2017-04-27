define(["require", "exports", "./IonText", "./IonUtilities"], function (require, exports, IonText_1, IonUtilities_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LongInt {
        constructor(str, bytes, signum) {
            this.s = signum;
            this.d = str;
            this.b = bytes;
        }
        static _make_zero_array(len) {
            let bytes = [];
            for (let ii = len; ii > 0;) {
                ii--;
                bytes[ii] = 0;
            }
            return bytes;
        }
        static _make_copy(bytes) {
            let copy = [];
            for (let idx = bytes.length; idx > 0;) {
                idx--;
                copy[idx] = bytes[idx];
            }
            return copy;
        }
        isNull() {
            return (this.b === undefined && this.d === undefined);
        }
        static _div_d(bytes, digit) {
            let tmp;
            let nd;
            let r = 0;
            let len = bytes.length;
            let idx = 0;
            if (digit >= LongInt.byte_base) {
                throw new Error("div_d can't divide by " + digit + ", max is one base " + LongInt.byte_base + " digit");
            }
            while (idx < len) {
                nd = bytes[idx] + (r * LongInt.byte_base);
                tmp = Math.floor(nd / digit);
                bytes[idx] = tmp;
                r = nd - (tmp * digit);
                idx++;
            }
            return r;
        }
        isZero() {
            if (this.isNull())
                return false;
            if (this.s === 0)
                return true;
            if (!IonUtilities_1.isNullOrUndefined(this.b)) {
                return LongInt._is_zero_bytes(this.b);
            }
            if (!IonUtilities_1.isNullOrUndefined(this.d)) {
                return this.d == '0';
            }
            return undefined;
        }
        isNegativeZero() {
            return (this.isZero() && (this.s === -1));
        }
        _d() {
            var dec, str, bytes, len, dg, src, dst;
            if (IonUtilities_1.isNullOrUndefined(this.d)) {
                if (this.isZero()) {
                    this.d = LongInt.zero_string;
                }
                else {
                    bytes = LongInt._make_copy(this.b);
                    len = bytes.length;
                    dec = LongInt._make_zero_array(len * 3);
                    dst = 0;
                    for (;;) {
                        if (LongInt._is_zero_bytes(bytes))
                            break;
                        dg = LongInt._div_d(bytes, LongInt.string_base);
                        dec[dst++] = dg;
                    }
                    for (src = dst; src >= 0; src--) {
                        if (dec[src] > 0)
                            break;
                    }
                    str = "";
                    for (; src >= 0; src--) {
                        str = str + dec[src].toString();
                    }
                    this.d = str;
                }
            }
        }
        static _add(bytes, v) {
            var l = bytes.length, dst, c, t;
            if (v >= LongInt.byte_base) {
                throw new Error("_add can't add " + v + ", max is one base " + LongInt.byte_base + " digit");
            }
            for (dst = l; dst >= 0;) {
                dst--;
                t = bytes[dst] + v;
                bytes[dst] = t & LongInt.byte_mask;
                v = t >> LongInt.byte_shift;
                if (v === 0)
                    break;
            }
            if (v !== 0) {
                throw new Error("this add doesn't support increasing the number of digits");
            }
        }
        static _mult(bytes, v) {
            var l = bytes.length, dst, c, t;
            if (v >= LongInt.byte_base) {
                throw new Error("_mult can't add " + v + ", max is one base " + LongInt.byte_base + " digit");
            }
            c = 0;
            for (dst = l; dst >= 0;) {
                dst--;
                t = (bytes[dst] * v) + c;
                bytes[dst] = t & LongInt.byte_mask;
                c = t >> LongInt.byte_shift;
            }
            if (c !== 0) {
                throw new Error("this mult doesn't support increasing the number of digits");
            }
        }
        _b() {
            if (IonUtilities_1.isNullOrUndefined(this.b)) {
                if (this.isZero()) {
                    this.b = LongInt.zero_bytes;
                    return;
                }
                let dec = this.d;
                let len = dec.length;
                let bytes = LongInt._make_zero_array(len);
                let src = 0;
                for (;;) {
                    let dg = dec.charCodeAt(src) - LongInt.char_zero;
                    LongInt._add(bytes, dg);
                    src++;
                    if (src >= len) {
                        break;
                    }
                    LongInt._mult(bytes, LongInt.string_base);
                }
                let firstNonzeroDigitIndex = 0;
                for (; firstNonzeroDigitIndex < len; firstNonzeroDigitIndex++) {
                    if (bytes[firstNonzeroDigitIndex] > 0)
                        break;
                }
                this.b = bytes.slice(firstNonzeroDigitIndex);
            }
        }
        numberValue() {
            var ii, bytes, n, len;
            if (this.isNull()) {
                return undefined;
            }
            this._b();
            n = 0;
            bytes = this.b;
            len = bytes.length;
            for (ii = 0; ii < len; ii++) {
                n = (n * LongInt.byte_base) + bytes[ii];
            }
            return n * this.s;
        }
        toString() {
            if (this.isNull()) {
                return undefined;
            }
            this._d();
            return ((this.s < 0) ? "-" : "") + this.d;
        }
        digits() {
            this._d();
            return this.d;
        }
        stringValue() {
            return this.toString();
        }
        byteValue() {
            if (this.isNull()) {
                return undefined;
            }
            this._b();
            return LongInt._make_copy(this.b);
        }
        signum() {
            return this.s;
        }
        static parse(str) {
            var t, ii, signum = 1, dec = str.trim();
            switch (dec.charCodeAt(0)) {
                case LongInt.char_little_n:
                    if (dec !== "null" && dec !== "null.int") {
                        throw new Error("invalid integer format");
                    }
                    dec = undefined;
                    signum = 0;
                    break;
                case LongInt.char_minus:
                    signum = -1;
                case LongInt.char_plus:
                    dec = dec.slice(1);
                default:
                    for (ii = 0; ii < dec.length; ii++) {
                        if (dec.charCodeAt(ii) !== LongInt.char_zero)
                            break;
                    }
                    if (ii < dec.length) {
                        dec = dec.slice(ii);
                    }
                    for (ii = dec.length; ii > 0;) {
                        ii--;
                        if (IonText_1.is_digit(dec.charCodeAt(ii)) === false) {
                            throw new Error("invalid integer");
                        }
                    }
                    if (dec.length < 1) {
                        throw new Error("invalid integer");
                    }
            }
            t = new LongInt(dec, undefined, signum);
            return t;
        }
        static fromBytes(bytes, signum) {
            var t, ii, len = bytes.length;
            for (ii = 0; ii < len; ii++) {
                if (bytes[ii] !== 0)
                    break;
            }
            if (ii >= len) {
                if (signum === 1)
                    signum = 0;
                bytes = LongInt.zero_bytes;
            }
            else {
                bytes = bytes.slice(ii);
            }
            t = new LongInt(undefined, bytes, signum);
            return t;
        }
        static fromNumber(n) {
            var signum, d, t;
            if (isNaN(n)) {
                signum = 0;
            }
            else if (n === 0) {
                signum = (1 / n === 1 / -0.0) ? -1 : 0;
                d = LongInt.zero_string;
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
            t = new LongInt(d, undefined, signum);
            return t;
        }
    }
    LongInt.zero_bytes = [0];
    LongInt.zero_string = "0";
    LongInt.byte_base = 256;
    LongInt.byte_mask = 0xff;
    LongInt.byte_shift = 8;
    LongInt.string_base = 10;
    LongInt.char_plus = '+'.charCodeAt(0);
    LongInt.char_minus = '-'.charCodeAt(0);
    LongInt.char_zero = '0'.charCodeAt(0);
    LongInt.char_little_n = 'n'.charCodeAt(0);
    LongInt.NULL = new LongInt(undefined, undefined, 0);
    LongInt.ZERO = new LongInt(LongInt.zero_string, LongInt.zero_bytes, 0);
    LongInt._is_zero_bytes = function (bytes) {
        var ii, len = bytes.length;
        for (ii = len; ii > 0;) {
            ii--;
            if (bytes[ii] > 0)
                return false;
        }
        return true;
    };
    exports.LongInt = LongInt;
});
//# sourceMappingURL=IonLongInt.js.map