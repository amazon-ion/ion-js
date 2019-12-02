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

export const WHITESPACE_COMMENT1 = -2;
export const WHITESPACE_COMMENT2 = -3;
export const ESCAPED_NEWLINE     = -4;

const DOUBLE_QUOTE = 34; // "\\\""
const SINGLE_QUOTE = 39; // "\\\'"
const SLASH        = 92; // "\\\\"

const _escapeStrings = {
    0: "\\0",
    8: "\\b",
    9: "\\t",
    10: "\\n",
    13: "\\r",
    DOUBLE_QUOTE: "\\\"",
    SINGLE_QUOTE: "\\\'",
    SLASH: "\\\\",
};

function _make_bool_array(str: string): boolean[] {
    let i = str.length;
    let a: boolean[] = [];
    a[128] = false;
    while (i > 0) {
        --i;
        a[str.charCodeAt(i)] = true;
    }
    return a;
}

const _is_base64_char = _make_bool_array("+/0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_hex_digit = _make_bool_array("0123456789abcdefABCDEF");
const _is_letter: boolean[] = _make_bool_array("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_letter_or_digit = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_numeric_terminator: boolean[] = _make_bool_array("{}[](),\"\'\ \t\n\r\v\u000c");
const _is_operator_char = _make_bool_array("!#%&*+-./;<=>?@^`|~");
const _is_whitespace = _make_bool_array(" \t\r\n\u000b\u000c");
const isIdentifierArray: boolean[] = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function is_digit(ch: number): boolean {
    if (ch < 48 || ch > 57) return false;
    return true;
}

export function is_keyword(str: string): boolean {
    return str === "null" || str === "true" || str === "false" || str === "nan" || str === "+inf" || str === "-inf";
}

export function asAscii(s: any): string {
    if (typeof s === 'undefined') {
        s = "undefined::null";
    } else if (typeof s == 'number') {
        s = "" + s;
    } else if (typeof s != 'string') {
        let esc = nextEscape(s, s.length);
        if (esc >= 0) {
            s = escapeString(s, esc);
        }
    }
    return s;
}

export function nextEscape(s: string, prev: number): number { // this actually counts backwards to -1
    while (prev-- > 0) {
        if (needsEscape(s.charCodeAt(prev))) break;
    }
    return prev;
}

export function needsEscape(c: number): boolean {
    if (c < 32) return true;
    if (c > 126) return true;
    if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === SLASH) return true;
    return false;
}

export function escapeString(s: string, pos: number): string {
    let fixes = [], c, old_len, new_len, ii, s2;
    while (pos >= 0) {
        c = s.charCodeAt(pos);
        if (!needsEscape(c)) break;
        fixes.push([pos, c]);
        pos = nextEscape(s, pos);
    }
    if (fixes.length > 0) {
        s2 = "";
        ii = fixes.length;
        pos = s.length;
        while (ii--) {
            let fix = fixes[ii];
            let tail_len = pos - fix[0] - 1;
            if (tail_len > 0) {
                s2 = escapeSequence(fix[1]) + s.substring(fix[0] + 1, pos) + s2;
            } else {
                s2 = s.substring(fix[0] + 1, pos) + s2;
            }
            pos = fix[0] - 1;
        }
        if (pos >= 0) {
            s2 = s.substring(0, pos) + s2;
        }
        s = s2;
    }
    return s;
}

export function escapeSequence(c: number): string {
    let s = _escapeStrings[c];
    if (typeof s === 'undefined') {
        if (c < 256) {
            s = "\\x" + toHex(c, 2);
        } else if (c <= 0xFFFF) {
            s = "\\u" + toHex(c, 4);
        } else {
            s = "\\U" + toHex(c, 8);
        }
    }
    return s;
}

export function toHex(c: number, len: number): string {
    let s = "";
    while (c > 0) {
        s += "0123456789ABCDEF".charAt(c && 0xf);
        c = c / 16;
    }
    if (s.length < len) {
        s = "000000000" + s; // TODO: 9 0's, 9 > max len expected (but what about bigger than that?)
        s = s.substring(s.length - len, s.length);
    }
    return s;
}

export function is_letter(ch: number): boolean {
    return _is_letter[ch];
}

