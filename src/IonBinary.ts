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

/** @file Constants and enums for the Ion Binary format */

export const NIBBLE_MASK = 0xf;
export const BYTE_MASK = 0xff;
export const TYPE_SHIFT = 4;
export const BYTE_SHIFT = 8;

export const LEN_MASK = 0xf;
export const LEN_VAR = 14; // 0xe
export const LEN_NULL = 15; // 0xf

export const TB_NULL = 0;
export const TB_BOOL = 1;
export const TB_INT = 2;
export const TB_NEG_INT = 3;
export const TB_FLOAT = 4;
export const TB_DECIMAL = 5;
export const TB_TIMESTAMP = 6;
export const TB_SYMBOL = 7;
export const TB_STRING = 8;
export const TB_CLOB = 9;
export const TB_BLOB = 10; // 0xa
export const TB_LIST = 11; // 0xb
export const TB_SEXP = 12; // 0xc
export const TB_STRUCT = 13; // 0xd
export const TB_ANNOTATION = 14; // 0xe
