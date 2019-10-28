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
/**
 * A byte array builder.
 *
 * This implementation attempts to minimize append and allocate operations by writing into
 * a pre-allocated array, although additional arrays are allocated as necessary.
 */
export class Writeable {
    private bufferSize: number;
    private buffers: Uint8Array[];
    private index: number;
    private clean: boolean;

    constructor(bufferSize?: number) {
        this.bufferSize = bufferSize ? bufferSize : 4096;
        this.buffers = [new Uint8Array(this.bufferSize)];
        this.index = 0;
        this.clean = false;
    }

    get currentBuffer() {
        return this.buffers[this.buffers.length - 1];
    }

    get totalSize() {
        let size = 0;
        for (let i = 0; i < this.buffers.length - 1; i++) {
            size += this.buffers[i].length;
        }
        return size + this.index;
    }

    writeByte(byte: number) {
        this.clean = false;
        this.currentBuffer[this.index] = byte;
        this.index++;
        if (this.index === this.bufferSize) {
            this.buffers.push(new Uint8Array(this.bufferSize));
            this.index = 0;
        }
    }

    writeBytes(buf: Uint8Array, offset?: number, length?: number): void {
        if (offset === undefined) offset = 0;

        let writeLength = length !== undefined ? (Math.min(buf.length - offset, length)) : buf.length - offset;
        if (writeLength < (this.currentBuffer.length - this.index) - 1) {
            this.currentBuffer.set(buf.subarray(offset, offset + writeLength), this.index);
            this.index += writeLength;
        } else {
            this.buffers[this.buffers.length - 1] = this.currentBuffer.slice(0, this.index);
            this.buffers.push(buf.subarray(offset, length));
            this.buffers.push(new Uint8Array(this.bufferSize));
            this.clean = false;
            this.index = 0;
        }
    }

    getBytes(): Uint8Array {
        if (this.clean) return this.buffers[0];
        let buffer = new Uint8Array(this.totalSize);
        let tempLength = 0;
        for (let i = 0; i < this.buffers.length - 1; i++) {
            buffer.set(this.buffers[i], tempLength);
            tempLength += this.buffers[i].length;
        }
        buffer.set(this.currentBuffer.subarray(0, this.index), tempLength);
        this.buffers = [buffer, new Uint8Array(this.bufferSize)];
        this.index = 0;
        this.clean = true;
        return buffer;
    }
}
