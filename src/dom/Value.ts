import {Decimal, IonType} from "../Ion";
import JSBI from "jsbi";
import {Constructor} from "./DomValue";

/**
 * Provides a common interface to work with DOM elements of any Ion type.
 *
 * Implementors should return `null` for any method that cannot provide the requested value.
 */
export interface Value {
    /**
     * Returns the Ion type of this value.
     */
    getType(): IonType;

    /**
     * Returns an array containing any annotations associated with this value.
     * If this value does not have any annotations, an empty array will be returned.
     */
    getAnnotations(): string[];

    /**
     * Returns true if this Value is a Null and false otherwise.
     */
    isNull(): boolean;

    /**
     * Returns null if the Value is not a Boolean.
     * Otherwise, returns the boolean value of the Boolean.
     */
    booleanValue(): boolean | null;

    /**
     * Returns null if the Value is not an Integer, Float, or Decimal.
     * Otherwise, returns the JS number representation of the Value.
     * In some cases, this method will perform conversions that inherently involve loss of
     * precision. See bigIntValue() and decimalValue() for lossless alternatives.
     */
    numberValue(): number | null;

    /**
     * Returns null if the Value is not an Integer.
     * Otherwise, returns a lossless BigInt representation of the Value.
     */
    bigIntValue(): JSBI | null;

    /**
     * Returns null if the Value is not a Decimal.
     * Otherwise, returns a lossless Decimal representation of the Value.
     */
    decimalValue(): Decimal | null;

    /**
     * Returns null if the Value is not a String or Symbol.
     * Otherwise, returns a string representation of the Value's text.
     */
    stringValue(): string | null;

    /**
     * Returns null if the Value is not a Timestamp.
     * Otherwise, returns a Date representation of the Value.
     */
    dateValue(): Date | null;

    /**
     * Returns null if the Value is not a Blob or Clob.
     * Otherwise, returns a Uint8Array representation of the Value's bytes.
     */
    uInt8ArrayValue(): Uint8Array | null;

    /**
     * Returns null if the Value is not a Struct, List, or SExpression.
     * Otherwise, will attempt to index into the Value with each pathElement in turn
     * until:
     *  - A value is found that cannot use the current PathElement as an index.
     *    (e.g. The current Value is a List but the current PathElement is a number.)
     *  - An undefined value is encountered.
     *    (e.g. The current Value is a Struct and the current PathElement is a string,
     *          but the current PathElement is not a fieldName that exists in the Struct.)
     *  - The pathElements are exhausted and the requested Value is discovered.
     *
     * @param pathElements  One or more values to be used to index into the Value.
     * @returns null if no value is found at the specified path. Otherwise, returns the discovered Value.
     */
    get(...pathElements: PathElement[]): Value | null;

    /**
     * Returns null if the Value is not a Struct.
     * Otherwise, returns an iterator over the names of the fields in the Struct.
     */
    fieldNames(): IterableIterator<string> | null;

    /**
     * Returns null if the Value is not a Struct.
     * Otherwise, returns an iterator over the field name/value pairs in the Struct.
     */
    fields(): IterableIterator<[string, Value]> | null;

    /**
     * Returns null if the Value is not a Struct, List, or SExpression.
     * Otherwise, returns an iterator over the container's children.
     */
    values(): IterableIterator<Value> | null;

    /**
     * Allows for easy type casting from Value to a particular implementation of Value.
     *
     * Returns null if the Value is not an instance of the class type represented by the provided
     * constructor. Otherwise, casts the Value as type 'T' and returns it.
     */
    as<T extends Value>(ionValueType: Constructor<T>): T | null;
}

/**
 * Represents data types that may be used to index into a Value.
 *
 * See: Value#get
 */
export type PathElement = string | number;