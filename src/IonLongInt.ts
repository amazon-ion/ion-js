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

// Ion Value Support class.  This class offers the
//       additional semantics necessary for long integers
//
// ION.LongInt supports:
//
//      numberValue()
//      byteValue() - returns the bytes of the 
//      signum() - return -1, 0, or +1
//      isZero()
//      isNull()
//      isNegativeZero()
//      toString()
//      ION.LongInt.parse(string)
//      ION.LongInt.fromBytes(bytes, sign)
//      ION.LongInt.fromNumber(number)
//      ION.LongInt.ZERO

namespace ION {
  export class LongInt {
    private static readonly zero_bytes: number[] = [0];
    private static readonly zero_string = "0";
    private static readonly byte_base   = 256;
    private static readonly byte_mask   = 0xff;
    private static readonly byte_shift  = 8;
    private static readonly string_base = 10;
    private static readonly char_plus   = '+'.charCodeAt(0);
    private static readonly char_minus  = '-'.charCodeAt(0);
    private static readonly char_zero   = '0'.charCodeAt(0);
    private static readonly char_little_n = 'n'.charCodeAt(0);

    static NULL: LongInt = new LongInt(undefined, undefined, 0);
    static ZERO: LongInt = new LongInt(LongInt.zero_string, LongInt.zero_bytes, 0);

    private s: number;
    private d: string;
    private b: number[];

    constructor(str: string, bytes: number[], signum: number) {
      this.s = signum;
      this.d = str;
      this.b = bytes;
    }

    private static _make_zero_array(len: number) : number[] {
      let bytes = [];
      for (let ii = len; ii > 0; ) {
        ii--;
        bytes[ii] = 0;
      }
      return bytes;
    }

    private static _make_copy(bytes: number[]) : number[] {
      let copy = [];
      for (let idx = bytes.length; idx > 0; ) {
        idx--;
        copy[idx] = bytes[idx];
      }
      return copy;
    }

    isNull() : boolean {
      return (this.b === undefined && this.d === undefined);
    }

    private static _div_d(bytes: number[], digit: number) {
      // destructive in place divide by digit
      // returns the remainder if any (or 0)
      let tmp: number;
      let nd: number;
      let r: number = 0;
      let len: number = bytes.length;
      let idx: number = 0;
  
      if (digit >= LongInt.byte_base) {
        throw new Error("div_d can't divide by " + digit + ", max is one base " + LongInt.byte_base + " digit");
      }
      while (idx < len) {
        nd = bytes[idx] + (r * LongInt.byte_base);
        tmp = Math.floor( nd / digit);
        bytes[idx] = tmp;
        r = nd - (tmp * digit);
        idx++
      }
      return r;
    }

    private static _is_zero_bytes = function(bytes) {
      var ii, len = bytes.length;
      for (ii=len; ii>0; ) {
        ii--;
        if (bytes[ii] > 0) return false;
      }
      return true;
    }

    isZero() : boolean {
      if (this.isNull()) return false;
      if (this.s === 0) return true;
      if (typeof this.b === 'object') return LongInt._is_zero_bytes(this.b);
      return undefined;
    }

    isNegativeZero() : boolean {
      return (this.isZero() && (this.s === -1));
    }

    private _d() : void { // forces creation of base 10 string
      var dec, str, bytes, len, dg, src, dst;
      if (this.d === undefined) {
        if (this.isZero()) {
          this.d = LongInt.zero_string;
        } else {
          bytes = LongInt._make_copy(this.b); // make a copy
          len = bytes.length;
          dec = LongInt._make_zero_array(len * 3);
          dst = 0;
          for (;;) {
            if (LongInt._is_zero_bytes(bytes)) break;
            dg = LongInt._div_d(bytes, LongInt.string_base);
            dec[dst++] = dg;
          }
          for (src = dst; src >= 0; src--) {
            if (dec[src] > 0) break;
          }
          str = ""; // remember this version is for "time to market" not speed !
          for (; src >= 0; src--) {
            str = str + dec[src].toString();
          }
          this.d = str;
        }
      }
    }

