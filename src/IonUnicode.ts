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

const JS_DECODER_MAX_BYTES = 512;

// Check whether this runtime supports the `TextDecoder` feature
let textDecoder;
// @ts-expect-error: Typescript will complain about TextDecoder being undefined
if (typeof TextDecoder !== "undefined") {
  // @ts-expect-error: Typescript will complain about TextDecoder being undefined
  textDecoder = new TextDecoder("utf8", { fatal: true });
} else {
  textDecoder = null;
}

/**
 * @file Constants and helper methods for Unicode.
 * @see https://amzn.github.io/ion-docs/stringclob.html
 * @see http://www.unicode.org/versions/Unicode5.0.0/
 */
export function encodeUtf8(s: string): Uint8Array {
  let i = 0,
    c;
  const bytes = new Uint8Array(s.length * 4);

  for (let ci = 0; ci < s.length; ci++) {
    c = s.charCodeAt(ci);
    if (c < 128) {
      bytes[i++] = c;
      continue;
    }
    if (c < 2048) {
      bytes[i++] = (c >> 6) | 192;
    } else {
      if (c > 0xd7ff && c < 0xdc00) {
        if (++ci >= s.length) {
          throw new Error("UTF-8 encode: incomplete surrogate pair");
        }
        const c2 = s.charCodeAt(ci);
        if (c2 < 0xdc00 || c2 > 0xdfff) {
          throw new Error(
            "UTF-8 encode: second surrogate character 0x" +
              c2.toString(16) +
              " at index " +
              ci +
              " out of range"
          );
        }
        c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
        bytes[i++] = (c >> 18) | 240;
        bytes[i++] = ((c >> 12) & 63) | 128;
      } else {
        bytes[i++] = (c >> 12) | 224;
      }
      bytes[i++] = ((c >> 6) & 63) | 128;
    }
    bytes[i++] = (c & 63) | 128;
  }
  return bytes.subarray(0, i);
}

export function decodeUtf8(bytes: Uint8Array): string {
  // for bytes > 512 use TextDecoder method - decode()
  if (bytes.length > JS_DECODER_MAX_BYTES && textDecoder != null) {
    return textDecoder.decode(bytes);
  }
  let i = 0,
    s = "",
    c;
  while (i < bytes.length) {
    c = bytes[i++];
    if (c > 127) {
      if (c > 191 && c < 224) {
        if (i >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 2-byte sequence");
        }
        c = ((c & 31) << 6) | (bytes[i++] & 63);
      } else if (c > 223 && c < 240) {
        if (i + 1 >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 3-byte sequence");
        }
        c = ((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
      } else if (c > 239 && c < 248) {
        if (i + 2 >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 4-byte sequence");
        }
        c =
          ((c & 7) << 18) |
          ((bytes[i++] & 63) << 12) |
          ((bytes[i++] & 63) << 6) |
          (bytes[i++] & 63);
      } else {
        throw new Error(
          "UTF-8 decode: unknown multibyte start 0x" +
            c.toString(16) +
            " at index " +
            (i - 1)
        );
      }
    }
    if (c <= 0xffff) {
      s += String.fromCharCode(c);
    } else if (c <= 0x10ffff) {
      c -= 0x10000;
      s += String.fromCharCode((c >> 10) | 0xd800);
      s += String.fromCharCode((c & 0x3ff) | 0xdc00);
    } else {
      throw new Error(
        "UTF-8 decode: code point 0x" + c.toString(16) + " exceeds UTF-16 reach"
      );
    }
  }
  return s;
}
