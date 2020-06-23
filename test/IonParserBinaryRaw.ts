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

import {assert} from 'chai';
import SignAndMagnitudeInt from "../src/SignAndMagnitudeInt";
import {BinarySpan} from "../src/IonSpan";
import {ParserBinaryRaw} from "../src/IonParserBinaryRaw";

/**
 * Tests for reading the UInt primitive follow.
 *
 * Spec: http://amzn.github.io/ion-docs/docs/binary.html#uint-and-int-fields
 */

// Returns the largest unsigned integer value that can be stored in `numberOfBits` bits.
let maxValueForBits = function (numberOfBits: number) {
    return Math.pow(2, numberOfBits) - 1;
};

// Returns the largest unsigned integer value that can be stored in `numberOfBytes` bytes.
let maxValueForBytes = function (numberOfBytes: number) {
    return maxValueForBits(numberOfBytes * 8);
};

// Returns an array containing `numberOfBytes` bytes with value of 0xFF.
let maxValueByteArray = function (numberOfBytes: number) {
    let data: number[] = [];
    for (let m = 0; m < numberOfBytes; m++) {
        data.push(0xFF);
    }
    return data;
};

let unsignedIntBytesMatchValue = (bytes: number[],
                                  expected: number,
                                  readFrom: (input: BinarySpan, numberOfBytes: number) => any =
                                      ParserBinaryRaw._readUnsignedIntAsBigIntFrom) => {
    let binarySpan = new BinarySpan(new Uint8Array(bytes));
    let actual = readFrom(binarySpan, bytes.length);
    assert.equal(actual, expected)
};

let unsignedIntReadingTests = [
    {bytes: [0x00], expected: 0},
    {bytes: [0x01], expected: 1},
    {bytes: [0x0F], expected: 15},
    {bytes: [0x00, 0x00], expected: 0},
    {bytes: maxValueByteArray(1), expected: maxValueForBytes(1)},
    {bytes: maxValueByteArray(2), expected: maxValueForBytes(2)},
    {bytes: maxValueByteArray(3), expected: maxValueForBytes(3)},
    {bytes: maxValueByteArray(4), expected: maxValueForBytes(4)},
    {bytes: maxValueByteArray(5), expected: maxValueForBytes(5)},
    {bytes: maxValueByteArray(6), expected: maxValueForBytes(6)},
    {bytes: [0x7F, 0xFF, 0xFF, 0xFF], expected: maxValueForBits(31)},
];

// Each 'bytes' array should be an incomplete serialization of each 'expected' value.
let unsignedIntEofTests = [
    {bytes: [], expected: 1},
    {bytes: maxValueByteArray(1), expected: maxValueForBytes(2)},
    {bytes: maxValueByteArray(2), expected: maxValueForBytes(3)},
];

describe('Reading unsigned ints', () => {
    describe('Good', () => {
        unsignedIntReadingTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => unsignedIntBytesMatchValue(bytes, expected)
            );
        });
    });

    describe('EOF', () => {
        unsignedIntEofTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => assert.throws(() => unsignedIntBytesMatchValue(bytes, expected))
            );
        });
    });

    describe('Safe', () => {
        unsignedIntReadingTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => unsignedIntBytesMatchValue(bytes, expected, ParserBinaryRaw._readUnsignedIntAsNumberFrom)
            );
        });
    });

    describe('Throwing when ints are outside of the safe integer range', () => {
        for (let numberOfBytes = 7; numberOfBytes <= 10; numberOfBytes++) {
            let expected = maxValueForBytes(numberOfBytes);
            let bytes = maxValueByteArray(numberOfBytes);
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => assert.throws(() => unsignedIntBytesMatchValue(bytes, expected, ParserBinaryRaw._readUnsignedIntAsNumberFrom))
            );
        }
    });

    describe('BigInt', () => {
        // Test reading unsigned ints requiring 4-10 bytes.
        // Expected to pass.
        for (let numberOfBytes = 4; numberOfBytes <= 10; numberOfBytes++) {
            let expected = maxValueForBytes(numberOfBytes);
            let bytes = maxValueByteArray(numberOfBytes);
            it('Reading ' + expected + ' from bytes: ' + bytes.toString(), () => {
                unsignedIntBytesMatchValue(bytes, expected);
            });
        }
    });
});

