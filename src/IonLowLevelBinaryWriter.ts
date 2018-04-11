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
import { isNumber } from "./IonUtilities";
import { isUndefined } from "./IonUtilities";
import { Writeable } from "./IonWriteable";

/**
 * Values in the Ion binary format are serialized as a sequence of low-level fields. This
 * writer is responsible for emitting those fields in the proper format.
 * @see http://amzn.github.io/ion-docs/binary.html#basic-field-formats
 */
export class LowLevelBinaryWriter {
  private readonly writeable: Writeable;
  private numberBuffer: number[] = new Array(10);

  constructor(writeableOrLength: Writeable | number) {
    if (isNumber(writeableOrLength)) {
      this.writeable = new Writeable();
    } else {
      this.writeable = <Writeable>writeableOrLength;
    }
  }

  writeSignedInt(originalValue: number, length: number) : void {
    if (length > this.numberBuffer.length) {
      this.numberBuffer = new Array(length);
    }

    let value: number = Math.abs(originalValue);

    // Trailing bytes
    let i: number = this.numberBuffer.length;
    while (value >= 128) {
      this.numberBuffer[--i] = value & 0xFF;
      value >>>= 8;
    }

    this.numberBuffer[--i] = value;

    // Padding
    let bytesWritten: number = this.numberBuffer.length - i;
    for (let j: number = 0; j < length - bytesWritten; j++) {
      this.numberBuffer[--i] = 0;
    }

    if (bytesWritten > length) {
      throw new Error(`Value ${value} cannot fit into ${length} bytes`);
    }

    // Sign bit
    if (originalValue < 0) {
      this.numberBuffer[i] |= 0x80;
    }

    this.writeable.writeBytes(this.numberBuffer, i);
  }

  writeUnsignedInt(originalValue: number, length?: number) : void {
    if (isUndefined(length)) {
      length = LowLevelBinaryWriter.getUnsignedIntSize(originalValue)
    }
    if (length > this.numberBuffer.length) {
      this.numberBuffer = new Array(length);
    }

    let value: number = originalValue;
    let i: number = this.numberBuffer.length;

    while (value > 0) {
      this.numberBuffer[--i] = value & 0xFF;
      value >>>= 8;
    }

    // Padding
    let bytesWritten: number = this.numberBuffer.length - i;
    for (let j: number = 0; j < length - bytesWritten; j++) {
      this.numberBuffer[--i] = 0;
    }

    if (bytesWritten > length) {
      throw new Error(`Value ${value} cannot fit into ${length} bytes`);
    }

    this.writeable.writeBytes(this.numberBuffer, i);
  }

  writeVariableLengthSignedInt(originalValue: number) : void {
    if (!Number['isInteger'](originalValue)) {
      throw new Error(`Cannot call writeVariableLengthSignedInt with non-integer value ${originalValue}`);
    }

    let value: number = Math.abs(originalValue);
    let i: number = this.numberBuffer.length - 1;

    while (value >= 64) {
      this.numberBuffer[i--] = value & 0x7F;
      value >>>= 7;
    }

    // Leading byte
    this.numberBuffer[i] = value;

    // Sign bit
    if (originalValue < 0) {
      this.numberBuffer[i] |= 0x40;
    }

    // Stop bit
    this.numberBuffer[this.numberBuffer.length - 1] |= 0x80;

    this.writeable.writeBytes(this.numberBuffer, i, this.numberBuffer.length - i);
  }

  writeVariableLengthUnsignedInt(originalValue: number) : void {
    let value: number = originalValue;
    let i: number = this.numberBuffer.length;

    this.numberBuffer[--i] = (value & 0x7F) | 0x80;
    value >>>= 7;

    while (value > 0) {
      this.numberBuffer[--i] = value & 0x7F
      value >>>= 7;
    }

    this.writeable.writeBytes(this.numberBuffer, i);
  }

  writeByte(byte: number) : void {
    this.writeable.writeByte(byte);
  }

  writeBytes(bytes: number[]) : void {
    this.writeable.writeBytes(bytes);
  }

  getBytes(): number[] {
    return this.writeable.getBytes();
  }

  static getUnsignedIntSize(value: number) : number {
    if (value === 0) {
      return 1;
    }
    let numberOfBits = Math.floor(Math['log2'](value)) + 1;
    let numberOfBytes = Math.ceil(numberOfBits / 8);
    return numberOfBytes;
  }

  static getVariableLengthSignedIntSize(value: number) : number {
    let absoluteValue: number = Math.abs(value);
    if (absoluteValue === 0) {
      return 1;
    }
    let valueBits: number = Math.floor(Math['log2'](absoluteValue)) + 1;
    let trailingStopBits: number = Math.floor(valueBits / 7);
    let leadingStopBit = 1;
    let signBit = 1;
    return Math.ceil((valueBits + trailingStopBits + leadingStopBit + signBit) / 8);
  }

  static getVariableLengthUnsignedIntSize(value: number) : number {
    if (value === 0) {
      return 1;
    }
    let valueBits: number = Math.floor(Math['log2'](value)) + 1;
    let stopBits: number = Math.ceil(valueBits / 7);
    return Math.ceil((valueBits + stopBits) / 8);
  }
}
