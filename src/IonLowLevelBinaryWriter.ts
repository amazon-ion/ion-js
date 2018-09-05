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

  constructor(writeable : Writeable) {
        this.writeable = writeable;
    }


  writeSignedInt(originalValue: number) : void {//TODO this should flip to different modes based on the length calculation because bit shifting will drop to 32 bits.
    let length = LowLevelBinaryWriter.getSignedIntSize(originalValue);
    let value: number = Math.abs(originalValue);
    let tempBuf = new Uint8Array(length);
    // Trailing bytes
    let i: number = tempBuf.length;
    while (value >= 128) {
      tempBuf[--i] = value & 0xFF;
      value >>>= 8;
    }

    tempBuf[--i] = value & 0xFF;

    // Sign bit
    if (originalValue < 0) tempBuf[0] |= 0x80;

    this.writeable.writeBytes(tempBuf);
  }

  writeUnsignedInt(originalValue: number) : void {
    let length = LowLevelBinaryWriter.getUnsignedIntSize(originalValue);
    let tempBuf = new Uint8Array(length);


    let value: number = originalValue;
    let i: number = tempBuf.length;

    while (value > 0) {
      tempBuf[--i] = value;
      value >>>= 8;
    }

    this.writeable.writeBytes(tempBuf);
  }

  writeVariableLengthSignedInt(originalValue: number) : void {
    let tempBuf = new Uint8Array(LowLevelBinaryWriter.getVariableLengthSignedIntSize(originalValue));
    let value: number = Math.abs(originalValue);
    let i = tempBuf.length - 1;

    while (value >= 64) {
      tempBuf[i--] = value & 0x7F;
      value >>>= 7;
    }

    // Leading byte
    tempBuf[i] = value;

    // Sign bit
    if (originalValue < 0) {
      tempBuf[i] |= 0x40;
    }

    // Stop bit
    tempBuf[tempBuf.length - 1] |= 0x80;

    this.writeable.writeBytes(tempBuf);
  }

  writeVariableLengthUnsignedInt(originalValue: number) : void {
    let tempBuf = new Uint8Array(LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(originalValue));
    let value: number = originalValue;
    let i = tempBuf.length;

    tempBuf[--i] = (value & 0x7F) | 0x80;
    value >>>= 7;

    while (value > 0) {
     tempBuf[--i] = value & 0x7F
      value >>>= 7;
    }

    this.writeable.writeBytes(tempBuf);
  }

  writeByte(byte: number) : void {
    this.writeable.writeByte(byte);
  }

  writeBytes(bytes: Uint8Array) : void {
    this.writeable.writeBytes(bytes);
  }

  getBytes(): Uint8Array {
    return this.writeable.getBytes();
  }

  static getSignedIntSize(value : number) : number {
      if (value === 0) return 1;
      let absValue = Math.abs(value);
      let numberOfBits = Math.floor(Math['log2'](absValue));
      let numberOfBytes = Math.ceil(numberOfBits / 8);
      if(numberOfBits % 8 === 0) numberOfBytes++;
      return numberOfBytes;
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
