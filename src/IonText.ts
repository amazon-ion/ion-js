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
import { isUndefined } from "./IonUtilities";

export const WHITESPACE_COMMENT1 = -2;
export const WHITESPACE_COMMENT2 = -3;
export const ESCAPED_NEWLINE     = -4;

const DOUBLE_QUOTE = 34; // "\\\""
const SINGLE_QUOTE = 39; // "\\\'"
const SLASH =        92; // "\\\\"

const _escapeStrings = {
  0 : "\\0",
  8 : "\\b",
  9 : "\\t",
  10 : "\\n",
  13 : "\\r",
  DOUBLE_QUOTE: "\\\"",
  SINGLE_QUOTE: "\\\'",
  SLASH: "\\\\",
};

function _make_bool_array(str: string) : boolean[] {
  let i = str.length
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

export function is_digit(ch: number) : boolean {
  if (ch < 48 || ch > 57) return false;
  return true;
}

export function asAscii(s: any) : string {
  if (typeof s === 'undefined') {
    s = "undefined::null";
  }
  else if (typeof s == 'number') {
    s = ""+s;
  }
  else if (typeof s != 'string') {
    var esc = nextEscape(s, s.length);
    if (esc >= 0) {
      s = escapeString(s, esc);
    }
  }
  return s;
}

export function nextEscape(s: string, prev: number) : number { // this actually counts backwards to -1
  while (prev-- > 0) {
    if (needsEscape(s.charCodeAt(prev))) break;
  }
  return prev;
}

export function needsEscape(c: number) : boolean {
  if (c < 32) return true;
  if (c > 126) return true;
  if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === SLASH) return true;
  return false;
}

export function escapeString(s: string, pos: number) : string {
  var fixes = [], c, old_len, new_len, ii, s2;
  while (pos >= 0) {
    c = s.charCodeAt(pos);
    if (!needsEscape(c)) break;
    fixes.push([pos, c]);
    pos = nextEscape(s, pos);
  }
  if (fixes.length > 0) {
    s2 = "";
    ii=fixes.length;
    pos = s.length;
    while (ii--) {
      let fix = fixes[ii];
      let tail_len = pos - fix[0] - 1;
      if (tail_len > 0) {
        s2 = escapeSequence(fix[1]) + s.substring(fix[0]+1,pos) + s2;
      }
      else {
        s2 = s.substring(fix[0]+1,pos) + s2;
      }
      pos = fix[0] - 1;
    }
    if (pos >= 0) {
      s2 = s.substring(0,pos) + s2;
    }
    s = s2;
  }
  return s;
}

export function escapeSequence(c: number) : string {
  var s = _escapeStrings[c];
  if (typeof s === 'undefined') {
    if (c < 256) {
      s = "\\x" + toHex(c,2);
    }
    else if (c <= 0xFFFF) {
      s = "\\u" + toHex(c,4);
    }
    else {
      s = "\\U" + toHex(c,8);
    }
  }
  return s;
}

