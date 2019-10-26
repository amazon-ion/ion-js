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

import JSBI from "jsbi";
import {_hasValue, _sign} from "./util";
import {JsbiSupport} from "./JsbiSupport";

/**
 * This class provides the additional semantics necessary for decimal values.
 *
 * Unlike IEEE-754 floating point representation, Decimal values can represent numeric values without loss of precision.
 * Each number is stored as a pair of integers, a "coefficient" and an "exponent", which can be combined to calculate
 * the original value using the following formula:
 *
 *     value = coefficient * (10 ^ exponent)
 *
 * Here are some examples:
 *
 *      coefficient     exponent        value
 *             0           0                0
 *            37          -5                0.00037
 *           314          -2                3.14
 *           -76           0              -76
 *            11           1              110
 *             5           6        5,000,000
 *
 * Presently, the supported range of an exponent is limited to +/- 15 digits.
 */
export class Decimal {

    // For more information about the (sign, coefficient, exponent) data model, see:
    // https://amzn.github.io/ion-docs/docs/decimal.html#data-model
    private _coefficient: JSBI;
    private _exponent: number;
    private _isNegative: boolean;

    public static readonly ZERO = new Decimal(0, 0);
    public static readonly ONE = new Decimal(1, 0);

    /**
     * Creates a new Decimal value by parsing the provided text.
     *
     * @param decimalText   An Ion-encoded decimal value.
     */
    constructor(decimalText: string);

    /**
     * Creates a new Decimal value using the provided coefficient and exponent values.
     *
     * @param coefficient   See the class-level [[Decimal]] documentation for details.
     * @param exponent      See the class-level [[Decimal]] documentation for details.
     */
    constructor(coefficient: number, exponent: number);
    
    /**
     * Creates a new Decimal value using the provided coefficient and exponent values.
     * Because the BigInt data type cannot represent -0, a third parameter called `isNegative` may be supplied
     * to explicitly set the sign of the Decimal following construction. If this flag is not specified,
     * the provided coefficient's sign will be used. If isNegative is specified but is not in agreement with
     * the coefficient's sign, the value of isNegative takes precedence.
     *
     * @param coefficient   See the class-level [[Decimal]] documentation for details.
     * @param exponent      See the class-level [[Decimal]] documentation for details.
     * @param isNegative    Must be set to 'true' when constructing -0. May be omitted otherwise.
     */
    constructor(coefficient: JSBI, exponent: number, isNegative?: boolean);

    // This is the unified implementation of the above signatures and is not visible to users.
    constructor(coefficient: number | JSBI | string, exponent?: number, isNegative?: boolean) {
        if(typeof coefficient === "string") {
            return Decimal.parse(coefficient);
        }

        if (!_hasValue(exponent)) {
            throw new Error("Decimal's constructor was called with a numeric coefficient but no exponent.");
        }

        if (typeof coefficient === "number") {
            return Decimal._fromNumberCoefficient(coefficient, exponent);
        }

        if(coefficient instanceof JSBI) {
            if (!_hasValue(isNegative)) {
                // If isNegative was not specified, infer isNegative from the coefficient.
                // This will work for all values except -0.
                isNegative = JsbiSupport.isNegative(coefficient);
            } else if (isNegative != JsbiSupport.isNegative(coefficient)) {
                // If isNegative was specified, make sure that the coefficient's sign agrees with it.
                coefficient = JSBI.unaryMinus(coefficient);
            }
            return Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
        }

        throw new Error(`Unsupported parameter set (${coefficient}, ${exponent}, ${isNegative} passed to Decimal constructor.`);
    }

    /**
     * Allows a Decimal to be constructed using a coefficient in the range
     * [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER].
     * @hidden
     */
    static _fromNumberCoefficient(coefficient: number, exponent: number): Decimal {
        if (!Number.isInteger(coefficient)) {
            throw new Error("The provided coefficient was not an integer. (" + coefficient + ")");
        }
        let isNegative = coefficient < 0 || Object.is(coefficient, -0);
        return this._fromBigIntCoefficient(isNegative, JSBI.BigInt(coefficient), exponent);
    }

