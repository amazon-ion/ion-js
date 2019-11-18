/*
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

import JSBI from "jsbi";
import {JsbiSupport} from "./JsbiSupport";

//TODO: Add fast paths for JSBI values that can fit in a standard Number.
/**
 * This class provides logic to convert JSBI values to and from the UInt, Int, VarUInt, and VarInt primitives from the
 * Ion spec.
 */
export class JsbiSerde {
    private static readonly SERIALIZED_JSBI_SIZES_TO_PRECOMPUTE = 64;
    private static readonly BITS_PER_BYTE = JSBI.BigInt(8);
    private static readonly BYTE_MAX_VALUE = JSBI.BigInt(0xFF);
    private static readonly SIZE_THRESHOLDS = JsbiSerde.calculateSizeThresholds();

    /**
     * Encodes the specified JSBI value as a sign-and-magnitude integer.
     *
     * @param value         The integer to encode.
     * @param isNegative    Whether or not the integer is negative. This cannot be inferred when `value` is zero,
     *                      as the JSBI data type cannot natively represent negative zero.
     * @return              A byte array containing the encoded Int.
     */
    public static toSignedIntBytes(value: JSBI, isNegative: boolean): Uint8Array {
        let bytes: Uint8Array = this.toUnsignedIntBytes(value);
        if (bytes[0] >= 128) {
            let extendedBytes: Uint8Array = new Uint8Array(bytes.length + 1);
            extendedBytes.set(bytes, 1);
            bytes = extendedBytes;
        }
        if (isNegative) {
            bytes[0] += 0x80; // Flip the sign bit to indicate that it's negative.
        }
        return bytes;
    }

    /**
     * Reads the provided byte array as a big-endian, unsigned integer.
     *
     * @param bytes     A byte array containing an encoded UInt.
     * @return          A JSBI value representing the encoded UInt.
     */
    public static fromUnsignedBytes(bytes: Uint8Array): JSBI {
        let magnitude: JSBI = JsbiSupport.ZERO;
        for (let m = 0; m < bytes.length; m++) {
            let byte = JSBI.BigInt(bytes[m]);
            magnitude = JSBI.leftShift(magnitude, this.BITS_PER_BYTE);
            magnitude = JSBI.bitwiseOr(magnitude, byte);
        }
        return magnitude;
    }

    /**
     * Encodes the specified JSBI value as a big-endian, unsigned integer.
     * @param value     The JSBI value to encode.
     * @return          A byte array containing the encoded UInt.
     */
    public static toUnsignedIntBytes(value: JSBI): Uint8Array {
        // Remove the sign if negative
        if (JsbiSupport.isNegative(value)) {
            value = JSBI.unaryMinus(value);
        }

        let sizeInBytes = this.getUnsignedIntSizeInBytes(value);
        let bytes = new Uint8Array(sizeInBytes);
        for (let m = sizeInBytes - 1; m >= 0; m--) {
            let lastByte = JSBI.toNumber(JSBI.bitwiseAnd(value, this.BYTE_MAX_VALUE));
            value = JSBI.signedRightShift(value, this.BITS_PER_BYTE);
            bytes[m] = lastByte;
        }

        return bytes;
    }

    // Determines how many bytes will be needed to store the UInt encoding of the given JSBI value.
    static getUnsignedIntSizeInBytes(value: JSBI): number {
        // TODO: Profile on real data sets to see if binary search is preferable to a low-to-high linear search.
        for (let m = 0; m < this.SIZE_THRESHOLDS.length; m++) {
            let threshold = this.SIZE_THRESHOLDS[m];
            if (JSBI.lessThanOrEqual(value, threshold)) {
                return m + 1;
            }
        }

        let sizeInBytes = this.SIZE_THRESHOLDS.length;
        let threshold: JSBI = this.calculateSizeThreshold(sizeInBytes);
        while (JSBI.greaterThan(value, threshold)) {
            // TODO: Make larger jumps, then refine the search.
            sizeInBytes++;
            threshold = this.calculateSizeThreshold(sizeInBytes);
        }

        return sizeInBytes;
    }

    // Called once during initialization. Creates an array of thresholds that can be referred to to determine how many
    // bytes will be needed to store the UInt encoding of a given JSBI value.
    private static calculateSizeThresholds(): Array<JSBI> {
        let thresholds: Array<JSBI> = [];
        for (let m = 1; m <= this.SERIALIZED_JSBI_SIZES_TO_PRECOMPUTE; m++) {
            thresholds.push(this.calculateSizeThreshold(m));
        }
        return thresholds;
    }

    private static calculateSizeThreshold(numberOfBytes: number): JSBI {
        let exponent: JSBI = JSBI.multiply(JSBI.BigInt(numberOfBytes), this.BITS_PER_BYTE);
        let threshold = JSBI.exponentiate(JsbiSupport.TWO, exponent);
        return JSBI.subtract(threshold, JsbiSupport.ONE);
    }
}