export function toHex(c: number, len: number) : string {
  var s = "";
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

export function is_letter(ch: number) : boolean {
  return _is_letter[ch];
}

export function is_numeric_terminator(ch: number) : boolean {
  if (ch == -1) return true;
  return _is_numeric_terminator[ch];
}

export function is_letter_or_digit(ch: number) : boolean {
  return _is_letter_or_digit[ch];
}

export function is_operator_char(ch: number) : boolean {
  return _is_operator_char[ch];
}

export function is_whitespace(ch: number) : boolean {
  if (ch > 32) return false;
  if (ch == this.WHITESPACE_COMMENT1) return true;
  if (ch == this.WHITESPACE_COMMENT2) return true;
  if (ch == this.ESCAPED_NEWLINE)     return true;
  return _is_whitespace[ch];
}

export function is_base64_char(ch: number) : boolean {
  return _is_base64_char[ch];
}

export function is_hex_digit(ch: number) : boolean {
  return _is_hex_digit[ch];
}

let BASE64: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
let BASE64_PADDING = "=";

const TWO_BIT_MASK: number = 0x3;
const FOUR_BIT_MASK: number = 0xF;
const SIX_BIT_MASK: number = 0x3F;

export function toBase64(value: number[]) {
  let result: string = "";

  let i: number = 0;
  for (; i < value.length - 2; i += 3) {
    let octet1 = value[i];
    let octet2 = value[i + 1];
    let octet3 = value[i + 2];

    let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
    let index2 = ((octet1 & TWO_BIT_MASK) << 4) | ((octet2 >>> 4) & FOUR_BIT_MASK);
    let index3 = ((octet2 & FOUR_BIT_MASK) << 2) | ((octet3 >>> 6) & TWO_BIT_MASK);
    let index4 = octet3 & SIX_BIT_MASK;

    result += BASE64[index1];
    result += BASE64[index2];
    result += BASE64[index3];
    result += BASE64[index4];
  }

  if ((value.length - i) === 2) {
    let octet1 = value[i];
    let octet2 = value[i + 1];

    let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
    let index2 = ((octet1 & TWO_BIT_MASK) << 4) | ((octet2 >>> 4) & FOUR_BIT_MASK);
    let index3 = (octet2 & FOUR_BIT_MASK) << 2;

    result += BASE64[index1];
    result += BASE64[index2];
    result += BASE64[index3];
    result += BASE64_PADDING;
  } else if ((value.length - i) === 1) {
    let octet1 = value[i];

    let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
    let index2 = (octet1 & TWO_BIT_MASK) << 4;

    result += BASE64[index1]
    result += BASE64[index2]
    result += BASE64_PADDING;
    result += BASE64_PADDING;
  }

  return result;
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
  LEFT_PARENTHESIS = '('.charCodeAt(0),
  RIGHT_PARENTHESIS = ')'.charCodeAt(0),
  LEFT_BRACE = '{'.charCodeAt(0),
  RIGHT_BRACE = '}'.charCodeAt(0),
  LEFT_BRACKET = '['.charCodeAt(0),
  RIGHT_BRACKET = ']'.charCodeAt(0),
  COMMA = ','.charCodeAt(0),
  SPACE = ' '.charCodeAt(0),
  LOWERCASE_U = 'u'.charCodeAt(0),
  COLON = ':'.charCodeAt(0),
}

export interface EscapeIndex {
  [index: number]: number[];
}

function backslashEscape(s: string) : number[] {
  return [CharCodes.BACKSLASH, s.charCodeAt(0)];
}

function toCharCodes(s: string) {
  let charCodes: number[] = new Array(s.length);
  for (let i: number = 0; i < s.length; i++) {
    charCodes[i] = s.charCodeAt(i);
  }
  return charCodes;
}

function unicodeEscape(codePoint: number) : number[] {
  let prefix: number[] = [CharCodes.BACKSLASH, CharCodes.LOWERCASE_U];
  let hexEscape: string = codePoint.toString(16);
  while (hexEscape.length < 4) {
    hexEscape = "0" + hexEscape;
  }
  return prefix.concat(toCharCodes(hexEscape));
}

export let ClobEscapes : EscapeIndex = {};
ClobEscapes[CharCodes.NULL] = backslashEscape("0");
ClobEscapes[CharCodes.BELL] = backslashEscape("a");
ClobEscapes[CharCodes.BACKSPACE] = backslashEscape("b");
ClobEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape("t");
ClobEscapes[CharCodes.LINE_FEED] = backslashEscape("n");
ClobEscapes[CharCodes.VERTICAL_TAB] = backslashEscape("v");
ClobEscapes[CharCodes.FORM_FEED] = backslashEscape("f");
ClobEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape("r");
ClobEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
ClobEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
ClobEscapes[CharCodes.FORWARD_SLASH] = backslashEscape("/");
ClobEscapes[CharCodes.QUESTION_MARK] = backslashEscape("?");
ClobEscapes[CharCodes.BACKSLASH] = backslashEscape("\\");

function unicodeEscapes(escapes: EscapeIndex, start: number, end?: number) {
  if (isUndefined(end)) {
    escapes[start] = unicodeEscape(start);
  } else {
    for (let i: number = start; i < end; i++) {
      escapes[i] = unicodeEscape(i);
    }
  }
}

let CommonEscapes : EscapeIndex = {};
CommonEscapes[CharCodes.NULL] = backslashEscape('0');
unicodeEscapes(CommonEscapes, 1, 6);
CommonEscapes[CharCodes.BELL] = backslashEscape('a');
CommonEscapes[CharCodes.BACKSPACE] = backslashEscape('b');
CommonEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape('t');
CommonEscapes[CharCodes.LINE_FEED] = backslashEscape('n');
CommonEscapes[CharCodes.VERTICAL_TAB] = backslashEscape('v');
CommonEscapes[CharCodes.FORM_FEED] = backslashEscape('f');
CommonEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape('r');
CommonEscapes[CharCodes.BACKSLASH] = backslashEscape('\\');

export let StringEscapes : EscapeIndex = Object['assign']({}, CommonEscapes);
StringEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');

export let SymbolEscapes : EscapeIndex = Object['assign']({}, CommonEscapes);
SymbolEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");

export function isIdentifier(s: string) : boolean {
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

export function isOperator(s: string) : boolean {
  for (let i: number = 0; i < s.length; i++) {
    let c: number = s.charCodeAt(i);
    let b: boolean = _is_operator_char[c];
    if (!b) {
      return false;
    }
  }
  return true;
}

export function *escape(s: string, escapes: EscapeIndex) : IterableIterator<number> {
  for (let i = 0; i < s.length; i++) {
    let charCode: number = s.charCodeAt(i);
    let escape: number[] = escapes[charCode];
    if (!isUndefined(escape)) {
      for (let j = 0; j < escape.length; j++) {
        yield escape[j];
      }
    } else {
      yield charCode;
    }
  }
}