    /**
     * Allows a Decimal to be constructed using a coefficient of arbitrary size.
     * @hidden
     */
    static _fromBigIntCoefficient(isNegative: boolean, coefficient: JSBI, exponent: number): Decimal {
        let value = Object.create(this.prototype);
        value._initialize(isNegative, coefficient, exponent);
        return value;
    }

    /**
     * Constructor helper shared by the public constructor and _fromJsbiCoefficient.
     * @hidden
     */
    private _initialize(isNegative: boolean, coefficient: JSBI, exponent: number) {
        this._isNegative = isNegative;
        this._coefficient = coefficient;
        // If the exponent is -0, set it to 0, which is equivalent.
        // See: https://github.com/amzn/ion-js/issues/474
        if (Object.is(-0, exponent)) {
            exponent = 0;
        }
        this._exponent = exponent;
    }

    private _isNegativeZero(): boolean {
        return this.isNegative() && JsbiSupport.isZero(this._coefficient);
    }

    /**
     * Returns true if this Decimal is negative; otherwise false.
     */
    isNegative() : boolean {
        return this._isNegative;
    }

    /**
     * Returns a number representing the value of this Decimal. Note that
     * some Decimal (base-10) values cannot be precisely expressed in
     * JavaScript's base-2 number type.
     */
    numberValue(): number {
        if (this._isNegativeZero()) {
            return -0;
        }
        return JSBI.toNumber(this._coefficient) * Math.pow(10, this._exponent);
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
        let cStr = this._coefficient.toString();

        if(cStr[0] === '-') {
            cStr = cStr.substr(1, cStr.length);
        }

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
        return (this.isNegative() ? '-' : '') + s;
    }

    /**
     * Returns a BigInt representing the coefficient of this Decimal value.
     *
     * Note that the BigInt data type is unable to represent -0 natively. If you wish to check for a -0 coefficient,
     * test whether the coefficient is zero and then call [[isNegative]].
     */
    getCoefficient() : JSBI {
        return this._coefficient;
    }

    /**
     * Returns a number representing the exponent of this Decimal value.
     */
    getExponent() : number {
        return this._exponent;
    }

    /**
     * Compares this Decimal with another and returns true if they are
     * equivalent in value and precision; otherwise returns false.
     * Note that this differs from compareTo(), which doesn't require
     * precision to match when returning 0.
     */
    equals(that : Decimal) : boolean {
        return this.getExponent() === that.getExponent()
            && _sign(this.getExponent()) === _sign(that.getExponent())
            && this.isNegative() === that.isNegative()
            && JSBI.equal(this.getCoefficient(), that.getCoefficient());
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
        if (JsbiSupport.isZero(this._coefficient)
            && JsbiSupport.isZero(that._coefficient)) {
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

        let thisJsbi = JSBI.BigInt(thisCoefficientStr);
        let thatJsbi = JSBI.BigInt(thatCoefficientStr);
        if (JSBI.greaterThan(thisJsbi, thatJsbi)) {
            return neg ? -1 : 1;
        } else if(JSBI.lessThan(thisJsbi, thatJsbi)) {
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
        if (JsbiSupport.isZero(this._coefficient)) {
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
        let coefficientText: string;
        if (f) {
            let exponentShift = d ? (d.index - 1) - f.index : (str.length - 1) - f.index;
            exponent -= exponentShift;
            // Remove the '.' from the input string.
            coefficientText = str.substring(0, f.index) + str.substring(f.index + 1, exponentDelimiterIndex);
        } else {
            coefficientText = str.substring(0, exponentDelimiterIndex);
        }

        let coefficient: JSBI = JSBI.BigInt(coefficientText);
        let isNegative: boolean = JsbiSupport.isNegative(coefficient) || (coefficientText.startsWith("-0"));
        return Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
    }
}
