import {Decimal, IonType, Timestamp} from "../Ion";
import {PathElement, Value} from "./Value";
import JSBI from "jsbi";

/**
 * A type alias for the constructor signature required for mixins.
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * A mixin[1] that allows each DOM class to effectively extend two different parent classes:
 *   1. The corresponding native JS data type (dom.String extends String, dom.Integer extends Number, etc.)
 *   2. A new class constructed by the DomValue method which provides functionality common to all
 *      DOM elements. This includes storing/accessing an ion data type and annotations, as well as
 *      convenience methods for converting from ion data types to JS data types.
 *
 * [1] https://www.typescriptlang.org/docs/handbook/mixins.html
 *
 * @param BaseClass     A parent type for the newly constructed class to extend.
 * @param ionType       The Ion data type that will be associated with new instances of the constructed class.
 * @constructor
 */
export function DomValue<Clazz extends Constructor>(BaseClass: Clazz, ionType: IonType) {
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
            return null;
        }

        as<T extends Value>(ionValueType: Constructor<T>): T {
            if (this instanceof ionValueType) {
                return this as unknown as T;
            }
            throw new Error(`${this.constructor.name} is not an instance of ${ionValueType.name}`);
        }
    };
}