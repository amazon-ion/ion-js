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
//
//    This decimal is limited to 15 digits of precision but has an
//    exponent range that is +/- 15 digits as well.
//    
//    It also accepts 'e', 'E', 'f' and 'F' as valid starts for
//    the exponent (in addition to 'd' and 'D').

import { LongInt } from "./IonLongInt";
import { _sign } from "./util";

export class Decimal {
    private _coefficient: LongInt;
    private _exponent: number;

    public static readonly ZERO: Decimal = new Decimal(new LongInt(0), 0);
    public static ONE = new Decimal(1, 0);

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

        let s = '';
        if (this._coefficient.isZero() && this._coefficient.signum() === -1) {
            s = '-';
        }
        s += this._coefficient.toString() + 'd';

        if (this._exponent === 0 && _sign(this._exponent) === -1) {
            s += '-';
        }
        s += this._exponent;

        return s;
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

    lessThan(dec : Decimal) : boolean {
        return this.compare(dec) === -1;
    }

    greaterThan(dec : Decimal) : boolean {
        return this.compare(dec) === 1;
    }

    leq(dec : Decimal) : boolean {
        let result = this.compare(dec);
        return result === -1 || result === 0;
    }

    geq(dec : Decimal) : boolean {
        let result = this.compare(dec)
        return result === 1 || result === 0;
    }

    equals(dec : Decimal) : boolean {
        return this.compare(dec) === 0;
    }

    compare(dec : Decimal) : number {
        let neg = this.isNegative();
        if(neg !== dec.isNegative()) return neg ? -1 : 1;
        //were the same sign
        //compare order to normalize exponents.
        let leftDigits = this._coefficient.toString();
        let leftLength = leftDigits.length;
        let rightDigits = dec._coefficient.toString();
        let rightLength = rightDigits.length;
        let leftOrder = leftLength + this._exponent;
        let rightOrder = rightLength + dec._exponent;
        if (leftOrder > rightOrder) {
            if (neg) {
                return -1;
            } else {
                return 1;
            }
        } else if(leftOrder < rightOrder) {
            if (neg) {
                1;
            } else {
                -1;
            }
        } else {
            //we have two decimals of the same size(including exponents) and sign, need to compare the actual values
            if(leftDigits < rightDigits) {
                //shift the smaller left value to the same number of digits as our right.
                let shift = rightLength - leftLength;
                let textShift = '';
                while (shift > 0) {
                    textShift = textShift + '0';
                    shift--;
                }
                leftDigits = leftDigits + textShift;
            } else if(leftDigits > rightDigits) {
                //shift the smaller right value to the same number of digits as our left.
                let shift = leftLength - rightLength;
                let textShift = '';
                while (shift > 0) {
                    textShift = textShift + '0';
                    shift--;
                }
                rightDigits = rightDigits + textShift;
            } else {
                //number of digits is the same
                //no op?
            }
            let left = new LongInt(leftDigits);
            let right = new LongInt(rightDigits);
            if (left.lessThan(right)) {
                //left is smaller
                if(neg) {
                    //left is greaterThan when smaller and negative
                    return 1;
                } else {
                    //left is lessThan when larger and negative
                    return -1;
                }
            } else if(left.greaterThan(right)){
                //right is smaller
                if(neg) {
                    return -1;
                } else {
                    return 1;
                }
            } else {
                return 0;
            }
        }
    }

    DataModelequals(expected : Decimal) : boolean {
        return this.getExponent() === expected.getExponent()
            && this.isNegative() === expected.isNegative()
            && this.getDigits().equals(expected.getDigits());
    }

    static parse(str: string) : Decimal {
        let exponent = 0;
        if (str === 'null' || str === 'null.decimal') return null;
        let d = str.match('[d|D]');
<<<<<<< HEAD
        let f = str.match('\\.');
=======
        let f  = str.match('\\.');
>>>>>>> Adds comparison functions to decimals to allow validation while marshalling timestamps.
        let exponentDelimiterIndex = str.length;
        if(d) {
            exponent = Number(str.substring(d.index + 1, str.length));
            exponentDelimiterIndex = d.index;
        }
        if(f) {
            let exponentShift = d ? (d.index - 1) - f.index : (str.length - 1) - f.index;
            return new Decimal(new LongInt(str.substring(0, f.index) + str.substring(f.index + 1, exponentDelimiterIndex)), exponent - exponentShift);
        } else {
            return new Decimal(new LongInt(str.substring(0, exponentDelimiterIndex)), exponent);
        }
    }
}
