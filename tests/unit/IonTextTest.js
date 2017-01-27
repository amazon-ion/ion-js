/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
      name: 'Text'
    };

    var stringToCharCodes = function(value) {
        var charCodes = new Array(value.length);
        for (var i = 0; i < value.length; i++) {
          charCodes[i] = value.charCodeAt(i);
        }
        return charCodes;
    }

    var base64Test = function(value, expected) {
      suite[`${value} encoded in base64 is ${expected}`] = function() {
        var charCodes = stringToCharCodes(value);
        assert.equal(ion.toBase64(charCodes), expected);
      };
    };

    base64Test("M", "TQ==");
    base64Test("Ma", "TWE=");
    base64Test("Man", "TWFu");
    base64Test("ManM", "TWFuTQ==");
    base64Test("ManMa", "TWFuTWE=");
    base64Test("ManMan", "TWFuTWFu");

    registerSuite(suite);
  }
);
