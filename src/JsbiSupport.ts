/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import JSBI from 'jsbi';

/**
 * This class provides helper methods and static values for working with JSBI integers.
 */
export class JsbiSupport {
    public static readonly ZERO: JSBI = JSBI.BigInt(0);
    public static readonly ONE: JSBI = JSBI.BigInt(1);
    public static readonly TWO: JSBI = JSBI.BigInt(2);
    public static readonly NUMBER_MAX_SAFE_INTEGER: JSBI = JSBI.BigInt(Number.MAX_SAFE_INTEGER);
    public static readonly NUMBER_MIN_SAFE_INTEGER: JSBI = JSBI.BigInt(Number.MIN_SAFE_INTEGER);


    /**
     * Indicates whether the provided value is zero without allocating a new JSBI value to represent zero.
     * @param value The integer to test.
     * @return  True if the value is equal to zero.
     */
    public static isZero(value: JSBI): boolean {
        return JSBI.equal(value, JsbiSupport.ZERO);
    }

    /**
     * Indicates whether the provided value is less than zero without allocating a new JSBI value to represent zero.
     * @param value
     */
    public static isNegative(value: JSBI): boolean {
        return JSBI.lessThan(value, JsbiSupport.ZERO);
    }

    /**
     * Creates a JSBI value from the given string.
     *
     * The static JSBI.BigInt() constructor method can parse hex, decimal, octal, and binary values without issue based
     * on their prefixes ('0x', '', '0o', and '0b' respectively), it will only parse values that are negative if the
     * notation is in decimal. For example, it will successfully parse "14", "-14", and "0x0e", but will throw an
     * Error when asked to parse "-0x0e". This limitation is part of the BigInt spec.
     */
    public static bigIntFromString(text: string): JSBI {
        let isNegative = false;
        let magnitudeText = text.trimLeft();
        if (text.startsWith('-')) {
            isNegative = true;
            magnitudeText = text.substring(1);
        }
        let bigInt = JSBI.BigInt(magnitudeText);
        if (isNegative) {
            bigInt = JSBI.unaryMinus(bigInt);
        }
        return bigInt;
    }

    /**
     * By default, converting a BigInt to a Number causes precision loss for values outside of the range
     * [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]. This function will clamp the given value to a number
     * within that range.
     *
     * @param value The BigInt to convert to a number, possibly clamping it in the process.
     * @return  Number.MIN_SAFE_INTEGER if `value` is less than Number.MIN_SAFE_INTEGER,
     *          Number.MAX_SAFE_INTEGER if `value` is greater than Number.MAX_SAFE_INTEGER,
     *          or the Number representation of `value` if it is already within that range.
     */
    public static clampToSafeIntegerRange(value: JSBI): number {
        if (JSBI.greaterThan(value, this.NUMBER_MAX_SAFE_INTEGER)) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (JSBI.lessThan(value, this.NUMBER_MIN_SAFE_INTEGER)) {
            return Number.MIN_SAFE_INTEGER;
        }
        return JSBI.toNumber(value);
    }

    /**
     * Indicates whether the provided JSBI value is within the range[ Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER].
     *
     * @param value     The integer to test.
     * @return          True if JSBI.toNumber(value) can be called without losing any precision.
     */
    public static isSafeInteger(value: JSBI): boolean {
        return JSBI.greaterThanOrEqual(value, this.NUMBER_MIN_SAFE_INTEGER)
            && JSBI.lessThanOrEqual(value, this.NUMBER_MAX_SAFE_INTEGER);
    }
}

