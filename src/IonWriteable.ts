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
    this.index = 0;
    this.written = 0;
  }

  write(b: number | number[], offset?: number, length?: number) : void {
    if (Array.isArray(b)) {
      if (typeof(offset) === 'undefined') {
        offset = 0;
      }
      if (typeof(length) === 'undefined') {
        length = b.length;
      }

      let remaining: number = length - offset;
      while (remaining > 0) {
        if (remaining < this.capacity()) {
          last(this.buffers).set(b, offset);
          this.index += remaining;
          this.written += remaining;
          break;
        } else {
          let buffer: Uint8Array = last(this.buffers);
          for (let i: number = 0; i < this.capacity(); i++) {
            buffer[this.written + i] = b[offset + i];
          }
          remaining -= this.capacity();
          this.written += this.capacity();
          this.allocate();
          this.index = 0;
        }
      }
    } else if (typeof(b) === 'number') {
      if (this.capacity() === 0) {
        this.allocate();
        last(this.buffers)[0] = b;
        this.written += 1;
        this.index = 1;
      } else {
        last(this.buffers)[this.written] = b;
        this.written += 1;
        this.index += 1;
      }
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
