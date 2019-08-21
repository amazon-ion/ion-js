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

import { LongInt } from "./IonLongInt";

/**
 * This class provides the additional semantics necessary for decimal values.
 * Note that range of an exponent is limited to +/- 15 digits.
 */
export class Decimal {
    public static readonly _ZERO: Decimal = new Decimal(new LongInt(0), 0);

    private readonly _coefficient: LongInt;
    private readonly _exponent: number;

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

    isNegative() : boolean {
        return this._coefficient.signum() === -1;
    }

    numberValue(): number {
        return this._coefficient.numberValue() * Math.pow(10, this._exponent);
    }

    // based on the algorithm defined in https://docs.oracle.com/javase/8/docs/api/java/math/BigDecimal.html#toString--
    toString(): string {
        let cStr = Math.abs(this._coefficient.numberValue())+'';
        let precision = cStr.length;
        let adjustedExponent = this._exponent + (precision - 1);

        let s = '';
        if (this._exponent <= 0 && adjustedExponent >= -6) {
            // no exponential notation
            if (this._exponent === 0) {
                s += cStr;
            } else {
                if (cStr.length <= -this._exponent) {
                    cStr = '0'.repeat(-this._exponent - cStr.length + 1) + cStr;
                    s += cStr.substr(0, 1) + '.' + cStr.substr(1);
                } else {
                    s += cStr.substr(0, precision + this._exponent) + '.' + cStr.substr(precision + this._exponent);
                }
            }
        } else {
            // use exponential notation
            s += cStr[0];
            if (cStr.length > 1) {
                s += '.' + cStr.substr(1);
            }
            s += 'E' + (adjustedExponent > 0 ? '+' : '') + adjustedExponent;
        }
        return (this._coefficient.signum() === -1 ? '-' : '') + s;
    }

    _getCoefficient() : LongInt {
        return this._coefficient;
    }

    _getExponent() : number {
        return this._exponent;
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
        return this._getExponent() === expected._getExponent()
            && this.isNegative() === expected.isNegative()
            && this._getCoefficient().equals(expected._getCoefficient());
    }

    static parse(str: string) : Decimal {
        let exponent = 0;
        if (str === 'null' || str === 'null.decimal') return null;
        let d = str.match('[d|D]');
        let f = str.match('\\.');
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
