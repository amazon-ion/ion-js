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
import { isUndefined } from "./IonUtilities";
import { last } from "./IonUtilities";

const DEFAULT_BUFFER_SIZE: number = 4096;

/**
 * A byte array builder.
 *
 * This implementation attempts to minimize append and allocate operations by writing into
 * a pre-allocated array, although additional arrays are allocated as necessary.
 */
export class Writeable {
  private buffers: number[][];
  private index: number;
  private written: number;

  constructor(bufferInitialSize: number = DEFAULT_BUFFER_SIZE, private bufferGrowthSize: number = DEFAULT_BUFFER_SIZE) {
    this.buffers = [new Array(bufferInitialSize)];
    // Next byte to be written in current buffer
    this.index = 0;
    // Total number of bytes written across all buffers
    this.written = 0;
  }

  writeByte(b: number) {
    if (this.capacity() === 0) {
      this.allocate();
      last(this.buffers)[0] = b;
      this.index = 1;
      this.written += 1;
    } else {
      last(this.buffers)[this.index] = b;
      this.index += 1;
      this.written += 1;
    }
  }

  writeBytes(b: number[] | Uint8Array, offset: number = 0, length?: number) : void {
    if (isUndefined(length)) {
      length = b.length - offset;
    }

    let remaining: number = length;
    while (remaining > 0) {
      if (this.capacity() == 0) {
        this.allocate();
        this.index = 0;
      }
      let buffer: number[] = last(this.buffers);
      let limit: number = Math.min(remaining, this.capacity());
      for (let i: number = 0; i < limit; i++) {
        buffer[this.index + i] = b[offset + i];
      }
      remaining -= limit;
      this.index += limit;
      this.written += limit;
    }
  }

  writeStream(it: IterableIterator<number>) {
    for (let b of it) {
      this.writeByte(b);
    }
  }

  private capacity() : number {
    return last(this.buffers).length - this.index;
  }

  private allocate() {
    if (this.bufferGrowthSize === 0) {
      "Cannot allocate additional capacity in a fixed-size writeable";
    }
    this.buffers.push(new Array(this.bufferGrowthSize));
  }

  getBytes() : number[] {
    let singleFullBuffer: boolean = (this.buffers.length == 1) && this.index == last(this.buffers).length;
    if (singleFullBuffer) {
      return last(this.buffers);
    }

    let result: number[] = new Array(this.written);
    let offset: number = 0;
    for (let i: number = 0; i < this.buffers.length; i++) {
      let buffer: number[] = this.buffers[i];
      let limit: number = Math.min(this.written - offset, buffer.length);
      for (let j: number = 0; j < limit; j++) {
        result[offset++] = buffer[j];
      }
    }

    // Replace individual buffers with concatenated buffer
    this.buffers = [result];
    this.index = this.written;

    return result;
  }
}
