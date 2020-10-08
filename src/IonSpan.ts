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

import { EOF } from "./IonConstants";

const SPAN_TYPE_STRING = 0;
const SPAN_TYPE_BINARY = 1;
const SPAN_TYPE_SUB_FLAG = 2;
const SPAN_TYPE_SUB_STRING = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_STRING;
const SPAN_TYPE_SUB_BINARY = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_BINARY;

const MAX_POS = 1024 * 1024 * 1024; // 1 gig
const LINE_FEED = 10;
const CARRAIGE_RETURN = 13;
const DEBUG_FLAG = true;

export abstract class Span {
  protected readonly _type: number;

  constructor(_type: number) {
    this._type = _type;
  }

  static error() {
    throw new Error("span error");
  }

  abstract position(): number;

  abstract next(): number;

  abstract valueAt(index: number): number;

  abstract getRemaining(): number;

  abstract setRemaining(r: number): void;

  abstract is_empty(): boolean;

  abstract skip(dist: number): void;

  abstract unread(ch: number): void;

  abstract peek(): number;

  abstract chunk(length: number): any;

  write(b: number): never {
    throw new Error("not implemented");
  }

  protected abstract clone(start: number, len: number): Span;
}

export class StringSpan extends Span {
  private _src: string;
  private _pos: number;
  private _start: number;
  private _limit: number;
  private _line: number;
  private _old_line_start: number;
  private _line_start: number;

  constructor(src: string) {
    super(SPAN_TYPE_STRING);
    this._line = 1;
    this._src = src;
    this._limit = src.length;
    this._start = 0;
    this._pos = 0;
    this._line_start = 0;
    this._old_line_start = 0;
  }

  viewSource(): string {
    return this._src;
  }

  position(): number {
    return this._pos - this._start;
  }

  getRemaining(): number {
    return this._limit - this._pos;
  }

  setRemaining(r: number): void {
    this._limit = r + this._pos;
  }

  is_empty(): boolean {
    return this._pos >= this._limit;
  }

  next(): number {
    let ch;
    if (this.is_empty()) {
      if (this._pos > MAX_POS) {
        throw new Error("span position is out of bounds");
      }
      this._pos++; // we increment this even though we don't use it (this
      // should not have other issues since past the end is
      // still past the end) to allow unread to be happy
      return EOF;
    }
    ch = this._src.charCodeAt(this._pos);
    if (ch === CARRAIGE_RETURN) {
      if (this.peek() != LINE_FEED) {
        this._inc_line();
      }
    } else if (ch == LINE_FEED) {
      this._inc_line();
    }
    this._pos++;
    return ch;
  }

  _inc_line() {
    this._old_line_start = this._line_start;
    this._line++;
    this._line_start = this._pos;
  }

  unread(ch: number): void {
    if (this._pos <= this._start) Span.error();
    this._pos--;
    if (ch < 0) {
      if (this.is_empty() != true) Span.error();
      return;
    }
    // we can only unread across 1 new line
    if (this._pos == this._line_start) {
      this._line_start = this._old_line_start;
      this._line--;
    }
    if (ch != this.peek()) Span.error(); // DEBUG
  }

  peek(): number {
    return this.valueAt(this._pos)!;
  }

  skip(dist: number): void {
    this._pos += dist;
    if (this._pos > this._limit) {
      this._pos = this._limit;
    }
  }

  valueAt(ii: number): number {
    if (ii < this._start || ii >= this._limit) return EOF;
    return this._src.charCodeAt(ii);
  }

  chunk(length: number): string {
    const tempStr: string = this._src.substr(this._pos, length);
    this._pos += length;
    return tempStr;
  }

  getCodePoint(index: number): number {
    // @ts-ignore
    return this._src.codePointAt(index);
  }

  line_number(): number {
    return this._line;
  }

  offset(): number {
    return this._pos - this._line_start;
  }

  clone(start: number): StringSpan {
    return new StringSpan(this._src.substr(this._pos));
  }
}

export class BinarySpan extends Span {
  private _src: Uint8Array;
  private _pos: number;
  private _start: number;
  private _limit: number;

  constructor(src: Uint8Array) {
    super(SPAN_TYPE_BINARY);
    this._src = src;
    this._limit = src.length;
    this._start = 0;
    this._pos = 0;
  }

  position(): number {
    return this._pos - this._start;
  }

  getRemaining(): number {
    return this._limit - this._pos;
  }

  setRemaining(r: number): void {
    this._limit = r + this._pos;
  }

  is_empty(): boolean {
    return this._pos >= this._limit;
  }

  next(): number {
    if (this.is_empty()) {
      return EOF;
    }
    return this._src[this._pos++];
  }

  //returns an array with the same backing buffer as the source.
  view(length: number): Uint8Array {
    if (this._pos + length > this._limit) {
      throw new Error(
        "Unable to read " +
          length +
          " bytes (position: " +
          this.position() +
          ", limit: " +
          this._limit +
          ")",
      );
    }
    return this._src.subarray(this._pos, (this._pos += length));
  }

  //returns an array with a new backing buffer.
  chunk(length: number): Uint8Array {
    return new Uint8Array(this.view(length));
  }

  unread(b: number): void {
    if (this._pos <= this._start) Span.error();
    this._pos--;
    if (b == EOF) {
      if (this.is_empty() == false) Span.error();
    }
    if (b != this.peek()) Span.error(); // DEBUG
  }

  peek(): number {
    if (this.is_empty()) return EOF;
    return this._src[this._pos];
  }

  skip(dist: number): void {
    this._pos += dist;
    if (this._pos > this._limit) throw new Error("Skipped over end of source.");
  }

  valueAt(ii: number): number {
    if (ii < this._start || ii >= this._limit) return EOF;
    return this._src[ii];
  }

  clone(start: number, len: number): BinarySpan {
    //this doesn't make sense
    return new BinarySpan(this._src.subarray(this._pos));
  }
}