    private static _add(bytes: number[], v: number) : void {
      var l = bytes.length, dst, c, t;
      if (v >= LongInt.byte_base) {
        throw new Error("_add can't add " + v + ", max is one base " + LongInt.byte_base + " digit");
      }
      for (dst = l; dst >= 0; ) {  // we do all digits
        dst--;
        t = bytes[dst] + v;
        bytes[dst] = t & LongInt.byte_mask;  // bottom 8 bits are the new digit
        v = t >> LongInt.byte_shift;             // bits above 8 are carry
        if (v === 0) break;     // add until there's nothing left to carry 
      }
      if (v !== 0) {
        throw new Error("this add doesn't support increasing the number of digits");
      }
    }

    private static _mult(bytes: number[], v: number) : void {
      var l = bytes.length, dst, c, t;
      if (v >= LongInt.byte_base) {
        throw new Error("_mult can't add " + v + ", max is one base " + LongInt.byte_base + " digit");
      }
      c = 0;
      for (dst = l; dst >= 0; ) {  // we do all digits
        dst--;
        t = (bytes[dst] * v) + c;
        bytes[dst] = t & LongInt.byte_mask;
        c = t >> LongInt.byte_shift;
      }
      if (c !== 0) {
        throw new Error("this mult doesn't support increasing the number of digits");
      }
    }

    private _b() { // forces creation of base 256 byte array
      var bytes, dec, dst, src, len, dg;
      if (this.b === undefined) {
        if (this.isZero()) {
          this.b = LongInt.zero_bytes;
        }
        else {
          dec = this.d;
          len = dec.length;
          bytes = LongInt._make_zero_array(len);
          src = 0;
          for (;;) {
            dg = dec.charCodeAt(src) - LongInt.char_zero;
            LongInt._add(bytes, dg);
            src++;
            if (src >= len) break;
            LongInt._mult(bytes, LongInt.string_base);
          }
          // we start at 1 because we always want at least 1 byte in the array
          for (dst = 1; dst < len; dst++) {
            if (bytes[dst] > 0) break;
          }
          this.b = bytes.slice(dst);
        }
      }
    }

    numberValue() : number {
      var ii, bytes, n, len;
      if (this.isNull()) {
        return undefined;
      }
      this._b();
      n = 0;
      bytes = this.b;
      len = bytes.length;
      for (ii=0; ii<len; ii++) {
        n = (n * LongInt.byte_base) + bytes[ii]; // not shift so that floating point will work
      }
      return n * this.s; // apply the sign
    }

    toString() : string {
      if (this.isNull()) {
        return undefined;
      }
      this._d();
      return ((this.s < 0) ? "-" : "") + this.d;
    }

    digits() : string {  // used by decimal
      this._d();
      return this.d;
    }

    stringValue() : string {
      return this.toString();
    }

    byteValue() : number[] {
      if (this.isNull()) {
        return undefined;
      }
      this._b();
      // need to address sign !!!
      return LongInt._make_copy(this.b);
    }

    signum() : number {
      return this.s;
    }

    static parse(str: string) : LongInt {
      var t, ii, 
        signum = 1, 
        dec = str.trim();

      switch(dec.charCodeAt(0)) {
      case LongInt.char_little_n:
        if (dec !== "null" && dec !== "null.int") {
          throw new Error("invalid integer format");
        }
        dec = undefined;
        signum = 0;
        break;
      case LongInt.char_minus:
        signum = -1;
        // fall through to plus, then to default
      case LongInt.char_plus:
        dec = dec.slice(1);
        // fall through
      default:
        for (ii=0; ii<dec.length; ii++) { // strip leading zero's
          if (dec.charCodeAt(ii) !== LongInt.char_zero) break;  // '0'
        }
        if (ii < dec.length) { // first trim the leading zero's
          dec = dec.slice(ii);
        }
        for (ii=dec.length; ii>0;) {
          ii--;
          if (ION.is_digit(dec.charCodeAt(ii)) === false) {
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

    static fromBytes(bytes: number[], signum: number) : LongInt {
      var t, ii, len = bytes.length;
      // input array is in order of high to low
      for (ii=0; ii < len; ii++) {
        if (bytes[ii] !== 0) break;
      }
      if (ii >= len) {
        if (signum === 1) signum = 0; // we don't convert a -0, just a +something
        bytes = LongInt.zero_bytes;
      }
      else {
        bytes = bytes.slice(ii);
      }
      t = new LongInt(undefined, bytes, signum);
      return t;
    }

    static fromNumber(n: number) : LongInt {
      var signum, d, t;
      if (isNaN(n)) {
        signum = 0;
      }
      else if (n === 0) {
        signum = (1/n === 1/-0.0) ? -1 : 0;
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
}
