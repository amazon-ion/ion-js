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
const DEFAULT_BUFFER_SIZE: number = 4096;

function last(array: Uint8Array[]) : Uint8Array {
  return array[array.length - 1];
}

export class Writeable {
  private bufferSize: number;
  private buffers: Uint8Array[];
  private index: number;
  private written: number;

  constructor(bufferSize?: number) {
    if (typeof(bufferSize) === 'undefined') {
      bufferSize = DEFAULT_BUFFER_SIZE;
    }
    this.bufferSize = bufferSize;
    this.buffers = [new Uint8Array(bufferSize)];
    // Next byte to be written in current buffer
    this.index = 0;
    // Total number of bytes written across all buffers
    this.written = 0;
  }

  write(x: number | number[], offset?: number, length?: number) : void {
    if (Array.isArray(x)) {
      this.writeArray(x, offset, length);
    } else if (typeof(x) === 'number') {
      this.writeNumber(x);
    }
  }

  private writeArray(b: number[], offset?: number, length?: number) : void {
    if (typeof(offset) === 'undefined') {
      offset = 0;
    }
    if (typeof(length) === 'undefined') {
      length = b.length - offset;
    }

    let canCopyEntireArray =
      length == b.length
      && length <= this.capacity();
    if (canCopyEntireArray) {
      last(this.buffers).set(b, this.index);
      this.index += length;
      this.written += length;
      return;
    }

    let remaining: number = length;
    while (remaining > 0) {
      if (this.capacity() == 0) {
        this.allocate();
        this.index = 0;
      }
      let buffer: Uint8Array = last(this.buffers);
      let limit: number = Math.min(remaining, this.capacity());
      for (let i: number = 0; i < limit; i++) {
        buffer[this.index + i] = b[offset + i];
      }
      remaining -= limit;
      this.index += limit;
      this.written += limit;
    }
  }

  private writeNumber(n: number) : void {
    if (this.capacity() === 0) {
      this.allocate();
      last(this.buffers)[0] = n;
      this.index = 1;
      this.written += 1;
    } else {
      last(this.buffers)[this.index] = n;
      this.index += 1;
      this.written += 1;
    }
  }

  private capacity() : number {
    return last(this.buffers).length - this.index;
  }

  private allocate() {
    this.buffers.push(new Uint8Array(new ArrayBuffer(this.bufferSize)));
  }

  getBytes() : Uint8Array {
    let result: Uint8Array = new Uint8Array(this.written);
    let offset: number = 0;
    for (let i = 0; i < this.buffers.length - 1; i++) {
      let buffer: Uint8Array = this.buffers[i];
      result.set(buffer, offset);
      offset += buffer.length;
    }

    // Special case for possible partial final buffer
    let buffer: Uint8Array = last(this.buffers);
    for (let i = 0; i < this.index; i++) {
      result[offset + i] = buffer[i];
    }

    // Replace individual buffers with concatenated buffer
    this.buffers = [result];
    this.index = this.written;

    return result;
  }
}
