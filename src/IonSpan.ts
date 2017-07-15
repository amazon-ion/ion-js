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

import { EOF } from "./IonConstants";

const MAX_POS = 1024*1024*1024; // 1 gig
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const DEBUG_FLAG = true;

export class StringSpan {
  private _src : string;
  private _pos : number;
  private _start : number;
  private _limit : number;
  private _line : number;
  private _old_line_start : number;
  private _line_start : number;

  constructor(src: string, start?: number, len?: number) {
    this._line = 1;
    this._src = src;
    this._pos = 0;
    this._limit = src.length;
    if (start !== undefined) {
      this._pos = start;
      if (len !== undefined) {
        this._limit = start + len;
      }
    }
    this._start = this._pos;
    this._line_start = this._pos;
    this._old_line_start = 0;
  }

  position() : number {
    return this._pos - this._start;
  }

  getRemaining() : number {
    return this._limit - this._pos;
  }

  setRemaining(r: number) : void {
    this._limit = r + this._pos;
  }

  is_empty() : boolean  {
    return (this._pos >= this._limit);
  }

  next() : number {
    var ch;
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
    if (ch === CARRIAGE_RETURN) {
      if (this.peek() != LINE_FEED) {
        this._inc_line();
      }
    }
    else if (ch == LINE_FEED) {
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

  unread(ch: number) : void {
    if (this._pos <= this._start) throw new Error("span error");
    this._pos--;
    if (ch < 0) {
      if (this.is_empty() != true) throw new Error("span error");
      return;
    }
    // we can only unread across 1 new line
    if (this._pos == this._line_start) {
        this._line_start = this._old_line_start;
        this._line--;
    }
    if (ch != this.peek()) throw new Error("span error");  // DEBUG
  }

  peek() : number {
    return this.valueAt(this._pos);
  }

  skip(dist: number) : void {
    this._pos += dist;
    if (this._pos > this._limit) {
      this._pos = this._limit;
    }
  }

  valueAt(ii: number) : number {
    if (ii < this._start || ii >= this._limit) return EOF;
    return this._src.charCodeAt(ii);
  }

  charAt(ii: number) : string {
    if (ii < this._start || ii >= this._limit) return "";
    return this._src[ii];
  }

  offset() : number {
    return this._pos - this._line_start;
  }

  // Return the line and column number for a given character in the span
  locator(pos: number): number[] {
    let line = 1, column = 1;
    for (let i = 0; i < pos; i++) {
      let ch = this.valueAt(i);
      if (ch == LINE_FEED) {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return [line, column];
  }

  // Return a string which displays the line containing the given token followed
  // by a line which places carats under the offending token
  error_line(start: number, end: number): any[] {
    let line_start = start;
    while (line_start > 0 && this.valueAt(line_start-1) != LINE_FEED) {
      line_start--;
    }
    let line_end = end;
    while (line_end < this._limit && this.valueAt(line_end) != LINE_FEED) {
      line_end++;
    }
    let str = "";
    for (let x = line_start; x < line_end; x++) {
      str += this.charAt(x);
    }
    let pointer = "";
    for (var y = line_start; y < start; y++) {
      pointer += " ";
    }
    for (; y < end; y++) pointer += "^";
    return [str, pointer];
  }

  clone(start: number, len: number) : StringSpan {
    let actual_len: number = this._limit - this._pos - start;
    if (actual_len > len) {
      actual_len = len;
    }
    return new StringSpan(this._src, this._pos, actual_len);
  }
}

export class BinarySpan {
  private _src: number[];
  private _pos: number;
  private _start: number;
  private _limit: number;

  constructor(src: number[], start?: number, len?: number) {
    this._src = src;
    this._limit = src.length;
    this._start = start || 0;
    if (len !== undefined) {
      this._limit = start + len;
    }
    this._pos = this._start;
  }

  error_line(start: number, end: number): any[] {
    throw new Error("not implemented on binary spans");
  }

  locator(pos: number): number[] {
    throw new Error("not implemented on binary spans");
  }

  position() : number {
    return this._pos - this._start;
  }

  getRemaining() : number {
    return this._limit - this._pos;
  }

  setRemaining(r: number) : void {
    this._limit = r + this._pos;
  }

  is_empty(): boolean {
    return (this._pos >= this._limit);
  }

  next(): number {
    if (this.is_empty()) {
      if (this._pos > MAX_POS) {
        throw new Error("span position is out of bounds");
      }
      this._pos++;
      return EOF;
    }
    let b = this._src[this._pos];
    this._pos++;
    return (b & 0xFF);
  }

  unread(b: number) : void {
    if (this._pos <= this._start) throw new Error("span error");
    this._pos--;
    if (b == EOF) {
      if (this.is_empty() == false) throw new Error("span error");
    }
  }

  peek(): number {
    if (this.is_empty()) return EOF;
    return (this._src[this._pos] & 0xFF);
  }

  skip(dist: number) : void {
    this._pos += dist;
    if (this._pos > this._limit) {
      this._pos = this._limit;
    }
  }

  valueAt(ii: number) : number {
    if (ii < this._start || ii >= this._limit) return undefined;
    return (this._src[ii] & 0xFF);
  }

  clone(start: number, len: number) : BinarySpan {
    let actual_len: number = this._limit - this._pos - start;
    if (actual_len > len) {
      actual_len = len;
    }
    return new BinarySpan(this._src, this._pos + start, actual_len);
  }

  write(b: number) : never {
    throw new Error("not implemented");
  }
}