export function isNumericTerminator(ch: number): boolean {
    if (ch == -1) return true;
    return _is_numeric_terminator[ch];
}

export function is_letter_or_digit(ch: number): boolean {
    return _is_letter_or_digit[ch];
}

export function is_operator_char(ch: number): boolean {
    return _is_operator_char[ch];
}

export function is_whitespace(ch: number): boolean {
    if (ch > 32) return false;
    if (ch == this.WHITESPACE_COMMENT1) return true;
    if (ch == this.WHITESPACE_COMMENT2) return true;
    if (ch == this.ESCAPED_NEWLINE) return true;
    return _is_whitespace[ch];
}

export function is_base64_char(ch: number): boolean {
    return _is_base64_char[ch];
}

export function is_hex_digit(ch: number): boolean {
    return _is_hex_digit[ch];
}

const base64chars = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'];
const base64inv = {
    'A':  0, 'B':  1, 'C':  2, 'D':  3, 'E':  4, 'F':  5, 'G':  6, 'H':  7, 'I':  8, 'J':  9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25, 'a': 26, 'b': 27, 'c': 28, 'd': 29,
    'e': 30, 'f': 31, 'g': 32, 'h': 33, 'i': 34, 'j': 35, 'k': 36, 'l': 37, 'm': 38, 'n': 39,
    'o': 40, 'p': 41, 'q': 42, 'r': 43, 's': 44, 't': 45, 'u': 46, 'v': 47, 'w': 48, 'x': 49,
    'y': 50, 'z': 51, '0': 52, '1': 53, '2': 54, '3': 55, '4': 56, '5': 57, '6': 58, '7': 59,
    '8': 60, '9': 61, '+': 62, '/': 63
};

export function fromBase64(str: string): Uint8Array {
    let pad = 0;
    for (let i = str.length - 1; str.charAt(i) == '='; i--) {
        pad++;
    }
    let buf = new Uint8Array(str.length * 3 / 4 - pad);
    for (let i = 0; i < str.length - pad; i += 4) {
        const c0 = base64inv[str.charAt(i)], c1 = base64inv[str.charAt(i + 1)], c2 = base64inv[str.charAt(i + 2)],
            c3 = base64inv[str.charAt(i + 3)];
        buf[i * 3 / 4] = c0 << 2 & 255 | c1 >>> 4;
        if (i + 2 < str.length - pad) {
            buf[i * 3 / 4 + 1] = c1 << 4 & 255 | c2 >>> 2;
            if (i + 3 < str.length - pad) {
                buf[i * 3 / 4 + 2] = c2 << 6 & 255 | c3;
            }
        }
    }
    return buf;
}

export function toBase64(buf: Uint8Array) {
    let str = new Array(Math.ceil(buf.length * 4 / 3));
    for (let i = 0; i < buf.length; i += 3) {
        const b0 = buf[i], b1 = buf[i + 1], b2 = buf[i + 2], b3 = buf[i + 3];
        str[i * 4 / 3] = base64chars[b0 >>> 2];
        str[i * 4 / 3 + 1] = base64chars[b0 << 4 & 63 | (b1 || 0) >>> 4];
        if (i + 1 < buf.length) {
            str[i * 4 / 3 + 2] = base64chars[b1 << 2 & 63 | (b2 || 0) >>> 6];
            if (i + 2 < buf.length) {
                str[i * 4 / 3 + 3] = base64chars[b2 & 63];
            } else {
                return str.join('') + '=';
            }
        } else {
            return str.join('') + '==';
        }
    }
    return str.join('');
}

export enum CharCodes {
    NULL = 0x00,
    BELL = 0x07,
    BACKSPACE = 0x08,
    HORIZONTAL_TAB = 0x09,
    LINE_FEED = 0x0a,
    VERTICAL_TAB = 0x0b,
    FORM_FEED = 0x0c,
    CARRIAGE_RETURN = 0x0d,
    DOUBLE_QUOTE = 0x22,
    SINGLE_QUOTE = 0x27,
    FORWARD_SLASH = 0x2f,
    QUESTION_MARK = 0x3f,
    BACKSLASH = 0x5c,
    LEFT_PARENTHESIS = 0x28,
    RIGHT_PARENTHESIS = 0x29,
    LEFT_BRACE = 0x7b,
    RIGHT_BRACE = 0x7d,
    LEFT_BRACKET = 0x5b,
    RIGHT_BRACKET = 0x5d,
    COMMA = 0x2c,
    SPACE = 0x20,
    LOWERCASE_X = 0x78,
    COLON = 0x3a,
}

