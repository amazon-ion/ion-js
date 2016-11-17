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
namespace ION {
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
}
