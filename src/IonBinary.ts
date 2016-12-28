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
export const NIBBLE_MASK = 0xf;
export const BYTE_MASK =  0xff;
export const TYPE_SHIFT =    4;
export const BYTE_SHIFT =    8;

export const LEN_MASK =    0xf;
export const LEN_VAR  =     14;  // 0xe
export const LEN_NULL =     15;  // 0xf

export const TB_NULL          =  0;
export const TB_BOOL          =  1;
export const TB_INT           =  2;
export const TB_NEG_INT       =  3;
export const TB_FLOAT         =  4;
export const TB_DECIMAL       =  5;
export const TB_TIMESTAMP     =  6;
export const TB_SYMBOL        =  7;
export const TB_STRING        =  8;
export const TB_CLOB          =  9;
export const TB_BLOB          = 10;  // 0xa
export const TB_LIST          = 11;  // 0xb
export const TB_SEXP          = 12;  // 0xc
export const TB_STRUCT        = 13;  // 0xd
export const TB_ANNOTATION    = 14;  // 0xe

export enum TypeCodes {
  NULL = 0,
  BOOL = 1,
  POSITIVE_INT = 2,
  NEGATIVE_INT = 3,
  FLOAT = 4,
  DECIMAL = 5,
  TIMESTAMP = 6,
  SYMBOL = 7,
  STRING = 8,
  CLOB = 9,
  BLOB = 10,
  LIST = 11,
  SEXP = 12,
  STRUCT = 13,
  ANNOTATION = 14,
}

export function getBits(value: number[], offset: number, count: number) : number {
  if (count > 8) {
    throw new Error("Can only get up to 8 bits at a time");
  }
  if (count < 0) {
    throw new Error("Must get at least one bit");
  }
  if ((offset + count) > (value.length * 8)) {
    throw new Error("Bits region runs past the end of the value");
  }

  let leftArrayIndex: number = offset >>> 3;
  let rightArrayIndex: number = (offset + count - 1) >>> 3;

  let leftByteOffset = offset % 8;
  let rightByteOffset = ((offset + count - 1) % 8) + 1;

  let isSameByte: boolean = leftArrayIndex === rightArrayIndex;
  if (isSameByte) {
    let result: number =
      (value[leftArrayIndex] & (255 >>> leftByteOffset))
      >>> (8 - rightByteOffset);
    return result;
  } else {
    let leftResult: number =
      (value[leftArrayIndex] & (255 >>> leftByteOffset))
      << rightByteOffset;
    let rightResult: number = value[rightArrayIndex] >>> (8 - rightByteOffset);
    let result: number = leftResult | rightResult;
    return result;
  }
}