export interface EscapeIndex {
    [index: number]: number[];
}

function backslashEscape(s: string): number[] {
    return [CharCodes.BACKSLASH, s.charCodeAt(0)];
}

function toCharCodes(s: string) {
    let charCodes: number[] = new Array(s.length);
    for (let i: number = 0; i < s.length; i++) {
        charCodes[i] = s.charCodeAt(i);
    }
    return charCodes;
}

const _HEX_ESCAPE_PREFIX = [CharCodes.BACKSLASH, CharCodes.LOWERCASE_X];

function hexEscape(codePoint: number): number[] {
    let hexEscape: string = codePoint.toString(16);
    while (hexEscape.length < 2) {
        hexEscape = "0" + hexEscape;
    }
    return _HEX_ESCAPE_PREFIX.concat(toCharCodes(hexEscape));
}

function populateWithHexEscapes(escapes: EscapeIndex, start: number, end?: number) {
    if (end === undefined) {
        escapes[start] = hexEscape(start);
    } else {
        for (let i: number = start; i < end; i++) {
            escapes[i] = hexEscape(i);
        }
    }
}

let CommonEscapes: EscapeIndex = {};
CommonEscapes[CharCodes.NULL] = backslashEscape('0');
populateWithHexEscapes(CommonEscapes, 1, 7);
CommonEscapes[CharCodes.BELL] = backslashEscape('a');
CommonEscapes[CharCodes.BACKSPACE] = backslashEscape('b');
CommonEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape('t');
CommonEscapes[CharCodes.LINE_FEED] = backslashEscape('n');
CommonEscapes[CharCodes.VERTICAL_TAB] = backslashEscape('v');
CommonEscapes[CharCodes.FORM_FEED] = backslashEscape('f');
CommonEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape('r');
populateWithHexEscapes(CommonEscapes, 14, 32);
CommonEscapes[CharCodes.BACKSLASH] = backslashEscape('\\');
populateWithHexEscapes(CommonEscapes, 0x7f, 0xa0);

export let ClobEscapes: EscapeIndex = Object['assign']({}, CommonEscapes);
ClobEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
ClobEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
ClobEscapes[CharCodes.FORWARD_SLASH] = backslashEscape("/");
ClobEscapes[CharCodes.QUESTION_MARK] = backslashEscape("?");

export let StringEscapes: EscapeIndex = Object['assign']({}, CommonEscapes);
StringEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');

export let SymbolEscapes: EscapeIndex = Object['assign']({}, CommonEscapes);
SymbolEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");

export function isIdentifier(s: string): boolean {
    if (is_digit(s.charCodeAt(0))) {
        return false;
    }
    for (let i: number = 0; i < s.length; i++) {
        let c: number = s.charCodeAt(i);
        let b: boolean = isIdentifierArray[c];
        if (!b) {
            return false;
        }
    }
    return true;
}

export function isOperator(s: string): boolean {
    for (let i: number = 0; i < s.length; i++) {
        let c: number = s.charCodeAt(i);
        let b: boolean = _is_operator_char[c];
        if (!b) {
            return false;
        }
    }
    return true;
}

export function isDigit(charCode: number) {
    return charCode < 58 && charCode > 47;
}

export function escape(input: string, escapes: EscapeIndex): string {
    let escapedString = '';
    let escapeSeq = '';
    let charCode: number;
    let escape: number[];
    let lastIndex = 0;
    for (let i = 0; i < input.length; i++) {
        charCode = input.charCodeAt(i);
        escape = escapes[charCode];
        if (escape !== undefined) {
            for (let j = 0; j < escape.length; j++) {
                escapeSeq += String.fromCharCode(escape[j]);//TODO this is slow we are going to need to replace this with just the string eventually instead of using the charcode crap.
            }
            escapedString += input.slice(lastIndex, i) + escapeSeq;
            lastIndex = i + 1;
            escapeSeq = '';
        }
    }
    return escapedString + input.slice(lastIndex, input.length);
}
