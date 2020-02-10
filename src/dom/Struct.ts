import {Value, PathElement} from "./Value";
import {IonTypes} from "../Ion";
import {DomValue} from "./DomValue";

/**
 * Represents a struct[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#struct
 */
export class Struct extends DomValue(Object, IonTypes.STRUCT) implements Value {
    /**
     * Constructor.
     * @param fields        An iterator of field name/value pairs to represent as a struct.
     * @param annotations   An optional array of strings to associate with this null value.
     */
    constructor(fields: IterableIterator<[string, Value]>, annotations: string[] = []) {
        super();
        for(let [fieldName, value] of fields) {
            Object.defineProperty(this, ''+fieldName, {
                configurable: true,
                enumerable: true,
                value: value,
                writable: true
            })
        }
        this._setAnnotations(annotations);
    }

    get(...pathElements: PathElement[]): Value | null {
        if (pathElements.length === 0) {
            throw new Error('Value#get requires at least one parameter.');
        }
        let [pathHead, ...pathTail] = pathElements;
        if (typeof(pathHead) !== "string") {
            return null;
        }
        let child: Value | null = this._getField(pathHead);
        if (pathTail.length === 0 || child === null) {
            return child;
        }
        return child.get(...pathTail);
    }

    fieldNames(): IterableIterator<string> {
        return Object.keys(this)[Symbol.iterator]();
    }

    fields(): IterableIterator<[string, Value]> {
        return Object.entries(this)[Symbol.iterator]();
    }

    values(): IterableIterator<Value> {
        return Object.values(this)[Symbol.iterator]();
    }

    [Symbol.iterator](): IterableIterator<[string, Value]> {
        return this.fields();
    }

    _getField(fieldName: string): Value | null {
        /* Typescript requires some convincing to retrieve
         * properties that may have been stored on an Object
         * via common Javascript idioms like:
         *
         *   obj['foo'] = ...;
         *   obj.foo = ...;
         *   Object.defineProperty(obj, 'foo', ...);
         *
         * Here we cast `this` from a Struct to the
         * `unknown` type to disable static type analysis.
         * Then we cast it to a vanilla JS object with string
         * keys and Value values. This casting has no runtime
         * overhead. It's a bit ugly, but allows us to access data
         * in Structs via any of:
         *
         *   let value = struct.get('foo'); // Typescript + JS
         *   let value = struct['foo']; // JS
         *   let value = struct.foo;    // JS
         */
        let obj = this as unknown as {[key: string]: Value};
        let field: Value | undefined = obj[fieldName];
        if (field === undefined) {
            return null;
        }

        return field;
    }

    toString(): string {
        return '{'
            + [...this.fields()]
                .map(([name, value]) => name + ': ' + value)
                .join(', ')
        + '}';
    }
}