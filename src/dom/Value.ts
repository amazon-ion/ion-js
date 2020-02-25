import {Decimal, dom, IonType, IonTypes, Timestamp} from "../Ion";
import JSBI from "jsbi";
import * as JsValueConversion from "./JsValueConversion";

// This file leverages Typescript's declaration merging feature[1] to create a
// combined type/value called `Value` that is simultaneously an interface, a mixin constructor,
// and a namespace, enabling the following behavior:
// * Classes can implement Value
// * Classes can extend a mixin constructed by Value()
// * `instanceof Value` returns true for classes that extend a mixin constructed by Value()
// * Concrete Value implementations can be constructed by calling Value.from(jsValue)
//
// [1] https://www.typescriptlang.org/docs/handbook/declaration-merging.html

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

/**
 * A type alias for the constructor signature required for mixins.
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * A mixin[1] that allows each DOM class to effectively extend two different parent classes:
 *   1. The corresponding native JS data type (dom.String extends String, dom.Integer extends Number, etc.)
 *   2. A new class constructed by the DomValue method which provides functionality common to all
 *      DOM elements. This includes storing/accessing an Ion data type and annotations, as well as
 *      convenience methods for converting from Ion data types to JS data types.
 *
 * [1] https://www.typescriptlang.org/docs/handbook/mixins.html
 *
 * @param BaseClass     A parent type for the newly constructed class to extend.
 * @param ionType       The Ion data type that will be associated with new instances of the constructed class.
 * @constructor
 */
export function Value<Clazz extends Constructor>(BaseClass: Clazz, ionType: IonType) {
    return class extends BaseClass implements Value {
        _ionType: IonType;
        _ionAnnotations: string[];

        /* TODO:
         *  Ideally, this mixin's constructor would require subclasses to specify the desired annotations list
         *  for the value being created as an argument. Something like:
         *     constructor(annotations: string[], ...args: any[]) {
         *         super(args);
         *         this._setAnnotations(annotations);
         *     }
         *  Unfortunately, Typescript requires[1] that mixins have a single constructor which accepts a
         *  single spread parameter. This means that we can't statically enforce this; callers would need
         *  to "just know" to pass an annotations list as the first element of an arguments array.
         *  For now, subclasses are expected to call `this._setAnnotations(...)` after the constructor completes.
         *  This avoids the runtime costs that would be associated with the constant slicing/inspection of
         *  values in the `...args` list to detect annotations.
         *
         *  [1] https://github.com/Microsoft/TypeScript/issues/14126
         */
        constructor(...args: any[]) {
            super(...args);
            this._ionType = ionType;
            this._ionAnnotations = [];
            // Setting the 'enumerable' attribute of these properties to `false` prevents them
            // from appearing in the iterators returned by Object.keys(), Object.entries(), etc.
            // This guarantees that users iterating over the fields of a struct or values in a list
            // will see only Values from the source data or that they have created themselves.
            Object.defineProperty(this, "_ionType", {enumerable: false});
            Object.defineProperty(this, "_ionAnnotations", {enumerable: false});
        }

        _unsupportedOperation<T extends Value>(functionName: string): never {
            throw new Error(`Value#${functionName}() is not supported by Ion type ${this.getType().name}`);
        }

        getType(): IonType {
            return this._ionType;
        }

        // Class expressions (like this mixin) cannot have private or protected methods.
        _setAnnotations(annotations: string[]) {
            this._ionAnnotations = annotations;
        }

        getAnnotations(): string[] {
            if (this._ionAnnotations === null) {
                return [];
            }
            return this._ionAnnotations;
        }

        isNull(): boolean {
            return false;
        }

        booleanValue(): boolean | null {
            this._unsupportedOperation('booleanValue');
        }

        numberValue(): number | null {
            this._unsupportedOperation('numberValue');
        }

        bigIntValue(): JSBI | null {
            this._unsupportedOperation('bigIntValue');
        }

        decimalValue(): Decimal | null {
            this._unsupportedOperation('decimalValue');
        }

        stringValue(): string | null {
            this._unsupportedOperation('stringValue');
        }

        dateValue(): Date | null {
            this._unsupportedOperation('dateValue');
        }

        timestampValue(): Timestamp | null {
            this._unsupportedOperation('timestampValue');
        }

        uInt8ArrayValue(): Uint8Array | null {
            this._unsupportedOperation('uInt8ArrayValue');
        }

        fieldNames(): string[] {
            this._unsupportedOperation('fieldNames');
        }

        fields(): [string, Value][] {
            this._unsupportedOperation('fields');
        }

        elements(): Value[] {
            this._unsupportedOperation('elements');
        }

        get(...pathElements: PathElement[]): Value | null {
            this._unsupportedOperation('get');
        }

        as<T extends Value>(ionValueType: Constructor<T>): T {
            if (this instanceof ionValueType) {
                return this as unknown as T;
            }
            throw new Error(`${this.constructor.name} is not an instance of ${ionValueType.name}`);
        }
    };
}

export namespace Value {
    /**
     * Constructs a dom.Value from the provided Javascript value using the following type mappings:
     *
     * JS Type    | dom.Value subclass
     * -----------------------------
     * null       | dom.Null
     * boolean    | dom.Boolean
     * number     | dom.Integer or dom.Float
     * BigInt     | dom.Integer
     * string     | dom.String
     * Decimal    | dom.Decimal
     * Date       | dom.Timestamp
     * Timestamp  | dom.Timestamp
     * Uint8Array | dom.Blob
     * Array      | dom.List
     * Object     | dom.Struct
     *
     * Other input types (including 'undefined') are not supported and will throw an Error.
     *
     * If the input type is an Array or Object, this method will also convert each nested javascript
     * values into a dom.Value.
     *
     * @param value         A javascript value to convert into an Ion dom.Value.
     * @param annotations   An optional array of strings to associate with the newly created dom.Value.
     *                      These annotations will NOT be associated with any nested dom.Values.
     */
    export function from(value: any, annotations: string[] = []): Value {
        return JsValueConversion._ionValueFromJsValue(value, annotations);
    }
}