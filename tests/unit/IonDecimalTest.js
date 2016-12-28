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
 define(
  function(require) {
    const registerSuite = require('intern!object');
    const assert = require('intern/chai!assert');
    const ion = require('dist/Ion');

    var suite = {
      name: 'Decimal'
    };

    suite['Parses 56.789'] = function() {
      var decimal = ion.Decimal.parse("56.789");
      assert.equal(decimal.getExponent(), -3);
      assert.equal(decimal.getDigits().digits(), "56789");
      assert.deepEqual(decimal.getDigits().byteValue(), [0xdd, 0xd5]);
      assert.equal(decimal.stringValue(), "56.789");
      assert.isFalse(decimal.isNegative());
    }

    suite['Parses -1'] = function() {
      var decimal = ion.Decimal.parse("-1");
      assert.equal(decimal.getExponent(), 0);
      assert.equal(decimal.getDigits().digits(), "1");
      assert.deepEqual(decimal.getDigits().byteValue(), [1]);
      assert.equal(decimal.stringValue(), "-1");
      assert.isTrue(decimal.isNegative());
    }

    suite['Parses 123456000'] = function() {
      var decimal = ion.Decimal.parse("123456000");
      assert.equal(decimal.getExponent(), 3);
      assert.equal(decimal.getDigits().digits(), "123456");
      assert.deepEqual(decimal.getDigits().byteValue(), [0x01, 0xe2, 0x40]);
      assert.equal(decimal.stringValue(), "1.23456d8");
      assert.isFalse(decimal.isNegative());
    }

    suite['Strips trailing zeroes from 123456000'] = function() {
      assert.equal(ion.Decimal.stripTrailingZeroes('123456000'), '123456');
    }

    registerSuite(suite);
  }
);
