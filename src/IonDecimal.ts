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

import { is_digit } from "./IonText";
import { LongInt } from "./IonLongInt";


export class Decimal {
  public static readonly NULL: Decimal = new Decimal(undefined, undefined);
  public static readonly ZERO: Decimal = new Decimal(LongInt.ZERO, 0);

  constructor(private _value: LongInt, private _exponent: number) {}

  isZero() : boolean {
    if (this.isNull()) return false;
    return this._value.isZero();
  }

  isNegative() : boolean {
    return this._value.signum() === -1;
  }

  isNegativeZero() : boolean {
    return this.isZero() && this.isNegative();
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
        if (this.isNull()) {
            return "null.decimal";
        }

        let exponent: number = this._exponent;
        let coefficient: string = this._value.digits();
        let significantDigits : number = coefficient.length;
        let result : string = '';
        //digits returns an integer coefficient with an exponent that shifts it back to its original state
        if (exponent < 0) {
            // negative shift - prefix decimal point this may require leading zero's
            let adjustedExponent : number = significantDigits - 1 + exponent;
            if(adjustedExponent >= 0){
                let decimalIndex : number = significantDigits + exponent;
                result = coefficient.slice(0, decimalIndex) + '.' + coefficient.slice(decimalIndex);
            }else if(adjustedExponent >= -6){//adapted from http://speleotrove.com/decimal/daconvs.html
                result = '0.00000'.slice(0, (2 - exponent) - significantDigits) + coefficient;
            }else{
                result = coefficient + '.d' + exponent;
            }
        } else if (exponent > 0) {
            // positive shift
            result = coefficient + '.d' + exponent;
        } else if(exponent === 0) {
            result = coefficient + ".";
        }
        if (this.isNegative()) result = '-' + result;
        return result;
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

  equals(expected : Decimal) : boolean {
      return this.getExponent() === expected.getExponent() && this.isNegative() === expected.isNegative() && this.getDigits().numberValue() === expected.getDigits().numberValue();
  }

  static parse(str: string, stripLeadingZeroes : boolean = true) : Decimal {
    let index: number = 0;
    let exponent: number = 0;
    let c: number;
    let isNegative: boolean = false;

    c = str.charCodeAt(index);
    if (c === '+'.charCodeAt(0)) {
      index++;
    } else if (c === '-'.charCodeAt(0)) {
      isNegative = true;
      index++;
    } else if (c === 'n'.charCodeAt(0)) {
      if (str == 'null' || str == 'null.decimal') {
        return Decimal.NULL;
      } 
    }

    let digits: string = Decimal.readDigits(str, index);
    index += digits.length;
    if(stripLeadingZeroes) digits = Decimal.stripLeadingZeroes(digits);

    if (index === str.length) {
      let trimmedDigits: string = Decimal.stripTrailingZeroes(digits);
      exponent += digits.length - trimmedDigits.length;
      return new Decimal(new LongInt(trimmedDigits, null, isNegative? -1: 1), exponent);
    }

    let hasDecimal: boolean = false;
    c = str.charCodeAt(index);
    if (c === '.'.charCodeAt(0)) {
      hasDecimal = true;
      index++;
      let mantissaDigits: string = Decimal.readDigits(str, index);
      index += mantissaDigits.length;
      exponent -= mantissaDigits.length;
      digits = digits.concat(mantissaDigits);
    }

    if (!hasDecimal) {
      let trimmedDigits: string = Decimal.stripTrailingZeroes(digits);
      exponent += digits.length - trimmedDigits.length;
      digits = trimmedDigits;
    }

    if (index === str.length) {
      return new Decimal(new LongInt(digits, null, isNegative? -1 : 1), exponent);
    }

    c = str.charCodeAt(index);
    if (c !== 'd'.charCodeAt(0) && c !== 'D'.charCodeAt(0)) {
      throw new Error(`Invalid decimal ${str}`);
    }
    index++;

    let isExplicitExponentNegative: boolean = false;
    c = str.charCodeAt(index);
    if (c === '+'.charCodeAt(0)) {
      index++;
    } else if (c === '-'.charCodeAt(0)) {
      isExplicitExponentNegative = true;
      index++;
    }

    let explicitExponentDigits: string = Decimal.readDigits(str, index);
    let explicitExponent = parseInt(explicitExponentDigits, 10);
    if (isExplicitExponentNegative) {
      explicitExponent = -explicitExponent;
    }
    exponent += explicitExponent;
    index += explicitExponentDigits.length;

    if (index !== str.length) {
      // Did not consume the entire string so it must be invalid
      throw new Error(`Invalid decimal ${str}`);
    }

    let decimal: Decimal = new Decimal(new LongInt(digits, null, isNegative ? -1 : 1), exponent);
    return decimal;
  }

  private static readDigits(s: string, offset: number) : string {
    let digits: number = 0;
    for (let i: number = offset; i < s.length; i++) {
      if (is_digit(s.charCodeAt(i))) {
        digits++;
      } else {
        break;
      }
    }
    return s.slice(offset, offset + digits);
  }

  private static stripLeadingZeroes(s: string) : string {
    let i: number = 0;
    for (; i < s.length - 1; i++) {
      if (s.charCodeAt(i) !== '0'.charCodeAt(0)) {
        break;
      }
    }
    return (i > 0) ? s.slice(i) : s;
  }

  private static stripTrailingZeroes(s: string) : string {
    let i: number = s.length - 1;
    for (; i >= 1; i--) {
      if (s.charCodeAt(i) !== '0'.charCodeAt(0)) {
        break;
      }
    }
    return (i < s.length - 1) ? s.slice(0, i + 1) : s;
  }
}
