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

    private _coefficient: LongInt;
    private _exponent: number;

    public static readonly NULL: Decimal = new Decimal(undefined, undefined);
    public static readonly ZERO: Decimal = new Decimal(new LongInt(0), 0);

    constructor(coefficient: LongInt | number, exponent: number) {
        if (typeof coefficient === "number") {
            if (!Number.isInteger(coefficient)) {
                throw new Error("The provided coefficient was not an integer. (" + coefficient + ")");
            }
            this._coefficient = new LongInt(coefficient);
        } else {
            this._coefficient = coefficient;
        }
        this._exponent = exponent;
    }

    isZero() : boolean {
        if (this.isNull()) return false;
        return this._coefficient.isZero();
    }

    isNegative() : boolean {
        return this._coefficient.signum() === -1;
    }

    isNegativeZero() : boolean {
        return this.isZero() && this.isNegative();
    }

    isZeroZero() : boolean {
        if (this.isZero()) {
          // TODO - is this right? negative scale is valid decimal places
          if (this._exponent >= -1) {
            return (this._coefficient.signum() >= 0);
          }
        }
        return false;
    }

    numberValue(): number {
        return this._coefficient.numberValue() * Math.pow(10, this._exponent);
    }

    getNumber() : number {
        return this.numberValue();
    }

    toString() : string {
        return this.stringValue();
    }

    stringValue(): string {
        if (this.isNull()) return "null.decimal";
        return this._coefficient.toString() + 'd' + this._exponent;
    }

    isNull() : boolean {
        return this._coefficient === undefined;
    }

    getDigits() : LongInt {
        return this._coefficient;
    }

    getExponent() : number {
        return this._exponent;
    }

    equals(expected : Decimal) : boolean {
        return this.getExponent() === expected.getExponent()
            && this.isNegative() === expected.isNegative()
            && this.getDigits().numberValue() === expected.getDigits().numberValue();
    }

    static parse(str: string) : Decimal {
        let exponent = 0;
        if (str === 'null' || str === 'null.decimal') return Decimal.NULL;
        let d = str.match('[d|D]');
        let f  = str.match('\\.');
        let exponentDelimiterIndex = str.length - 1;
        if(d) {
            exponent = Number(str.substring(d.index + 1, str.length));
            exponentDelimiterIndex = d.index;
        }
        if(f) {
            let exponentShift = d ? (d.index - 1) - f.index : (str.length - 1) - f.index;
            return new Decimal(new LongInt(str.substring(0, f.index) +  str.substring(f.index + 1, exponentDelimiterIndex)),  exponent - exponentShift);
        } else {
            return new Decimal(new LongInt(str.substring(0,  exponentDelimiterIndex)), exponent);
        }
    }
}
