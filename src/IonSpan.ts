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
import { InvalidArgumentError } from "./IonErrors"

const SPAN_TYPE_STRING = 0;
const SPAN_TYPE_BINARY = 1;
const SPAN_TYPE_SUB_FLAG = 2;
const SPAN_TYPE_SUB_STRING = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_STRING;
const SPAN_TYPE_SUB_BINARY = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_BINARY;

const MAX_POS = 1024*1024*1024; // 1 gig 
const LINE_FEED = 10;
const CARRAIGE_RETURN = 13;
const DEBUG_FLAG = true;

export abstract class Span {
  protected readonly _type: number;

  constructor(_type: number) {
    this._type = _type;
  }

  abstract position() : number;

  abstract next() : number;

  abstract valueAt(index: number): number;

  abstract getRemaining() : number;

  abstract setRemaining(r: number) : void;

  abstract is_empty(): boolean;

  abstract skip(dist: number) : void;

  abstract unread(ch: number) : void;

  protected abstract clone(start: number, len: number): Span;

  write(b: number) : never {
    throw new Error("not implemented");
  }

  static error() {
    throw new Error("span error");
  }
}

class StringSpan extends Span {
  private _src : string;
  private _pos : number;
  private _start : number;
  private _limit : number;
  private _line : number;
  private _old_line_start : number;
  private _line_start : number;

  constructor(src: string, start: number, len: number) {
    super(SPAN_TYPE_STRING);
    this._line = 1;
    this._src = src;
    this._limit = src.length;
    if (typeof start !== 'undefined') {
      this._pos = start;
      if (typeof len !== 'undefined') {
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
    if (ch === CARRAIGE_RETURN) {
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
    if (ch != this.peek()) Span.error();  // DEBUG
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

  line_number() : number {
    return this._line;
  }

  offset() : number {
    return this._pos - this._line_start;
  }

  clone(start: number, len: number) : StringSpan {
    let actual_len: number = this._limit - this._pos - start;
    if (actual_len > len) {
      actual_len = len;
    }
    return new StringSpan(this._src, this._pos, actual_len);
  }
}

class BinarySpan extends Span {
  private _src: number[];
  private _pos: number;
  private _start: number;
  private _limit: number;

  constructor(src: number[], start?: number, len?: number) {
    super(SPAN_TYPE_BINARY);
    this._src = src;
    this._limit = src.length;
    this._start = start || 0;
    if (typeof len !== 'undefined') {
      this._limit = start + len;
    }
    this._pos = this._start;
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
    var b;
    if (this.is_empty()) {
      if (this._pos > MAX_POS) {
        throw new Error("span position is out of bounds");
      }
      this._pos++;
      return EOF;
    }
    b = this._src[this._pos];
    this._pos++;
    return (b & 0xFF);
  }

  unread(b: number) : void {
    if (this._pos <= this._start) Span.error();
    this._pos--;
    if (b == EOF) {
      if (this.is_empty() == false) Span.error();
    }
    if (b != this.peek()) Span.error();    // DEBUG
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
}




/**
 * Create a Span object that wraps src.
 * @see http://www.cs.cmu.edu/~wjh/papers/subseq.html
 *
 * @param src value to be stored inside a span, typically a string
 * @param start beginning index of src
 * @param len end index of src
 * @returns {Span}
 */
export function makeSpan(src: any, start?: number, len?: number): Span {
  if (src instanceof Span) {
    return src as Span;
  }
  if (typeof start === 'undefined') {
    start = 0;
  }
  if (typeof len === 'undefined') {
    len = src.length;
  }

  let span: Span = undefined;
  let src_type = typeof src;
  if (src_type === 'undefined') {
    throw new InvalidArgumentError("Given \'undefined\' as input");
  } else if (src_type === 'string') {
    span = new StringSpan(src, start, len);
  } else if (src_type === 'object') {
    // TODO: this seems fishy since isSpan is not defined on Span types!
    if (typeof (src.isSpan) === 'undefined') { // probably an array
      span = new BinarySpan(src, start, len);
    }
  }
  if (span === undefined) {
    throw new InvalidArgumentError("invalid span source");
  }
  return span;
}