/**
 * Tests for reading the Int primitive follow.
 *
 * Spec: http://amzn.github.io/ion-docs/docs/binary.html#uint-and-int-fields
 */

let signedIntBytesMatch = function (bytes: number[], expected: SignAndMagnitudeInt) {
    let binarySpan = new BinarySpan(new Uint8Array(bytes));
    let actual = ParserBinaryRaw._readSignedIntFrom(binarySpan, bytes.length);
    assert.isTrue(actual.equals(expected));
};

let signedIntReadingTests = [
    {bytes: [0x00], expected: 0},
    {bytes: [0x80], expected: -0},
    {bytes: [0x01], expected: 1},
    {bytes: [0x81], expected: -1},
    {bytes: [0x00, 0x01], expected: 1},
    {bytes: [0x80, 0x01], expected: -1},
    {bytes: [0x04], expected: 4},
    {bytes: [0x84], expected: -4},
    {bytes: [0x7F], expected: 127},
    {bytes: [0xFF], expected: -127},
    {bytes: [0x7F, 0xFF], expected: maxValueForBits(15)},
    {bytes: [0xFF, 0xFF], expected: -1 * maxValueForBits(15)},
    {bytes: [0x7F, 0xFF, 0xFF], expected: maxValueForBits(23)},
    {bytes: [0xFF, 0xFF, 0xFF], expected: -1 * maxValueForBits(23)},
    {bytes: [0x7F, 0xFF, 0xFF, 0xFF], expected: maxValueForBits(31)},
    {bytes: [0xFF, 0xFF, 0xFF, 0xFF], expected: -1 * maxValueForBits(31)},
    {bytes: [0x7F, 0xFF, 0xFF, 0xFF, 0xFF], expected: maxValueForBits(39)},
    {bytes: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF], expected: -1 * maxValueForBits(39)},
];

describe('Reading signed ints', () => {
    describe('Ok', () => {
        signedIntReadingTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => signedIntBytesMatch(bytes, SignAndMagnitudeInt.fromNumber(expected))
            );
        });
    });
});

/**
 * Tests for reading the VarUInt primitive follow.
 *
 * Spec: http://amzn.github.io/ion-docs/docs/binary.html#varuint-and-varint-fields
 */

let varUnsignedIntBytesMatchValue = function (bytes: number[], expected: number) {
    let binarySpan = new BinarySpan(new Uint8Array(bytes));
    let actual = ParserBinaryRaw._readVarUnsignedIntFrom(binarySpan);
    assert.equal(actual, expected);
};

let varUnsignedIntReadingTests = [
    {bytes: [0x80], expected: 0},
    {bytes: [0x00, 0x81], expected: 1},
    {bytes: [0x00, 0x00, 0x81], expected: 1},
    {bytes: [0x00, 0x00, 0x00, 0x81], expected: 1},
    {bytes: [0x0E, 0xEB], expected: 1899},
    {bytes: [0x0E, 0xEC], expected: 1900},
];

let varUnsignedIntOverflowTests = [
    {bytes: [0x1F, 0x7F, 0x7F, 0x7F, 0xFF], expected: maxValueForBits(33)},
    {bytes: [0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xFF], expected: maxValueForBits(42)},
];

describe('Reading variable unsigned ints', () => {
    // Test all values that can be encoded in a single byte
    it('All single-byte encodings', function () {
        for (let byte = 0; byte <= 0x7F; byte++) {
            varUnsignedIntBytesMatchValue([byte | 0x80], byte);
        }
    });

    describe('Ok', () => {
        varUnsignedIntReadingTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => varUnsignedIntBytesMatchValue(bytes, expected)
            );
        });
    });

    describe('Overflow', () => {
        varUnsignedIntOverflowTests.forEach(({bytes, expected}) => {
            it(
                'Overflow while reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => assert.throws(() => varUnsignedIntBytesMatchValue(bytes, expected))
            );
        });
    });
});

/**
 * Tests for reading the VarInt primitive follow.
 *
 * Spec: http://amzn.github.io/ion-docs/docs/binary.html#varuint-and-varint-fields
 */

let varSignedIntBytesMatchValue = function (bytes: number[], expected: number) {
    let binarySpan = new BinarySpan(new Uint8Array(bytes));
    let actual = ParserBinaryRaw._readVarSignedIntFrom(binarySpan);
    assert.equal(actual, expected)
};

