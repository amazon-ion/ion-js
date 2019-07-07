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

    registerSuite(suite);
  }
);
