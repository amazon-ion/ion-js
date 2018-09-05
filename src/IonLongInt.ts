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

import { is_digit } from "./IonText";
import { isNullOrUndefined } from "./IonUtilities";

export class LongInt {
  private static readonly zero_bytes: Uint8Array = new Uint8Array(1);
  private static readonly zero_string = "0";
  private static readonly byte_base   = 256;
  private static readonly byte_mask   = 0xff;
  private static readonly byte_shift  = 8;
  private static readonly string_base = 10;
  private static readonly char_plus   = 0x2b;
  private static readonly char_minus  = 0x2d;
  private static readonly char_zero   = 0x30;
  private static readonly char_little_n = 0x6e;

  static NULL: LongInt = new LongInt(undefined, undefined, 0);
  static ZERO: LongInt = new LongInt(LongInt.zero_string, LongInt.zero_bytes, 0);

  private s : number;
  private d : string;
  private b : Uint8Array;

  constructor(str: string, bytes: Uint8Array, signum: number) {
    this.s = signum;
    this.d = str;
    this.b = bytes;
  }

  isNull() : boolean {
    return (this.b === undefined && this.d === undefined);
  }

  private static _div_d(bytes: Uint8Array, digit: number) {
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
    if (!isNullOrUndefined(this.b)) {
      return LongInt._is_zero_bytes(this.b);
    }
    if (!isNullOrUndefined(this.d)) {
      return this.d === '0';
    }
    return undefined;
  }

  isNegativeZero() : boolean {
    return (this.isZero() && (this.s === -1));
  }

  private _d() : void { // forces creation of base 10 string
    var dec, str, len, dg, src, dst;
    if (isNullOrUndefined(this.d)) {
      if (this.isZero()) {
        this.d = LongInt.zero_string;
      } else {
        let bytes = new Uint8Array(this.b.length);
        bytes.set(this.b); // make a copy
        len = bytes.length;
        dec = new Uint8Array(len * 3);
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

  private static _add(bytes: Uint8Array, v: number) : void {
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

  private static _mult(bytes: Uint8Array, v: number) : void {
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

  private _b() : void { // forces creation of base 256 byte array
    if (isNullOrUndefined(this.b)) {
      if (this.isZero()) {
        this.b = LongInt.zero_bytes;
        return;
      }

      let dec: string = this.d;
      let len: number = dec.length;
      let bytes: Uint8Array = new Uint8Array(len);
      let src: number = 0;
      for (;;) {
        let dg: number = dec.charCodeAt(src) - LongInt.char_zero;
        LongInt._add(bytes, dg);
        src++;
        if (src >= len) {
          break;
        }
        LongInt._mult(bytes, LongInt.string_base);
      }

      // We end at length - 1 because we always want at least 1 byte in the array
      let firstNonzeroDigitIndex: number = 0;
      for (; firstNonzeroDigitIndex < len; firstNonzeroDigitIndex++) {
        if (bytes[firstNonzeroDigitIndex] > 0) break;
      }
      this.b = bytes.slice(firstNonzeroDigitIndex);
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
    if(!this.d) this._d();
    return ((this.s < 0) ? "-" : "") + this.d;
  }

  digits() : string {  // used by decimal
    if(!this.d) this._d();
    return this.d;
  }

  stringValue() : string {
    return this.toString();
  }

    byteValue() : Uint8Array {
        if (this.isNull()) {
            return undefined;
        }
        this._b();
        //TODO need to address sign !!!
        let temp = new Uint8Array(this.b.length);
        temp.set(this.b)
        return temp;
    }

  signum() : number {
    return this.s;
  }

  static parse(str: string) : LongInt {
    var ii, sign = 1, dec = str.trim();

    switch(dec.charCodeAt(0)) {
    case LongInt.char_little_n:
      if (dec !== "null" && dec !== "null.int") {
        throw new Error("invalid integer format");
      }
      dec = undefined;
      sign = 0;
      break;
    case LongInt.char_minus:
      sign = -1;
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
        if (is_digit(dec.charCodeAt(ii)) === false) {
          throw new Error("invalid integer");
        }
      }
      if (dec.length < 1) {
        throw new Error("invalid integer");
      }
    }
    return new LongInt(dec, undefined, sign);
  }

  static fromBytes(bytes: Uint8Array, sign: number) : LongInt {
    return new LongInt(undefined, bytes, sign);
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
    return new LongInt(d, undefined, signum);
  }
}
