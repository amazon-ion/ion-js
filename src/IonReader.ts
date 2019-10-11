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

import { Decimal } from "./IonDecimal";
import { IonType } from "./IonType";
import { Timestamp } from "./IonTimestamp";
import JSBI from "jsbi";
import IntSize from "./IntSize";

/** Represents the possible return values of [[Reader.value]]. */
export type ReaderScalarValue = null | boolean | number | Decimal | Timestamp | string | Uint8Array;

/**
 * A pull parser interface over Ion data.
 *
 * Generally, users will use [[next]] and [[stepIn]] and [[stepOut]]
 * to traverse the structure of the data. The **Value** suffixed methods are
 * used to extract the scalar data out of the current position of the [[Reader]].
 *
 * [[Reader]] instances start *before* a value, thus you have to
 * invoke [[next]] to position a newly created reader on the first value.
 */
export interface Reader {
    /**
     * Advances the reader to the next value in the stream at the current depth.
     *
     * @return The corresponding [[IonType]] of the value the reader moves to, or `null`
     *  if the reader is at the end of the stream or container.
     */
    next(): IonType | null;

    /**
     * Steps into the container the reader is currently positioned on.  Note that this
     * positions the reader *before* the first value within the container.
     *
     * @throw Error if the reader is not positioned on a container or the container [[isNull]].
     */
    stepIn(): void;

    /**
     * Steps out of the current container.  This is only valid when the reader is inside of a container
     * (i.e. `depth() > 0`).  Note that the positions the reader *after* the container that was
     * stepped out of, but *before* the next value after the container.  One should generally
     * call [[next]] after invoking this method.
     *
     * @throw Error if the reader is not positioned within a container.
     */
    stepOut(): void;

    /** Returns the depth of the reader.  This is `0` if the reader is not inside of a container. */
    depth(): number;

    // TODO implement symboltokens to replace string[] https://github.com/amzn/ion-js/issues/121
    /**
     * Returns the annotations for the current value.
     *
     * @return the empty array if the there are no annotations or the reader is not positioned on a value.
     */
    annotations(): string[];

    /**
     * Returns the field name of the current value.
     *
     * @return `null` if the reader is not positioned on a value or is on a value that has no field name.
     */
    fieldName(): string | null;

    /** Returns true if and only if the reader is positioned on a `null` value of any type. */
    isNull(): boolean;

    /**
     * Returns the [[IonType]] associated with the current value.
     *
     * @return `null` if the reader is not positioned on a value.
     */
    type(): IonType | null;

    /**
     * Returns the current value as a `boolean`.  This is only valid if `type() == IonTypes.BOOL`.
     *
     * @return `null` if the current Ion value [[isNull]].
     *
     * @throw Error when the reader is not positioned on a `bool` typed value.
     */
    booleanValue(): boolean | null;

    /**
     * Returns the current value as a `Uint8Array`.  This is only valid if `type() == IonTypes.CLOB`
     * or `type() == IonTypes.BLOB`.
     *
     * @return `null` if the current Ion value [[isNull]].
     *
     * @throw Error when the reader is not positioned on a `clob` or `blob` typed value.
     */
    byteValue(): Uint8Array | null;

    /**
     * Returns the current value as a [[Decimal]].  This is only valid if `type() == IonTypes.DECIMAL`.
     *
     * @return `null` if the current Ion value [[isNull]].
     *
     * @throw Error when the reader is not positioned on a `decimal` typed value.
     */
    decimalValue(): Decimal | null;

    /**
     * Returns the current value as a `number`.  This is only valid if `type() == IonTypes.INT`
     * or `type() == IonTypes.FLOAT`.
     *
     * @return `null` if the current Ion value [[isNull]]. For `int` values that are outside of
     *  the range specified by `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER`, this method
     *  will truncate the result.
     *
     * @throw Error when the reader is not positioned on an `int` or `float` typed value.
     */
    numberValue(): number | null;

    /**
     * Returns the current value as a `BigInt`.  This is only valid if `type() == IonTypes.INT`.
     *
     * @return `null` if the current Ion value [[isNull]] or a BigInt containing the deserialized integer.
     *
     * @throw Error when the reader is not positioned on an `int` typed value.
     */
    bigIntValue(): JSBI | null;

    /**
     * Indicates whether the current int value is small enough to be stored in a number without loss of precision
     * or if a BigInt is required.
     *
     * @return [[IntSize.Number]] if the value will fit in a number, [[IntSize.BigInt]] otherwise.
     */
     intSize(): IntSize;

    /**
     * Returns the current value as a `string`.  This is only valid if `type() == IonTypes.STRING`
     * or `type() == IonTypes.SYMBOL`.
     *
     * @return `null` if the current Ion value [[isNull]].
     *
     * @throw Error when the reader is not positioned on a `string` or `symbol` typed value.
     */
    stringValue(): string | null;

    /**
     * Returns the current value as a [[Timestamp]].  This is only valid if `type() == IonTypes.TIMESTAMP`.
     *
     * @return `null` if the current Ion value [[isNull]].
     *
     * @throw Error when the reader is not positioned on a `timestamp` typed value.
     */
    timestampValue(): Timestamp | null;

    /**
     * Returns the current scalar value.  This is only valid when `type().scalar == true`.
     *
     * @return `null` if the current value is [[isNull]], equivalent to the corresponding `xxxValue` methods
     *  for all scalar types.
     *
     * @throw Error when the reader is not positioned on a scalar value.
     */
    value(): ReaderScalarValue;
}