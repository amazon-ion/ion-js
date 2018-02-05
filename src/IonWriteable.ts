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
    private buffer: number[];

    constructor() {
        this.buffer = [];
    }

    writeByte(b: number) {
        this.buffer.push(b);
    }

    writeBytes(b: number[] | Uint8Array, offset: number = 0, length?: number): void {
        if (isUndefined(length)) {
            length = b.length - offset;
        }
        for (let i: number = offset; i < b.length; i++) {
            this.buffer.push(b[i]);
        }
    }

    writeStream(it: IterableIterator<number>) {
        for (let b of it) {
            this.writeByte(b);
        }
    }

    getBytes(): number[] {
        return this.buffer;
    }
}
