/*
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import {LongInt} from "./IonLongInt";
import {_sign} from "./util";

/**
 * This class provides the additional semantics necessary for decimal values.
 *
 * Unlike IEEE-754 floating point representation, Decimal values can represent numeric values without loss of precision.
 * They combine an arbitrarily large integer value (the "coefficient") with a second integer representing its scale
 * (the "exponent") using the following formula:
 *
 *     value = coefficient * (10 ^ exponent)
 *
 * Here are some examples:
 *
 *      coefficient     exponent        value
 *             0           0                0
 *           314          -2                3.14
 *           -76           1              -76
 *             5           6        5,000,000
 *
 * Presently, the supported range of an exponent is limited to +/- 15 digits.
 */
export class Decimal {
    private _coefficient: LongInt;
    private _exponent: number;

    public static readonly ZERO = new Decimal(0, 0);
    public static readonly ONE = new Decimal(1, 0);

    /**
     * Creates a new Decimal value.
     * @param coefficient   See the class-level documentation for {@link Decimal}.
     * @param exponent      See the class-level documentation for {@link Decimal}.
     */
    constructor(coefficient: number, exponent: number) {
        if (!Number.isInteger(coefficient)) {
            throw new Error("The provided coefficient was not an integer. (" + coefficient + ")");
        }
        this._initialize(new LongInt(coefficient), exponent);
    }

    /**
     * Allows a Decimal to be constructed using a coefficient of arbitrary size without exposing the LongInt class
     * as part of the public API.
     * @hidden
     */
    static _fromLongIntCoefficient(coefficient: LongInt, exponent: number) {
        let value = Object.create(this.prototype);
        value._initialize(coefficient, exponent);
        return value;
    }

    /**
     * Constructor helper shared by the public constructor and _fromLongIntCoefficient.
     * @hidden
     */
    private _initialize(coefficient: LongInt, exponent: number) {
        this._coefficient = coefficient;
        this._exponent = exponent;
    }

    /**
     * Returns true if this Decimal is negative; otherwise false.
     */
    isNegative() : boolean {
        return this._coefficient.signum() === -1;
    }

    /**
     * Returns a number representing the value of this Decimal. Note that
     * some Decimal (base-10) values cannot be precisely expressed in
     * JavaScript's base-2 number type.
     */
    numberValue(): number {
        return this._coefficient.numberValue() * Math.pow(10, this._exponent);
    }

    /**
     * Returns a number representing the integer portion of this Decimal.
     * Any fractional portion of this Decimal is truncated.
     */
    intValue(): number {
        return Math.trunc(this.numberValue());
    }

    /**
     * Returns a string representation of this Decimal, using exponential
     * notation when appropriate.
     */
    toString(): string {
        // based on the algorithm defined in https://docs.oracle.com/javase/8/docs/api/java/math/BigDecimal.html#toString--
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

    /**
     * @hidden
     */
    _getCoefficient() : LongInt {
        return this._coefficient;
    }

    /**
     * @hidden
     */
    _getExponent() : number {
        return this._exponent;
    }

    /**
     * Compares this Decimal with another and returns true if they are
     * equivalent in value and precision; otherwise returns false.
     * Note that this differs from compareTo(), which doesn't require
     * precision to match when returning 0.
     */
    equals(that : Decimal) : boolean {
        return this._getExponent() === that._getExponent()
            && _sign(this._getExponent()) === _sign(that._getExponent())
            && this.isNegative() === that.isNegative()
            && this._getCoefficient().equals(that._getCoefficient());
    }

    /**
     * Compares this Decimal with another and returns -1, 0, or 1 if this
     * Decimal is less than, equal to, or greater than the other Decimal.
     *
     * Note that a return value of 0 doesn't guarantee that equals() would
     * return true, as compareTo() doesn't require the values to have the
     * same precision to be considered equal, whereas equals() does.
     * Additionally, compareTo() treats 0. and -0. as equal, but equals()
     * does not.
     */
    compareTo(that : Decimal) : number {
        if (this._coefficient.isZero()
            && that._getCoefficient().isZero()) {
            return 0;
        }

        let neg = this.isNegative();
        if (neg !== that.isNegative()) {
            return neg ? -1 : 1;
        }

        // decimals have the same sign; compare magnitudes
        let [thisCoefficientStr, thisPrecision, thisMagnitude] = this._compareToParams();
        let [thatCoefficientStr, thatPrecision, thatMagnitude] = that._compareToParams();

        if (thisMagnitude > thatMagnitude) {
            return neg ? -1 : 1;
        } else if (thisMagnitude < thatMagnitude) {
            return neg ? 1 : -1;
        }

        // decimals have the same sign and magnitude; append zeros so comparison is
        // independent of precision
        if (thisCoefficientStr.length < thatCoefficientStr.length) {
            thisCoefficientStr += '0'.repeat(thatPrecision - thisPrecision);
        } else if (thisCoefficientStr.length > thatCoefficientStr.length) {
            thatCoefficientStr += '0'.repeat(thisPrecision - thatPrecision);
        }

        let thisLongInt = new LongInt(thisCoefficientStr);
        let thatLongInt = new LongInt(thatCoefficientStr);
        if (thisLongInt.greaterThan(thatLongInt)) {
            return neg ? -1 : 1;
        } else if(thisLongInt.lessThan(thatLongInt)){
            return neg ? 1 : -1;
        }

        return 0;
    }

    /**
     * Calculates values used by compareTo(), specifically:
     * - a string representing the absolute value of the coefficient
     * - the precision, or number of digits in the coefficient
     * - the magnitude, which indicates what position the most significant digit is in,
     *   for example:
     *
     *   decimal    magnitude
     *   -------    ---------
     *     100          3
     *      10          2
     *       1          1
     *       0.1       -1
     *       0.01      -2
     *       0.001     -3
     *       0         -Infinity
     *
     * @hidden
     */
    private _compareToParams(): [string, number, number] {
        let coefficientStr = this.isNegative()
                ? this._coefficient.toString().substring(1)
                : this._coefficient.toString();
        let precision = coefficientStr.length;
        let magnitude = precision + this._exponent;
        if (magnitude <= 0) {
            // without this, the value 0.1 would have magnitude of 0 (not the end of the world,
            // but simpler to describe and reason about if we make this adjustment)
            magnitude -= 1;
        }
        if (this._coefficient.isZero()) {
            magnitude = -Infinity;
        }
        return [coefficientStr, precision, magnitude];
    }

    /**
     * Given a string containing the Ion text representation of a decimal value,
     * returns a new Decimal object corresponding to the value.  If a string such as
     * '5' is provided, a 'd0' suffix is assumed.
     */
    static parse(str: string) : Decimal {
        let exponent = 0;
        if (str === 'null' || str === 'null.decimal') return null;
        let d = str.match('[d|D]');
        let exponentDelimiterIndex = str.length;
        if (d) {
            exponent = Number(str.substring(d.index + 1, str.length));
            exponentDelimiterIndex = d.index;
        }
        let f  = str.match('\\.');
        if (f) {
            let exponentShift = d ? (d.index - 1) - f.index : (str.length - 1) - f.index;
            return Decimal._fromLongIntCoefficient(new LongInt(str.substring(0, f.index) + str.substring(f.index + 1, exponentDelimiterIndex)), exponent - exponentShift);
        } else {
            return Decimal._fromLongIntCoefficient(new LongInt(str.substring(0, exponentDelimiterIndex)), exponent);
        }
    }
}
