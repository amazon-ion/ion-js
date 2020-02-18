import {Decimal, Timestamp, IonType} from "../Ion";
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
     * For the Boolean type, returns a JS boolean representation of the Value; otherwise
     * throws an Error.
     */
    booleanValue(): boolean | null;

    /**
     * For the Integer, Float, and Decimal types, returns a JS number representation of the
     * Value; otherwise throws an Error.
     *
     * In some cases, this method will perform conversions that inherently involve loss of
     * precision. See bigIntValue() and decimalValue() for lossless alternatives.
     */
    numberValue(): number | null;

    /**
     * For the Integer type, returns a BigInt representation of the Value; otherwise throws
     * an Error.
     */
    bigIntValue(): JSBI | null;

    /**
     * For the Decimal type, returns an ion.Decimal representation of the Value; otherwise
     * throws an Error.
     */
    decimalValue(): Decimal | null;

    /**
     * For the String and Symbol types, returns a JS string representation of the Value's
     * text; otherwise throws an Error.
     */
    stringValue(): string | null;

    /**
     * For the Timestamp type, returns a JS Date representation of the Value; otherwise throws
     * an Error.
     *
     * Note that the conversion from an ion.Timestamp to a Date can involve a loss of precision.
     * See timestampValue() for a lossless alternative.
     */
    dateValue(): Date | null;

    /**
     * For the Timestamp type, returns an ion.Timestamp representation of the Value; otherwise throws
     * an Error.
     */
    timestampValue(): Timestamp | null;

    /**
     * For the Blob and Clob types, returns a Uint8Array representation of the Value's bytes;
     * otherwise throws an Error.
     */
    uInt8ArrayValue(): Uint8Array | null;

    /**
     * Attempts to index into the Value with each pathElement in turn until:
     *  - The current Value is of a type that cannot be indexed into.
     *    (e.g. The current value is an Integer or Timestamp.)
     *  - A value is found that cannot use the current PathElement as an index.
     *    (e.g. The current Value is a List but the current PathElement is a string.)
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
     * For the Struct type, returns an array containing the names of the fields in the Struct;
     * otherwise throws an Error.
     */
    fieldNames(): string[];

    /**
     * For the Struct type, returns an array containing the field name/value pairs in the Struct;
     * otherwise throws an Error.
     */
    fields(): [string, Value][];

    /**
     * For the Struct, List, and SExpression types, returns an array containing the container's
     * nested values; otherwise throws an Error.
     */
    elements(): Value[];

    /**
     * Allows for easy type casting from Value to a particular implementation of Value.
     *
     * If the Value is an instance of the type `T` represented by the provided constructor, this
     * function will cast it as type `T` and return it; otherwise throws an Error.
     */
    as<T extends Value>(ionValueType: Constructor<T>): T;
}

/**
 * Represents data types that may be used to index into a Value.
 *
 * See: Value#get
 */
export type PathElement = string | number;