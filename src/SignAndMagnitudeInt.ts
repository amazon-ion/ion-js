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

import JSBI from "jsbi";
import { JsbiSupport } from "./JsbiSupport";

/**
 * Represents a signed, arbitrarily sized integer.
 *
 * BigInts cannot represent negative zero. This class should be used in situations where negative zero is
 * a supported value, such as when decoding binary Ion Int/VarInt.
 *
 * http://amzn.github.io/ion-docs/docs/binary.html#uint-and-int-fields
 *
 */
export default class SignAndMagnitudeInt {
  constructor(
    public readonly _magnitude: JSBI,
    public readonly _isNegative = JsbiSupport.isNegative(_magnitude),
  ) {}

  get magnitude(): JSBI {
    return this._magnitude;
  }

  get isNegative(): boolean {
    return this._isNegative;
  }

  public static fromNumber(value: number): SignAndMagnitudeInt {
    const isNegative = value < 0 || Object.is(value, -0);
    const absoluteValue = Math.abs(value);
    const magnitude = JSBI.BigInt(absoluteValue);
    return new SignAndMagnitudeInt(magnitude, isNegative);
  }

  public equals(other: SignAndMagnitudeInt): boolean {
    return (
      JSBI.equal(this._magnitude, other._magnitude) &&
      this._isNegative === other._isNegative
    );
  }
}
