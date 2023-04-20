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

import { BigIntSerde } from "./BigIntSerde";
import { Writeable } from "./IonWriteable";

/**
 * Values in the Ion binary format are serialized as a sequence of low-level fields. This
 * writer is responsible for emitting those fields in the proper format.
 * @see https://amazon-ion.github.io/ion-docs/binary.html#basic-field-formats
 */
export class LowLevelBinaryWriter {
  private readonly writeable: Writeable;

  constructor(writeable: Writeable) {
    this.writeable = writeable;
  }

  static getSignedIntSize(value: number): number {
    if (value === 0) {
      return 1;
    }
    const numberOfSignBits = 1;
    const magnitude = Math.abs(value);
    const numberOfMagnitudeBits = Math.ceil(Math.log2(magnitude + 1));
    const numberOfBits = numberOfMagnitudeBits + numberOfSignBits;
    return Math.ceil(numberOfBits / 8);
  }

  static getUnsignedIntSize(value: number | bigint): number {
    if (typeof value === "bigint") {
      return BigIntSerde.getUnsignedIntSizeInBytes(value);
    }
    if (value === 0) {
      return 1;
    }
    const numberOfBits = Math.floor(Math.log2(value)) + 1;
    const numberOfBytes = Math.ceil(numberOfBits / 8);
    return numberOfBytes;
  }

  static getVariableLengthSignedIntSize(value: number): number {
    const absoluteValue: number = Math.abs(value);
    if (absoluteValue === 0) {
      return 1;
    }
    const valueBits: number = Math.floor(Math.log2(absoluteValue)) + 1;
    const trailingStopBits: number = Math.floor(valueBits / 7);
    const leadingStopBit = 1;
    const signBit = 1;
    return Math.ceil(
      (valueBits + trailingStopBits + leadingStopBit + signBit) / 8
    );
  }

  static getVariableLengthUnsignedIntSize(value: number): number {
    if (value === 0) {
      return 1;
    }
    const valueBits: number = Math.floor(Math.log2(value)) + 1;
    const stopBits: number = Math.ceil(valueBits / 7);
    return Math.ceil((valueBits + stopBits) / 8);
  }

  writeSignedInt(originalValue: number): void {
    // TODO this should flip to different modes based on the length calculation because bit shifting will drop to 32 bits.
    const length = LowLevelBinaryWriter.getSignedIntSize(originalValue);
    let value: number = Math.abs(originalValue);
    const tempBuf = new Uint8Array(length);
    // Trailing bytes
    let i: number = tempBuf.length;
    while (value >= 128) {
      tempBuf[--i] = value & 0xff;
      value >>>= 8;
    }

    tempBuf[--i] = value & 0xff;

    // Sign bit
    if (1 / originalValue < 0) {
      tempBuf[0] |= 0x80;
    }

    this.writeable.writeBytes(tempBuf);
  }

  writeUnsignedInt(originalValue: number | bigint): void {
    if (typeof originalValue === "bigint") {
      const encodedBytes = BigIntSerde.toUnsignedIntBytes(originalValue);
      this.writeable.writeBytes(encodedBytes);
      return;
    }

    const length = LowLevelBinaryWriter.getUnsignedIntSize(originalValue);
    const tempBuf = new Uint8Array(length);
    let value: number = originalValue;
    let i: number = tempBuf.length;

    while (value > 0) {
      // JavaScript bitwise operators treat operands as 32-bit sequences,
      // so we avoid using >>> in order to support values requiring more than 32 bits
      tempBuf[--i] = value % 256;
      value = Math.trunc(value / 256);
    }

    this.writeable.writeBytes(tempBuf);
  }

  writeVariableLengthSignedInt(originalValue: number): void {
    const tempBuf = new Uint8Array(
      LowLevelBinaryWriter.getVariableLengthSignedIntSize(originalValue)
    );
    let value: number = Math.abs(originalValue);
    let i = tempBuf.length - 1;

    while (value >= 64) {
      tempBuf[i--] = value & 0x7f;
      value >>>= 7;
    }

    // Leading byte
    tempBuf[i] = value;

    // Sign bit
    if (1 / originalValue < 0) {
      tempBuf[i] |= 0x40;
    }

    // Stop bit
    tempBuf[tempBuf.length - 1] |= 0x80;

    this.writeable.writeBytes(tempBuf);
  }

  writeVariableLengthUnsignedInt(originalValue: number): void {
    const tempBuf = new Uint8Array(
      LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(originalValue)
    );
    let value: number = originalValue;
    let i = tempBuf.length;

    tempBuf[--i] = (value & 0x7f) | 0x80;
    value >>>= 7;

    while (value > 0) {
      tempBuf[--i] = value & 0x7f;
      value >>>= 7;
    }

    this.writeable.writeBytes(tempBuf);
  }

  writeByte(byte: number): void {
    this.writeable.writeByte(byte);
  }

  writeBytes(bytes: Uint8Array): void {
    this.writeable.writeBytes(bytes);
  }

  getBytes(): Uint8Array {
    return this.writeable.getBytes();
  }
}
