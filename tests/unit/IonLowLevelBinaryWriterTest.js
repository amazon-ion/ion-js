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

    var suite = {
      name: 'Low-Level Binary Writer'
    };

    var createWriter = function(writeable) {
        return new ion.LowLevelBinaryWriter(writeable);
    }

    var writeUnsignedIntTest = function(value, expected, exception) {
      var testName = 'Write unsigned int ' + value.toString();
      var test = function() {
        var writeable = new ion.Writeable();
        var writer = createWriter(writeable);
        writer.writeUnsignedInt(value);
        var actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(expected));
      };
      suite[testName] = exception
        ? function() { assert.throws(test, Error); }
        : test;
    };

    writeUnsignedIntTest(0, [0]);
    writeUnsignedIntTest(255, [255]);
    writeUnsignedIntTest(256, [1, 0]);
    writeUnsignedIntTest(256, null, true);

    var writeSignedIntTest = function(value, expected, exception) {
      var testName = 'Write signed int ' + value.toString();
      var test = function() {
        var writeable = new ion.Writeable();
        var writer = createWriter(writeable);
        writer.writeSignedInt(value);
        var actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(expected));
      };
      suite[testName] = exception ? function() { assert.throws(test, Error); } : test;
    }

    writeSignedIntTest(0, [0]);
    writeSignedIntTest(-1, [0x81]);
    writeSignedIntTest(1, [1]);
    writeSignedIntTest(-127, [0xFF]);
    writeSignedIntTest(127, [0x7F]);
    writeSignedIntTest(-128, [0x80, 0x80]);
    writeSignedIntTest(-128, undefined, true);
    writeSignedIntTest(128, [0x80]);
    writeSignedIntTest(-256, [0x81, 0x00]);
    writeSignedIntTest(256, [0x01, 0x00]);

    var writeVariableLengthUnsignedIntTest = function(value, expected) {
      var testName = 'Write variable length unsigned int ' + value.toString();
      suite[testName] = function() {
        var writeable = new ion.Writeable();
        var writer = createWriter(writeable);
        writer.writeVariableLengthUnsignedInt(value, writeable);
        var actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(expected));
      };
    }

    writeVariableLengthUnsignedIntTest(0, [0x80]);
    writeVariableLengthUnsignedIntTest(1, [0x81]);
    writeVariableLengthUnsignedIntTest(127, [0xFF]);
    writeVariableLengthUnsignedIntTest(128, [0x01, 0x80]);
    writeVariableLengthUnsignedIntTest(255, [0x01, 0xFF]);
    writeVariableLengthUnsignedIntTest(256, [0x02, 0x80]);
    writeVariableLengthUnsignedIntTest(16383, [0x7F, 0xFF]);
    writeVariableLengthUnsignedIntTest(16384, [0x01, 0x00, 0x80]);

    var writeVariableLengthSignedIntTest = function(value, expected, exception) {
      var testName = 'Write variable length signed int ' + value.toString();
      var test = function() {
        var writeable = new ion.Writeable();
        var writer = createWriter(writeable);
        writer.writeVariableLengthSignedInt(value, writeable);
        var actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(expected));
      };
      suite[testName] = exception
        ? function() { assert.throws(test, Error); }
        : test;
    }

    writeVariableLengthSignedIntTest(0, [0x80]);
    writeVariableLengthSignedIntTest(1, [0x81]);
    writeVariableLengthSignedIntTest(-1, [0xC1]);
    writeVariableLengthSignedIntTest(63, [0xBF]);
    writeVariableLengthSignedIntTest(-63, [0xFF]);
    writeVariableLengthSignedIntTest(64, [0x00, 0xC0]);
    writeVariableLengthSignedIntTest(-64, [0x40, 0xC0]);
    writeVariableLengthSignedIntTest(128, [0x01, 0x80]);
    writeVariableLengthSignedIntTest(-128, [0x41, 0x80]);
    writeVariableLengthSignedIntTest(8191, [0x3F, 0xFF]);
    writeVariableLengthSignedIntTest(-8191, [0x7F, 0xFF]);
    writeVariableLengthSignedIntTest(8192, [0x00, 0x40, 0x80]);
    writeVariableLengthSignedIntTest(-8192, [0x40, 0x40, 0x80]);
    writeVariableLengthSignedIntTest(16384, [0x01, 0x00, 0x80]);
    writeVariableLengthSignedIntTest(-16384, [0x41, 0x00, 0x80]);
    writeVariableLengthSignedIntTest(1.5, undefined, true);
    writeVariableLengthSignedIntTest(1.0, undefined, true);

    var sizeOfVariableLengthUnsignedIntTest = function(value, expected) {
      var testName = "Size of variable length unsigned int " + value.toString() + " is " + expected.toString();
      suite[testName] = function() {
        assert.equal(ion.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(value), expected);
      };
    };

    sizeOfVariableLengthUnsignedIntTest(0, 1);
    sizeOfVariableLengthUnsignedIntTest(1, 1);
    sizeOfVariableLengthUnsignedIntTest(2, 1);
    sizeOfVariableLengthUnsignedIntTest(127, 1);
    sizeOfVariableLengthUnsignedIntTest(128, 2);
    sizeOfVariableLengthUnsignedIntTest(255, 2);
    sizeOfVariableLengthUnsignedIntTest(256, 2);
    sizeOfVariableLengthUnsignedIntTest(16383, 2);
    sizeOfVariableLengthUnsignedIntTest(16384, 3);
    sizeOfVariableLengthUnsignedIntTest(0, 1);
    sizeOfVariableLengthUnsignedIntTest(0, 1);
    sizeOfVariableLengthUnsignedIntTest(0, 1);

    var sizeOfVariableLengthSignedIntTest = function(value, expected) {
      var testName = 'Size of variable length signed int ' + value.toString() + ' is ' + expected.toString();
      suite[testName] = function() {
        assert.equal(ion.LowLevelBinaryWriter.getVariableLengthSignedIntSize(value), expected);
      }
    }

    sizeOfVariableLengthSignedIntTest(0, 1);
    sizeOfVariableLengthSignedIntTest(-0, 1);
    sizeOfVariableLengthSignedIntTest(1, 1);
    sizeOfVariableLengthSignedIntTest(-1, 1);
    sizeOfVariableLengthSignedIntTest(63, 1);
    sizeOfVariableLengthSignedIntTest(-63, 1);
    sizeOfVariableLengthSignedIntTest(64, 2);
    sizeOfVariableLengthSignedIntTest(-64, 2);
    sizeOfVariableLengthSignedIntTest(63, 1);
    sizeOfVariableLengthSignedIntTest(8191, 2);
    sizeOfVariableLengthSignedIntTest(-8191, 2);
    sizeOfVariableLengthSignedIntTest(8192, 3);
    sizeOfVariableLengthSignedIntTest(-8192, 3);

    var sizeOfUnsignedIntTest = function(value, expected) {
      var testName = 'Size of unsigned int ' + value.toString() + ' is ' + expected.toString();
      suite[testName] = function() {
        assert.equal(ion.LowLevelBinaryWriter.getUnsignedIntSize(value), expected);
      }
    }

    sizeOfUnsignedIntTest(0, 1);
    sizeOfUnsignedIntTest(255, 1);
    sizeOfUnsignedIntTest(256, 2);
    sizeOfUnsignedIntTest(65535, 2);
    sizeOfUnsignedIntTest(65536, 3);

    registerSuite(suite);
  }
);
