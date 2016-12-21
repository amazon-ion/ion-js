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
import { Writeable } from "./IonWriteable";
import { Writer } from "./IonWriter";

const MAJOR_VERSION = 1;
const MINOR_VERSION = 0;

export class BinaryWriter implements Writer {
  private readonly writeable: Writeable;

  constructor(writeable: Writeable) {
    this.writeable = writeable;
  }

  writeIvm() : void {
    this.writeable.write(0xE0);
    this.writeable.write(MAJOR_VERSION);
    this.writeable.write(MINOR_VERSION);
    this.writeable.write(0xEA);
  }

  writeUnsignedInt(value: number, length: number) {
    let bytes: number[] = [];
    while (value > 0) {
      bytes.unshift(value & 0xFF);
      value = value >>> 8;
    }

    // Padding
    while (bytes.length < length) {
      bytes.unshift(0);
    }
    if (bytes.length > length) {
      throw new Error(`Value ${value} cannot fit into ${length} bytes`);
    }

    this.writeable.write(bytes);
  }

  writeSignedInt(value: number, length: number) {
    let isNegative: boolean = value < 0;
    value = Math.abs(value);

    let bytes: number[] = [];

    // Trailing bytes
    while (value >= 128) {
      bytes.unshift(value & 0xFF);
      value = value >>> 8;
    }

    bytes.unshift(value);

    // Padding
    while (bytes.length < length) {
      bytes.unshift(0);
    }
    if (bytes.length > length) {
      throw new Error(`Value ${value} cannot fit into ${length} bytes`);
    }

    // Sign bit
    if (isNegative) {
      bytes[0] = bytes[0] | 0x80;
    }

    this.writeable.write(bytes);
  }

  writeVariableLengthUnsignedInt(value: number) {
    let bytes: number[] = [];

    // Trailing byte
    bytes.unshift(0x80 | (value & 0x7F));

    value = value >>> 7;
    while (value > 0) {
      bytes.unshift(value & 0x7F);
      value = value >>> 7;
    }

    this.writeable.write(bytes);
  }
}
