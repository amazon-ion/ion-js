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

    let readUnsignedIntTest = function(bytes, expected, throwsException) {
      let testName = throwsException
          ? 'Throw an exception while reading unsigned int ' + expected + ' from bytes: ' + bytes
          : 'Read unsigned int ' + expected + ' from bytes: ' + bytes;
      let test = function() {
        let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
        let actual = ion.ParserBinaryRaw.readUnsignedIntFrom(binarySpan, bytes.length);
        assert.equal(actual, expected)
      }
      registerTest(testName, test, throwsException);
    }

    // Expected to pass
    readUnsignedIntTest([0x00], 0);
    readUnsignedIntTest([0x01], 1);
    readUnsignedIntTest([0x0F], 15);
    readUnsignedIntTest([0x00, 0x00], 0);
    readUnsignedIntTest([0xFF,], Math.pow(2, 8) - 1);
    readUnsignedIntTest([0xFF, 0xFF], Math.pow(2, 16) - 1);
    readUnsignedIntTest([0xFF, 0xFF, 0xFF], Math.pow(2, 24) - 1);
    readUnsignedIntTest([0x7F, 0xFF, 0xFF, 0xFF], Math.pow(2, 31) - 1);

    // Expected to fail
    readUnsignedIntTest([], 1, true); // No input data
    readUnsignedIntTest([0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 32) - 1, true);
    readUnsignedIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 40) - 1, true);

    let readUnsignedLongIntTest = function(bytes, expected, throwsException) {
      let testName = throwsException
          ? 'Throw an exception while reading unsigned long int ' + expected + ' from bytes: ' + bytes
          : 'Read unsigned long int ' + expected + ' from bytes: ' + bytes;
      let test = function() {
        let binarySpan = new ion.BinarySpan(new Uint8Array(bytes));
        let actual = ion.ParserBinaryRaw.readUnsignedLongIntFrom(binarySpan, bytes.length);
        assert.equal(actual, expected)
      }
      registerTest(testName, test, throwsException);
    }

    readUnsignedLongIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 40) - 1);
    readUnsignedLongIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 48) - 1);
    readUnsignedLongIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 56) - 1);
    readUnsignedLongIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 64) - 1);
    readUnsignedLongIntTest([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF], Math.pow(2, 72) - 1);

    registerSuite(suite);
  }
);
