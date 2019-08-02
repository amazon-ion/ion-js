/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
  ],
  function(intern, registerSuite, assert, ion) {

    let suite = {
      name: 'Parser Binary Raw'
    };

    // Registers the provided test with the test suite.
    let registerTest = function(testName, test, throwsException) {
      suite[testName] = throwsException
          ? function() { assert.throws(test, Error); }
          : test;
    }

    /**
     * UInt
     *
     * Spec: http://amzn.github.io/ion-docs/docs/binary.html#uint-and-int-fields
     */

    // The base test function called by the more specific flavors below.
    // Creates a test which will attempt to read the `expected` unsigned int from the provided input bytes, handling
    // any anticipated exceptions.
    let readUnsignedIntTest = function(testName, bytes, expected, throwsException) {
      let test = function() {
        let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
        let actual = ion.ParserBinaryRaw.readUnsignedIntFrom(binarySpan, bytes.length);
        assert.equal(actual, expected)
      }
      registerTest(testName, test, throwsException);
    }

    // Should read the `expected` unsigned int value from the provided input bytes.
    // Will fail if an exception is thrown or if the value that's read from the bytes is not equal to `expected`.
    let readUnsignedInt = function(bytes, expected) {
      let testName = 'Read unsigned int ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      readUnsignedIntTest(testName, bytes, expected, testThrows);
    }

    // Should detect that overflow has occurred while reading and throw an exception.
    // Will fail if no exception is thrown.
    let overflowWhileReadingUnsignedInt = function(bytes, expected) {
      let testName = 'Overflow while attempting to read the value ' + expected + ' from the bytes: ' + bytes;
      let testThrows = true;
      readUnsignedIntTest(testName, bytes, expected, testThrows);
    }

    // Should detect that there is insufficient data available to read the requested value.
    // Will fail if no exception is thrown.
    let eofWhileReadingUnsignedInt = function(bytes, expected) {
      let testName = 'Encountered EOF while attempting to read the value ' + expected + ' from the bytes: ' + bytes;
      let testThrows = true;
      readUnsignedIntTest(testName, bytes, expected, testThrows);
    }

    // Returns the largest unsigned integer value that can be stored in `numberOfBits` bits.
    let maxValueForBits = function(numberOfBits) {
      return Math.pow(2, numberOfBits) - 1;
    }

    // Returns the largest unsigned integer value that can be stored in `numberOfBytes` bytes.
    let maxValueForBytes = function(numberOfBytes) {
      return maxValueForBits(numberOfBytes * 8);
    }

    // Returns an array containing `numberOfBytes` bytes with value of 0xFF.
    let maxValueByteArray = function(numberOfBytes) {
      let data = [];
      for(let m = 0; m < numberOfBytes; m++) {
        data.push(0xFF);
      }
      return data;
    }

    // Expected to pass
    readUnsignedInt([0x00], 0);
    readUnsignedInt([0x01], 1);
    readUnsignedInt([0x0F], 15);
    readUnsignedInt([0x00, 0x00], 0);
    readUnsignedInt(maxValueByteArray(1), maxValueForBytes(1));
    readUnsignedInt(maxValueByteArray(2), maxValueForBytes(2));
    readUnsignedInt(maxValueByteArray(3), maxValueForBytes(3));
    readUnsignedInt([0x7F, 0xFF, 0xFF, 0xFF], maxValueForBits(31));

    // Test reading unsigned ints requiring 4-10 bytes.
    // Expected to fail.
    for (let numberOfBytes = 4; numberOfBytes <= 10; numberOfBytes++) {
      overflowWhileReadingUnsignedInt(maxValueByteArray(numberOfBytes), maxValueForBytes(numberOfBytes));
    }

    eofWhileReadingUnsignedInt([], 1);
    eofWhileReadingUnsignedInt(maxValueByteArray(1), maxValueForBytes(2));
    eofWhileReadingUnsignedInt(maxValueByteArray(2), maxValueForBytes(3));

    let readUnsignedLongInt = function(bytes, expected, throwsException) {
      let testName = 'Read unsigned long int ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      let test = function() {
        let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
        let actual = ion.ParserBinaryRaw.readUnsignedLongIntFrom(binarySpan, bytes.length);
        assert.equal(actual, expected)
      }
      registerTest(testName, test, throwsException);
    }

    // Test reading unsigned ints requiring 4-10 bytes.
    // Expected to pass.
    for (let numberOfBytes = 4; numberOfBytes <= 10; numberOfBytes++) {
      readUnsignedLongInt(maxValueByteArray(numberOfBytes), maxValueForBytes(numberOfBytes));
    }

    /**
     * Int
     *
     * Spec: http://amzn.github.io/ion-docs/docs/binary.html#uint-and-int-fields
     */

    // The base test function called by the more specific flavors below.
    // Creates a test which will attempt to read the `expected` signed int from the provided input bytes, handling
    // any anticipated exceptions.
    let readSignedIntTest = function(testName, bytes, expected, throwsException) {
      let test = function() {
        let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
        let actual = ion.ParserBinaryRaw.readSignedIntFrom(binarySpan, bytes.length).numberValue();
        assert.equal(actual, expected)
      }
      registerTest(testName, test, throwsException);
    }

    // Should read the `expected` signed int value from the provided input bytes.
    // Will fail if an exception is thrown or if the value that's read from the bytes is not equal to `expected`.
    let readSignedInt = function(bytes, expected) {
      let testName = 'Read signed int ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      readSignedIntTest(testName, bytes, expected, testThrows);
    }

    readSignedInt([0x00], 0);
    readSignedInt([0x80], 0);

    readSignedInt([0x01], 1);
    readSignedInt([0x81], -1);

    readSignedInt([0x00, 0x01], 1);
    readSignedInt([0x80, 0x01], -1);

    readSignedInt([0x04], 4);
    readSignedInt([0x84], -4);

    readSignedInt([0xFF], -127);
    readSignedInt([0x7F], 127);

    readSignedInt([0x7F, 0xFF], maxValueForBits(15));
    readSignedInt([0xFF, 0xFF], -1 * maxValueForBits(15));

    readSignedInt([0x7F, 0xFF, 0xFF], maxValueForBits(23));
    readSignedInt([0xFF, 0xFF, 0xFF], -1 * maxValueForBits(23));

    readSignedInt([0x7F, 0xFF, 0xFF, 0xFF], maxValueForBits(31));
    readSignedInt([0xFF, 0xFF, 0xFF, 0xFF], -1 * maxValueForBits(31));

    readSignedInt([0x7F, 0xFF, 0xFF, 0xFF, 0xFF], maxValueForBits(39));
    readSignedInt([0xFF, 0xFF, 0xFF, 0xFF, 0xFF], -1 * maxValueForBits(39));

    /**
     * VarUInt
     *
     * Spec: http://amzn.github.io/ion-docs/docs/binary.html#varuint-and-varint-fields
     */

    let varUnsignedIntBytesMatchValue = function(bytes, expected) {
      let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
      let actual = ion.ParserBinaryRaw.readVarUnsignedIntFrom(binarySpan);
      assert.equal(actual, expected);
    }

    // The base test function called by the more specific flavors below.
    // Creates a test which will attempt to read the `expected` VarUInt from the provided input bytes, handling
    // any anticipated exceptions.
    let readVarUnsignedIntTest = function(testName, bytes, expected, throwsException) {
      let test = function() {
        varUnsignedIntBytesMatchValue(bytes, expected);
      }
      registerTest(testName, test, throwsException);
    }

    // Should read the `expected` VarUInt value from the provided input bytes.
    // Will fail if an exception is thrown or if the value that's read from the bytes is not equal to `expected`.
    let readVarUnsignedInt = function(bytes, expected) {
      let testName = 'Read var unsigned int ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      readVarUnsignedIntTest(testName, bytes, expected, testThrows);
    }

    // Should detect that overflow has occurred while reading and throw an exception.
    // Will fail if no exception is thrown.
    let overflowWhileReadingVarUnsignedInt = function(bytes, expected) {
      let testName = 'Overflow while attempting to read var unsigned int ' + expected + ' from the bytes: ' + bytes;
      let testThrows = true;
      readVarUnsignedIntTest(testName, bytes, expected, testThrows);
    }

    // Test all values that can be encoded in a single byte
    registerTest('Read all possible single-byte var unsigned int encodings', function() {
      for (let byte = 0; byte <= 0x7F; byte++) {
        varUnsignedIntBytesMatchValue([byte | 0x80], byte);
      }
    });

    readVarUnsignedInt([0x80], 0);
    readVarUnsignedInt([0x00, 0x81], 1);
    readVarUnsignedInt([0x00, 0x00, 0x81], 1);
    readVarUnsignedInt([0x00, 0x00, 0x00, 0x81], 1);

    readVarUnsignedInt([0x0E, 0xEB], 1899);
    readVarUnsignedInt([0x0E, 0xEC], 1900);

    overflowWhileReadingVarUnsignedInt([0x1F, 0x7F, 0x7F, 0x7F, 0xFF], maxValueForBits(33));
    overflowWhileReadingVarUnsignedInt([0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xFF], maxValueForBits(42));

    /**
     * VarInt
     *
     * Spec: http://amzn.github.io/ion-docs/docs/binary.html#varuint-and-varint-fields
     */

    let varSignedIntBytesMatchValue = function(bytes, expected) {
      let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
      let actual = ion.ParserBinaryRaw.readVarSignedIntFrom(binarySpan);
      assert.equal(actual, expected)
    };

    // The base test function called by the more specific flavors below.
    // Creates a test which will attempt to read the `expected` VarUInt from the provided input bytes, handling
    // any anticipated exceptions.
    let readVarSignedIntTest = function(testName, bytes, expected, throwsException) {
      let test = function() {
        varSignedIntBytesMatchValue(bytes, expected);
      };
      registerTest(testName, test, throwsException);
    };

    // Should read the `expected` VarUInt value from the provided input bytes.
    // Will fail if an exception is thrown or if the value that's read from the bytes is not equal to `expected`.
    let readVarSignedInt = function(bytes, expected) {
      let testName = 'Read var signed int ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      readVarSignedIntTest(testName, bytes, expected, testThrows);
    };

    // Should detect that overflow has occurred while reading and throw an exception.
    // Will fail if no exception is thrown.
    let overflowWhileReadingVarSignedInt = function(bytes, expected) {
      let testName = 'Overflow while attempting to read var signed int value ' + expected + ' from the bytes: ' + bytes;
      let testThrows = true;
      readVarSignedIntTest(testName, bytes, expected, testThrows);
    };

    registerTest('Read all positive, single-byte var signed int encodings.', function() {
      for (let byte = 0; byte <= 0x3F; byte++) {
        varSignedIntBytesMatchValue([byte | 0x80], byte);
      }
    });

    registerTest('Read all negative, single-byte var signed int encodings.', function() {
      for (let byte = 0; byte <= 0x3F; byte++) {
        varSignedIntBytesMatchValue([byte | 0xC0], -byte);
      }
    });

    readVarSignedInt([0x80], 0);
    readVarSignedInt([0xC0], -0);
    readVarSignedInt([0x81], 1);
    readVarSignedInt([0xC1], -1);
    readVarSignedInt([0x00, 0x81], 1);
    readVarSignedInt([0x40, 0x81], -1);

    readVarSignedInt([0x0E, 0xEB], 1899);
    readVarSignedInt([0x4E, 0xEB], -1899);
    readVarSignedInt([0x0E, 0xEC], 1900);
    readVarSignedInt([0x4E, 0xEC], -1900);

    readVarSignedInt([0x00, 0x00, 0x81], 1);
    readVarSignedInt([0x00, 0x00, 0x00, 0x81], 1);
    readVarSignedInt([0x3F, 0x7F, 0x7F, 0xFF], maxValueForBits(27));
    readVarSignedInt([0x7F, 0x7F, 0x7F, 0xFF], -maxValueForBits(27));

    overflowWhileReadingVarSignedInt([0x1F, 0x7F, 0x7F, 0x7F, 0xFF], maxValueForBits(33));
    overflowWhileReadingVarSignedInt([0x7F, 0x7F, 0x7F, 0x7F, 0x7F, 0xFF], -maxValueForBits(42));

    /**
     * Decimal
     *
     * Spec: http://amzn.github.io/ion-docs/docs/binary.html#5-decimal
     */

    let decimalBytesMatchValue = function(bytes, expected) {
      let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
      let actual = ion.ParserBinaryRaw.readDecimalValueFrom(binarySpan, bytes.length);
      // Use Decimal#equals(Decimal) to determine equality
      assert.isTrue(actual.equals(expected));
    };

    // Creates a test which will attempt to read the `expected` Decimal from the provided input bytes, handling
    // any anticipated exceptions.
    let readDecimalTest = function(testName, bytes, expected, throwsException) {
      let test = function() {
        decimalBytesMatchValue(bytes, expected);
      };
      registerTest(testName, test, throwsException);
    };

    // Should read the `expected` Decimal value from the provided input bytes.
    // Will fail if an exception is thrown or if the value that's read from the bytes is not equal to `expected`.
    let readDecimal = function(bytes, expected) {
      let testName = 'Read decimal ' + expected + ' from bytes: ' + bytes;
      let testThrows = false;
      readDecimalTest(testName, bytes, expected, testThrows);
    };

    // Test all single-byte coefficients -127 to 127 (signed Int) combined with each
    // single-byte exponent from -63 to 63 (signed VarInt)
    registerTest("Read all possible two-byte binary decimal encodings", function() {
      for (let coefficient = 0; coefficient <= maxValueForBits(7); coefficient++) {
        for (let exponent = 0; exponent <= maxValueForBits(6); exponent++) {
          decimalBytesMatchValue([0x80 | exponent, coefficient], new ion.Decimal(coefficient, exponent));
          decimalBytesMatchValue([0xC0 | exponent, coefficient], new ion.Decimal(coefficient, -exponent));
          decimalBytesMatchValue([0x80 | exponent, 0x80 | coefficient], new ion.Decimal(-coefficient, exponent));
          decimalBytesMatchValue([0xC0 | exponent, 0x80 | coefficient], new ion.Decimal(-coefficient, -exponent));
        }
      }
    });

    readDecimal([0x00, 0x81, 0x05], new ion.Decimal(5, 1));
    readDecimal([0x00, 0x00, 0x81, 0x05], new ion.Decimal(5, 1));

    readDecimal([0x40, 0x81, 0x00, 0x01], new ion.Decimal(1, -1));
    readDecimal([0x00, 0x00, 0x81, 0x80, 0x00, 0x01], new ion.Decimal(-1, 1));

    registerSuite(suite);
  }
);
