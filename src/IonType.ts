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

/** Ion value type enumeration class. */
export class IonType {
  constructor(
    /** The binary type ID for this Ion Type. */
    public readonly binaryTypeId: number,
    /** The textual name of this type. */
    public readonly name: string,
    /** Whether or not this type is a scalar value. */
    public readonly isScalar: boolean,
    /** Whether or not this type is a `clob` or `blob`. */
    public readonly isLob: boolean,
    /** Whether or not this type is an `int`, `float`, or `decimal`. */
    public readonly isNumeric: boolean,
    /** Whether or not this type is a `list`, `sexp`, or `struct`. */
    public readonly isContainer: boolean
  ) {}
}
