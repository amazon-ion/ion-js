/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
 * Returns -1 if x is negative (including -0); otherwise returns 1.
 */
export function _sign(x: number): number {
    return (x < 0 || (x === 0 && (1 / x) === -Infinity)) ? -1 : 1
}

/**
 * Returns false if v is undefined or null; otherwise true.
 * @private
 */
export function _hasValue(v: any): boolean {
    return v !== undefined && v !== null;
}

/**
 * Throws if value is not defined.
 */
export function _assertDefined(value: any): void {
    if (value === undefined) {
        throw new Error("Expected value to be defined");
    }
}

/**
 * If s consists solely of chars ['0'..'9'] and can be parsed as an int,
 * returns the int value;  otherwise returns NaN.
 */
export function _toInt(s: string): number {
    for (let i = 0; i < s.length; i++) {
        if (s[i] < '0' || s[i] > '9') {
            return NaN;
        }
    }
    return parseInt(s);
}

