/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {assert} from 'chai';
import * as ion from '../src/Ion';
import * as IonText from '../src/IonText';

let stringToCharCodes = function (text: string): Uint8Array {
    let charCodes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
        charCodes[i] = text.charCodeAt(i);
    }
    return charCodes;
};

let base64Test = function (text: string, expected: string) {
    let msg = text + ' encoded in base64 is ' + expected;
    it(msg, () => {
        let charCodes = stringToCharCodes(text);
        assert.equal(ion.toBase64(charCodes), expected);
    });
};

let isIdentifierTest = function (text: string, expected) {
    let name = text + ' ' + (expected ? 'is' : 'is not') + ' an identifier';
    it(name, () => {
        assert.equal(IonText.isIdentifier(text), expected);
    });
};

let isOperatorTest = function (text: string, expected) {
    let name = text + ' ' + (expected ? 'is' : 'is not') + ' an operator';
    it(name, () => {
        assert.equal(IonText.isOperator(text), expected);
    });
};

let escapeTest = (ch, expected) => {
    let value = String.fromCharCode(ch);
    it('escape(chr(' + ch + '), ClobEscapes)', () => {
        assert.equal(IonText.escape(value, IonText.ClobEscapes), expected);
    });
    it('escape(chr(' + ch + '), StringEscapes)', () => {
        assert.equal(IonText.escape(value, IonText.StringEscapes), expected);
    });
    it('escape(chr(' + ch + '), SymbolEscapes)', () => {
        assert.equal(IonText.escape(value, IonText.SymbolEscapes), expected);
    });
};

describe('IonText', () => {
    describe('base64 encoding', () => {
        base64Test("M", "TQ==");
        base64Test("Ma", "TWE=");
        base64Test("Man", "TWFu");
        base64Test("ManM", "TWFuTQ==");
        base64Test("ManMa", "TWFuTWE=");
        base64Test("ManMan", "TWFuTWFu");
    });
    describe('Detecting identifiers', () => {
        isIdentifierTest('$', true);
        isIdentifierTest('0$', false);
        isIdentifierTest('abc123', true);
        isIdentifierTest('_', true);
        isIdentifierTest('{}', false);
    });
    describe('Detecting operators', () => {
        isOperatorTest('!', true);
        isOperatorTest('!!', true);
        isOperatorTest('a', false);
        isOperatorTest('a!', false);
        isOperatorTest('!a', false);
        isOperatorTest('<=>', true);
    });
    describe('Escaping strings', () => {
        for (let i = 0; i < 32; i++) {
            let expected;
            switch (i) {
                case  0:
                    expected = '\\0';
                    break;
                case  7:
                    expected = '\\a';
                    break;
                case  8:
                    expected = '\\b';
                    break;
                case  9:
                    expected = '\\t';
                    break;
                case 10:
                    expected = '\\n';
                    break;
                case 11:
                    expected = '\\v';
                    break;
                case 12:
                    expected = '\\f';
                    break;
                case 13:
                    expected = '\\r';
                    break;
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
    });
});