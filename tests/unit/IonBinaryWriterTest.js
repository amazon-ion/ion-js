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
      debugger;
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

    registerSuite(suite);
  }
);
