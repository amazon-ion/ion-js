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
import { Writeable } from "./IonWriteable";

const SIX_BIT_MASK: number = 0x3F;
const TEN_BIT_MASK: number = 0x3FF;

const HIGH_SURROGATE_OFFSET = 0xD800;
const LOW_SURROGATE_MASK = 0xFC00;
const LOW_SURROGATE_OFFSET = 0xDC00;
const LOW_SURROGATE_END = 0xE000;

function isHighSurrogate(charCode: number) : boolean {
  return charCode >= HIGH_SURROGATE_OFFSET && charCode < LOW_SURROGATE_OFFSET;
}

export function encodeUtf8(s: string) : number[] {
  let writeable: Writeable = new Writeable(s.length, s.length);
  for (let b of encodeUtf8Stream(charCodes(s))) {
    writeable.writeByte(b);
  }
  return writeable.getBytes();
}

export function *encodeUtf8Stream(it: IterableIterator<number>) : IterableIterator<number> {
  let pushback: number = -1;
  for (;;) {
    let codePoint: number;
    if (pushback !== -1) {
      codePoint = pushback;
      pushback = -1;
    } else {
      let r: IteratorResult<number> = it.next();
      if (r.done) {
        return;
      } else {
        codePoint = r.value;
      }
    }

    if (codePoint < 128) { // 7 bits
      yield codePoint;
    } else if (codePoint < 2048) { // 11 bits
      yield 0xC0 | (codePoint >>> 6);
      yield 0x80 | (codePoint & SIX_BIT_MASK); 
    } else if (codePoint < HIGH_SURROGATE_OFFSET) { // 16 bits, non-surrogate
      yield 0xE0 | (codePoint >>> 12);
      yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
      yield 0x80 | (codePoint & SIX_BIT_MASK);
    } else if (codePoint < LOW_SURROGATE_OFFSET) { // 16 bits, high surrogate
      let r2: IteratorResult<number> = it.next();
      if (r2.done) {
        yield 0xE0 | (codePoint >>> 12);
        yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
        yield 0x80 | (codePoint & SIX_BIT_MASK);
        return;
      }

      let codePoint2: number = r2.value;
      let hasLowSurrogate: boolean = (codePoint2 & LOW_SURROGATE_MASK) === LOW_SURROGATE_OFFSET;
      if (hasLowSurrogate) {
        let highSurrogate: number = codePoint - HIGH_SURROGATE_OFFSET;
        let lowSurrogate: number = codePoint2 - LOW_SURROGATE_OFFSET;
        codePoint = 0x10000 + (highSurrogate << 10) | lowSurrogate;
        yield 0xF0 | (codePoint >>> 18);
        yield 0x80 | ((codePoint >>> 12) & SIX_BIT_MASK);
        yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
        yield 0x80 | (codePoint & SIX_BIT_MASK);
      } else { // Unpaired high surrogate (UCS-2)
        yield 0xE0 | (codePoint >>> 12);
        yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
        yield 0x80 | (codePoint & SIX_BIT_MASK);
        pushback = codePoint2;
      }
    } else if (codePoint < 65536) { // 16 bits, non-surrogate
      yield 0xE0 | (codePoint >>> 12);
      yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
      yield 0x80 | (codePoint & SIX_BIT_MASK);
    } else if (codePoint < 2097152) { // 21 bits
      yield 0xF0 | (codePoint >>> 18);
      yield 0x80 | ((codePoint >>> 12) & SIX_BIT_MASK);
      yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
      yield 0x80 | (codePoint & SIX_BIT_MASK);
    }
  }
}

function *charCodes(s: string) : IterableIterator<number> {
  for (let i: number = 0; i < s.length; i++) {
    yield s.charCodeAt(i);
  }
}
