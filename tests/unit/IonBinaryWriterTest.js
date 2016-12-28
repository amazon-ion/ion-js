/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
 define(
  function(require) {
    const registerSuite = require('intern!object');
    const assert = require('intern/chai!assert');
    const ion = require('dist/Ion');

    var suite = {
      name: 'Binary Writer'
    };

    var bytes = function(array) {
      return new Uint8Array(array);
    };

    suite['writeIvm'] = function() {
      var writeable = new ion.Writeable();
      var writer = new ion.BinaryWriter(writeable);
      writer.writeIvm();
      assert.deepEqual(bytes([0xE0, 0x01, 0x00, 0xEA]), writeable.getBytes());
    };

    var writeUnsignedInt = function(value, length, expected) {
      var writeable = new ion.Writeable();
      var writer = new ion.BinaryWriter(writeable);
      writer.writeUnsignedInt(value, length);
      var actual = writeable.getBytes();
      assert.deepEqual(actual, expected);
    };

    suite['writeUnsignedInt0,1'] = function() {
      writeUnsignedInt(0, 1, bytes([0]));
    };

    suite['writeUnsignedInt0,2'] = function() {
      writeUnsignedInt(0, 2, bytes([0, 0]));
    };

    suite['writeUnsignedInt255,1'] = function() {
      writeUnsignedInt(255, 1, bytes([255]));
    };

    suite['writeUnsignedInt255,2'] = function() {
      writeUnsignedInt(255, 2, bytes([0, 255]));
    };

    suite['writeUnsignedInt256,2'] = function() {
      writeUnsignedInt(256, 2, bytes([1, 0]));
    };

    suite['writeUnsignedInt256,1'] = function() {
      let error = false;
      try {
        writeUnsignedInt(256, 1, null);
      } catch (e) {
        error = true;
      }
      assert.isTrue(error);
    };

    var writeSignedInt = function(value, length, expected) {
      var writeable = new ion.Writeable();
      var writer = new ion.BinaryWriter(writeable);
      writer.writeSignedInt(value, length);
      var actual = writeable.getBytes();
      assert.deepEqual(actual, expected);
    }

    suite['writeSignedInt0,1'] = function() {
      writeSignedInt(0, 1, bytes([0]));
    };

    suite['writeSignedInt0,2'] = function() {
      writeSignedInt(0, 2, bytes([0, 0]));
    };

    suite['writeSignedInt-1,1'] = function() {
      writeSignedInt(-1, 1, bytes([0x81]));
    };

    suite['writeSignedInt-1,2'] = function() {
      writeSignedInt(-1, 2, bytes([0x80, 0x01]));
    };

    suite['writeSignedInt1,1'] = function() {
      writeSignedInt(1, 1, bytes([1]));
    };

    suite['writeSignedInt1,2'] = function() {
      writeSignedInt(1, 2, bytes([0, 1]));
    };

    suite['writeSignedInt-127,1'] = function() {
      writeSignedInt(-127, 1, bytes([0xFF]));
    };

    suite['writeSignedInt-127,3'] = function() {
      writeSignedInt(-127, 3, bytes([0x80, 0x00, 0x7F]));
    };

    suite['writeSignedInt127,1'] = function() {
      writeSignedInt(127, 1, bytes([0x7F]));
    };

    suite['writeSignedInt-128, 2'] = function() {
      writeSignedInt(-128, 2, bytes([0x80, 0x80]));
    };

    suite['writeSignedInt-128, 1'] = function() {
      let error = false;
      try {
        writeSignedInt(-128, 1, null);
      } catch (e) {
        error = true;
      }
      assert.isTrue(error);
    };

    suite['writeSignedInt128,2'] = function() {
       writeSignedInt(128, 2, bytes([0x00, 0x80]));
    };

    suite['writeSignedInt-256,2'] = function() {
       writeSignedInt(-256, 2, bytes([0x81, 0x00]));
    };

    suite['writeSignedInt256,2'] = function() {
       writeSignedInt(256, 2, bytes([0x01, 0x00]));
    };

    var writeVariableLengthUnsignedInt = function(value, expected) {
      var writeable = new ion.Writeable();
      var writer = new ion.BinaryWriter(writeable);
      writer.writeVariableLengthUnsignedInt(value);
      var actual = writeable.getBytes();
      assert.deepEqual(actual, expected);
    }

    suite['writeVariableLengthUnsignedInt0'] = function() {
       writeVariableLengthUnsignedInt(0, bytes([0x80]));
    };

    suite['writeVariableLengthUnsignedInt1'] = function() {
       writeVariableLengthUnsignedInt(1, bytes([0x81]));
    };

    suite['writeVariableLengthUnsignedInt127'] = function() {
       writeVariableLengthUnsignedInt(127, bytes([0xFF]));
    };

    suite['writeVariableLengthUnsignedInt128'] = function() {
       writeVariableLengthUnsignedInt(128, bytes([0x01, 0x80]));
    };

    suite['writeVariableLengthUnsignedInt255'] = function() {
       writeVariableLengthUnsignedInt(255, bytes([0x01, 0xFF]));
    };

    suite['writeVariableLengthUnsignedInt256'] = function() {
       writeVariableLengthUnsignedInt(256, bytes([0x02, 0x80]));
    };

    suite['writeVariableLengthUnsignedInt16383'] = function() {
       writeVariableLengthUnsignedInt(16383, bytes([0x7F, 0xFF]));
    };

    suite['writeVariableLengthUnsignedInt16384'] = function() {
       writeVariableLengthUnsignedInt(16384, bytes([0x01, 0x00, 0x80]));
    };

    var writeVariableLengthSignedInt = function(value, expected) {
      var writeable = new ion.Writeable();
      var writer = new ion.BinaryWriter(writeable);
      writer.writeVariableLengthSignedInt(value);
      var actual = writeable.getBytes();
      assert.deepEqual(actual, expected);
    }

    suite['writeVariableLengthSignedInt0'] = function() {
      writeVariableLengthSignedInt(0, bytes([0x80]));
    };

    suite['writeVariableLengthSignedInt1'] = function() {
      writeVariableLengthSignedInt(1, bytes([0x81]));
    };

    suite['writeVariableLengthSignedInt-1'] = function() {
      writeVariableLengthSignedInt(-1, bytes([0xC1]));
    };

    suite['writeVariableLengthSignedInt63'] = function() {
      writeVariableLengthSignedInt(63, bytes([0xBF]));
    };

    suite['writeVariableLengthSignedInt-63'] = function() {
      writeVariableLengthSignedInt(-63, bytes([0xFF]));
    };

    suite['writeVariableLengthSignedInt64'] = function() {
      writeVariableLengthSignedInt(64, bytes([0x00, 0xC0]));
    };

    suite['writeVariableLengthSignedInt-64'] = function() {
      writeVariableLengthSignedInt(-64, bytes([0x40, 0xC0]));
    };

    suite['writeVariableLengthSignedInt128'] = function() {
      writeVariableLengthSignedInt(128, bytes([0x01, 0x80]));
    };

    suite['writeVariableLengthSignedInt-128'] = function() {
      writeVariableLengthSignedInt(-128, bytes([0x41, 0x80]));
    };

    suite['writeVariableLengthSignedInt8191'] = function() {
      writeVariableLengthSignedInt(8191, bytes([0x3F, 0xFF]));
    };

    suite['writeVariableLengthSignedInt-8191'] = function() {
      writeVariableLengthSignedInt(-8191, bytes([0x7F, 0xFF]));
    };

    suite['writeVariableLengthSignedInt8192'] = function() {
      writeVariableLengthSignedInt(8192, bytes([0x00, 0x40, 0x80]));
    };

    suite['writeVariableLengthSignedInt-8192'] = function() {
      writeVariableLengthSignedInt(-8192, bytes([0x40, 0x40, 0x80]));
    };

    suite['writeVariableLengthSignedInt16384'] = function() {
      writeVariableLengthSignedInt(16384, bytes([0x01, 0x00, 0x80]));
    };

    suite['writeVariableLengthSignedInt-16384'] = function() {
      writeVariableLengthSignedInt(-16384, bytes([0x41, 0x00, 0x80]));
    };

    suite['writeVariableLengthSignedInt1.5'] = function() {
      assert.throws(
        () => writeVariableLengthSignedInt(1.5, null),
        Error
      );
    };

    suite['writeVariableLengthSignedInt1.0'] = function() {
      assert.throws(
        () => writeVariableLengthSignedInt(1.0, null),
        Error
      );
    };

    suite['Size of unsigned int 0 is 1'] = function() {
      assert.equal(1, ion.BinaryWriter.getVariableLengthUnsignedIntSize(0));
    }

    suite['Size of unsigned int 1 is 1'] = function() {
      assert.equal(1, ion.BinaryWriter.getVariableLengthUnsignedIntSize(1));
    }

    suite['Size of unsigned int 2 is 1'] = function() {
      assert.equal(1, ion.BinaryWriter.getVariableLengthUnsignedIntSize(2));
    }

    suite['Size of unsigned int 127 is 1'] = function() {
      assert.equal(1, ion.BinaryWriter.getVariableLengthUnsignedIntSize(127));
    }

    suite['Size of unsigned int 128 is 2'] = function() {
      assert.equal(2, ion.BinaryWriter.getVariableLengthUnsignedIntSize(128));
    }

    suite['Size of unsigned int 255 is 2'] = function() {
      assert.equal(2, ion.BinaryWriter.getVariableLengthUnsignedIntSize(255));
    }

    suite['Size of unsigned int 256 is 2'] = function() {
      assert.equal(2, ion.BinaryWriter.getVariableLengthUnsignedIntSize(256));
    }

    suite['Size of unsigned int 16383 is 2'] = function() {
      assert.equal(2, ion.BinaryWriter.getVariableLengthUnsignedIntSize(16383));
    }

    suite['Size of unsigned int 16384 is 3'] = function() {
      assert.equal(3, ion.BinaryWriter.getVariableLengthUnsignedIntSize(16384));
    }

    var sizeOfVariableLengthSignedIntTest = function(value, expected) {
      var testName = 'Size of signed int ' + value.toString() + ' is ' + expected.toString();
      suite[testName] = function() {
        assert.equal(expected, ion.BinaryWriter.getVariableLengthSignedIntSize(value));
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

    registerSuite(suite);
  }
);
