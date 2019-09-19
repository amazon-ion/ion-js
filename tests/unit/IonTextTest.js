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
    const ion = require('dist/amd/es6/Ion');
    const ionText = require('dist/amd/es6/IonText');

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
        let msg = value + ' encoded in base64 is ' + expected;
      suite[msg] = function() {
        let charCodes = stringToCharCodes(value);
        assert.equal(ion.toBase64(charCodes), expected);
      };
    };

    base64Test("M", "TQ==");
    base64Test("Ma", "TWE=");
    base64Test("Man", "TWFu");
    base64Test("ManM", "TWFuTQ==");
    base64Test("ManMa", "TWFuTWE=");
    base64Test("ManMan", "TWFuTWFu");

    var isIdentifierTest = function(value, expected) {
      var suiteName = value + ' ' + (expected ? 'is' : 'is not') + ' an identifier';
      suite[suiteName] = function() {
        assert.equal(ionText.isIdentifier(value), expected);
      }
    }

    isIdentifierTest('$', true);
    isIdentifierTest('0$', false);
    isIdentifierTest('abc123', true);
    isIdentifierTest('_', true);
    isIdentifierTest('{}', false);

    var isOperatorTest = function(value, expected) {
      var suiteName = value + ' ' + (expected ? 'is' : 'is not') + ' an operator';
      suite[suiteName] = function() {
        assert.equal(ionText.isOperator(value), expected);
      }
    }

    isOperatorTest('!', true);
    isOperatorTest('!!', true);
    isOperatorTest('a', false);
    isOperatorTest('a!', false);
    isOperatorTest('!a', false);
    isOperatorTest('<=>', true);

    let escapeTest = (ch, expected) => {
        let value = String.fromCharCode(ch);
        suite['escape(chr(' + ch + '), ClobEscapes)'] = () => assert.equal(
            ionText.escape(value, ionText.ClobEscapes), expected);
        suite['escape(chr(' + ch + '), StringEscapes)'] = () => assert.equal(
            ionText.escape(value, ionText.StringEscapes), expected);
        suite['escape(chr(' + ch + '), SymbolEscapes)'] = () => assert.equal(
            ionText.escape(value, ionText.SymbolEscapes), expected);
    };
    for (let i = 0; i < 32; i++) {
        let expected;
        switch (i) {
            case  0: expected = '\\0'; break;
            case  7: expected = '\\a'; break;
            case  8: expected = '\\b'; break;
            case  9: expected = '\\t'; break;
            case 10: expected = '\\n'; break;
            case 11: expected = '\\v'; break;
            case 12: expected = '\\f'; break;
            case 13: expected = '\\r'; break;
            default:
                let hex = i.toString(16);
                expected = '\\x' + '0'.repeat(2 - hex.length) + hex;
        }
        escapeTest(i, expected);
    }
    escapeTest(0x7e, '~');     // not escaped
    escapeTest(0x7f, '\\x7f');
    escapeTest(0x9f, '\\x9f');
    escapeTest(0xa0, '\xa0');  // not escaped

    registerSuite(suite);
  }
);
