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
//       additional semantics necessary for
//       decimal values.
//
//    ION.Decimal supports:
//      new ION.Decimal(value, exponent)
//      getNumber()
//      getDigits()
//      getScale()
//      isNull()
//      isZero()
//      isNegativeZero()
//      isZeroZero()
//      toString()
//      ION.Decimal.parse(string)
//      ION.Decimal.NULL - constant null value (non-null reference)
//      
//    This decimal is limited to 15 digits of precision but has an
//    exponent range that is +/- 15 digits as well.
//    
//    It also accepts 'e', 'E', 'f' and 'F' as valid starts for
//    the exponent (in addition to 'd' and 'D').
//    
//    If the string is undefined, empty or a null image it returns 
//    the decimal NULL.

namespace ION {
  export class Decimal {
    public static readonly NULL: Decimal = new Decimal(undefined, undefined);

    private _value: LongInt;
    private _exponent: number;

    constructor(value: LongInt, exponent: number) {
      this._value = value;
      this._exponent = exponent;
    }

    isZero() : boolean {
      if (this.isNull()) return false;
      return this._value.isZero();
    }

    isNegativeZero() : boolean {
      return (this._value.signum() === -1) && (this.isZero());
    }

    isZeroZero() : boolean {
      if (this.isZero()) {
        // TODO - is this right? negative scale is valid decimal places
        if (this._exponent >= -1) {
          return (this._value.signum() >= 0);
        }
      }
      return false;
    }

    numberValue(): number {
        var n = this._value.numberValue();
        n = n * Math.pow(10, this._exponent);
        return n;
    }

    getNumber() : number {
      return this.numberValue();
    }

    toString() : string {
      return this.stringValue();
    }

    stringValue(): string {
      var v = this._value,
          s = this._exponent,
          image, decimal_location, ii, zeros, exp;

      if (this.isNull()) { // is null
        return "null.decimal";
      }
  
      image = v.digits();
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
    }

    isNull() : boolean {
      var isnull = (this._value === undefined);
      return isnull;
    }

    getDigits() : LongInt {
      return this._value;
    }

    getExponent() : number {
      return this._exponent;
    }

    static parse(str: string) : Decimal {
      var v = undefined, 
          s = 0,
          is_negative = false,
          exp_is_negative = false,
          c, t;

      if (typeof str !== "string" || str.length < 0) {
        throw new Error("only strings can be parsed");
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
            return Decimal.NULL;
          }
          break;
        default:
          break;
      }
      c = str.charCodeAt(0);
      if (!ION.is_digit(c)) throw new Error("invalid decimal");

      // now we really start decoding
      let len: number = str.length;
      let past_decimal: boolean = false;
      let temp: number = 0;
      let exponent: number = 0;
      for (let ii: number = 0; ii < len; ii++) {
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
      t = new Decimal(v, exponent);
      return t;
    }
  }
}