let varSignedIntReadingTests = [
    {bytes: [0x80], expected: 0},
    {bytes: [0xC0], expected: -0},
    {bytes: [0x81], expected: 1},
    {bytes: [0xC1], expected: -1},
    {bytes: [0x00, 0x81], expected: 1},
    {bytes: [0x40, 0x81], expected: -1},
    {bytes: [0x0E, 0xEB], expected: 1899},
    {bytes: [0x4E, 0xEB], expected: -1899},
    {bytes: [0x0E, 0xEC], expected: 1900},
    {bytes: [0x4E, 0xEC], expected: -1900},
    {bytes: [0x00, 0x00, 0x81], expected: 1},
    {bytes: [0x00, 0x00, 0x00, 0x81], expected: 1},
    {bytes: [0x3F, 0x7F, 0x7F, 0xFF], expected: maxValueForBits(27)},
    {bytes: [0x7F, 0x7F, 0x7F, 0xFF], expected: -maxValueForBits(27)},
];

let varSignedIntOverflowTests = [
    {bytes: [0x1F, 0x7F, 0x7F, 0x7F, 0xFF], expected: maxValueForBits(33)},
    {bytes: [0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xFF], expected: -maxValueForBits(42)},
];

describe('Reading variable signed ints', () => {
    it('All positive, single-byte encodings.', function () {
        for (let byte = 0; byte <= 0x3F; byte++) {
            varSignedIntBytesMatchValue([byte | 0x80], byte);
        }
    });

    it('All negative, single-byte encodings.', function () {
        for (let byte = 0; byte <= 0x3F; byte++) {
            varSignedIntBytesMatchValue([byte | 0xC0], -byte);
        }
    });

    describe('Ok', () => {
        varSignedIntReadingTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => varSignedIntBytesMatchValue(bytes, expected)
            );
        });
    });

    describe('Overflow', () => {
        varSignedIntOverflowTests.forEach(({bytes, expected}) => {
            it(
                'Reading ' + expected + ' from bytes: ' + bytes.toString(),
                () => assert.throws(() => varSignedIntBytesMatchValue(bytes, expected))
            );
        });
    });
});

/**
 * Tests for reading Float values follow.
 *
 * Spec: http://amzn.github.io/ion-docs/docs/binary.html#4-float
 */

let serializeFloat = function (value: number, viewType: Float32ArrayConstructor | Float64ArrayConstructor, numberOfBytes: number) {
    let buffer = new ArrayBuffer(numberOfBytes);
    let view = new viewType(buffer);
    view[0] = value;
    let bytes = new Uint8Array(buffer);
    bytes.reverse(); // Big endian
    return bytes;
};

let serializeFloat32 = function (value: number) {
    return serializeFloat(value, Float32Array, 4);
};

let serializeFloat64 = function (value: number) {
    return serializeFloat(value, Float64Array, 8);
};

let floatBytesMatchValue = function (bytes: Uint8Array, expected: number, comparison = (x: number, y: number) => assert.equal(x, y)) {
    let binarySpan = new BinarySpan(bytes);
    let actual = ParserBinaryRaw._readFloatFrom(binarySpan, binarySpan.getRemaining());
    comparison(actual!, expected);
};

let float32TestValues = [
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    0.0,
    -0.0,
    12.5,
    -12.5,
    -1230000000,
    1230000000,
];

// Test the same values for 64 bit floats plus a few extra.
let float64TestValues = float32TestValues.slice(0);
float64TestValues.push(
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER
);

describe("Reading floats", () => {
    describe("32-bit", () => {
        float32TestValues.forEach((f32) => {
            it('' + f32, () => {
                let bytes = serializeFloat32(f32);
                floatBytesMatchValue(bytes, f32);
            });
        });

        it('NaN', () => {
            let expected = Number.NaN;
            let bytes = serializeFloat32(expected);
            floatBytesMatchValue(bytes, expected, (x) =>
                assert.isTrue(Number.isNaN(x))
            );
        });
    });

    describe("64-bit", () => {
        float64TestValues.forEach((f64) => {
            it('' + f64, () => {
                let bytes = serializeFloat64(f64);
                floatBytesMatchValue(bytes, f64);
            });
        });

        it('NaN', () => {
            let expected = Number.NaN;
            let bytes = serializeFloat64(expected);
            floatBytesMatchValue(bytes, expected, (x) =>
                assert.isTrue(Number.isNaN(x))
            );
        });
    });
});