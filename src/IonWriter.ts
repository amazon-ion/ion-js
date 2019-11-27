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

import {Decimal} from "./IonDecimal";
import {IonType} from "./IonType";
import {Reader} from "./IonReader";
import {Timestamp} from "./IonTimestamp";
import JSBI from "jsbi";

/**
 * Serializes data in Ion text or binary format to an implementation defined buffer.
 */
export interface Writer {
    /** Writes a null value of the given [[IonType]]. */
    writeNull(type: IonType): void;

    /**
     * Writes a `boolean` as an Ion `bool` value.
     *
     * @param value The `boolean` to write, which may be `null` to write a `null.bool`.
     */
    writeBoolean(value: boolean | null): void;

    /**
     * Writes a `number` value as an Ion `int`.
     *
     * @param value The `number` to write, which may be `null` to write a `null.int`.
     *  If `number` is not an integer between the range specified by `Number.MIN_SAFE_INTEGER`
     *  and `Number.MAX_SAFE_INTEGER`, an implementation may truncate or round the value.
     */
    writeInt(value: number | JSBI | null): void;

    /**
     * Writes a `number` value as an Ion 32-bit binary `float` value.
     *
     * @param value The `number` to write, which may be `null` to write a `null.float`.
     *  If the `number` cannot be represented exactly as a 32-bit binary floating point
     *  value, an implementation may truncate or round the value.
     */
    writeFloat32(value: number | null): void;

    /**
     * Writes a `number` value as an Ion 64-bit binary `float` value.
     *
     * @param value The `number` to write, which may be `null` to write a `null.float`.
     */
    writeFloat64(value: number | null): void;

    /**
     * Writes a [[Decimal]] value as an Ion `decimal` value.
     *
     * @param value The [[Decimal]] to write, which may be `null` to write a `null.decimal`.
     */
    writeDecimal(value: Decimal | null): void;

    /**
     * Writes a [[Timestamp]] value as an Ion `timestamp` value.
     *
     * @param value The [[Timestamp]] to write, which may be `null` to write a `null.timestamp`.
     */
    writeTimestamp(value: Timestamp | null): void;

    /**
     * Writes a `string` value as an Ion `string`.
     *
     * @param value The `string` to write, which may be `null` to write a `null.string`.
     */
    writeString(value: string | null): void;

    /**
     * Writes a `string` value as an Ion `symbol`.
     *
     * @param value The `string` to write, which may be `null` to write a `null.symbol`.
     */
    writeSymbol(value: string | null): void;

    /**
     * Writes a `Uint8Array` as an Ion `blob` value.
     *
     * @param value The array to write, which may be `null` to write a `null.blob`.
     */
    writeBlob(value: Uint8Array | null): void;

    /**
     * Writes a `Uint8Array` as an Ion `clob` value.
     *
     * @param value The array to write, which may be `null` to write a `null.clob`.
     */
    writeClob(value: Uint8Array | null): void;

    /**
     * Writes a reader's current value.  If there's no current value, this method
     * does nothing.
     */
    writeValue(reader: Reader): void;

    /**
     * Writes a reader's current value and all following values until the end
     * of the current container.  If there's no current value then this method
     * calls {@link next()} to get started.
     */
    writeValues(reader: Reader): void;

    /**
     * Writes the field name for a member of a `struct`.
     *
     * @throws Error if the [[Writer]] is not within a `struct` or this method was already
     *  called before a value was written.
     */
    writeFieldName(fieldName: string): void;

    /**
     * Starts a container and positions the writer within that container.
     *
     * @throws Error if `type.container` is not one of `IonTypes.LIST`, `IonTypes.SEXP`,
     *  or `IonTypes.STRUCT`.
     */
    stepIn(type: IonType): void;

    /**
     * Steps out of a container and positions the writer after the container.
     *
     * @throws Error if the writer is not inside a container.
     */
    stepOut(): void;

    /**
     * Adds an annotation to the list of annotations to be used when
     * writing the next value.
     */
    addAnnotation(annotation: string): void;

    /**
     * Specifies the list of annotations to be used when writing
     * the next value.  This clears the current annotations set
     * for the next value.
     */
    setAnnotations(annotations: string[]): void;

    /**
     * Flushes data to the internal buffer and finalizes the Ion stream.
     *
     * @throws Error if the [[Writer]] is already closed or the writer is not
     *  at the top-level (i.e. inside of a container).
     */
    close(): void;

    /**
     * Retrieves the serialized buffer as an array of octets.  The buffer will
     * be either a UTF-8 encoded buffer for Ion text or Ion binary.  The buffer is
     * not well-defined until [[close]] is invoked.
     *
     * @throws Error if [[close]] has not been invoked.
     */
    getBytes(): Uint8Array;

    /**
     * Returns the current depth of the writer.
     */
    depth(): number;
}
