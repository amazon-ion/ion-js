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
      name: 'Binary'
    };

    var bitsTest = function(offset, count, expected) {
      var testName = "Offset " + offset.toString() + " and count " + count.toString() + " yields " + expected.toString(2);
      suite[testName] = function() {
        var bits = [0b10101100, 0b11110000];
        var actual = ion.getBits(bits, offset, count);
        assert.equal(actual, expected);
      }
    }

    bitsTest(0, 1, 0b1);
    bitsTest(1, 1, 0b0);
    bitsTest(2, 1, 0b1);
    bitsTest(3, 1, 0b0);
    bitsTest(7, 1, 0b0);
    bitsTest(8, 1, 0b1);
    bitsTest(15, 1, 0b0);
    bitsTest(0, 2, 0b10);
    bitsTest(5, 2, 0b10);
    bitsTest(6, 2, 0b00);
    bitsTest(7, 2, 0b01);
    bitsTest(8, 2, 0b11);
    bitsTest(14, 2, 0b00);
    bitsTest(0, 3, 0b101);
    bitsTest(1, 3, 0b010);
    bitsTest(4, 3, 0b110);
    bitsTest(5, 3, 0b100);
    bitsTest(6, 3, 0b001);
    bitsTest(7, 3, 0b011);
    bitsTest(8, 3, 0b111);
    bitsTest(9, 3, 0b111);
    bitsTest(12, 3, 0b000);

    registerSuite(suite);
  }
);
