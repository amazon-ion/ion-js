import { IonTypes, Writer } from "../Ion";
import { FromJsConstructor } from "./FromJsConstructor";
import { PathElement, Value } from "./Value";

/**
 * Represents a struct[1] value in an Ion stream.
 *
 * Struct fields can be accessed as properties on this object. For example:
 *
 * ```typescript
 *    let s: any = ion.load('{foo: 1, bar: 2, baz: qux::3}');
 *    assert.equal(6, s.foo + s['bar'] + s.baz);
 * ```
 *
 * If a field in the struct has the same name as a method on the Struct class, attempting to access that property
 * will always resolve to the method.
 *
 * ```typescript
 *     let s: any = ion.load('{fieldNames: ["foo", "bar", "baz"]}'); // Conflicts with Struct#fieldNames()
 *     assert.deepEqual(s.fieldNames, ["foo", "bar", "baz"]); // Fails; `s.fieldNames` is a method
 *     assert.deepEqual(s.fieldNames(), ["fieldNames"]); // Passes
 * ```
 *
 * Unlike direct property accesses, Struct's get() method will only resolve to fields.
 *
 * ```typescript
 *     let s: any = ion.load('{fieldNames: ["foo", "bar", "baz"]}'); // Conflicts with Struct#fieldNames()
 *     assert.equal(s.get('fieldNames', 0).stringValue(), "foo"); // Passes
 * ```
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#struct
 */
export class Struct extends Value(
  Object,
  IonTypes.STRUCT,
  FromJsConstructor.NONE
) {
  /*
   * Stores the string/Value pairs that represent the fields of the struct. These values are stored
   * separately to allow field names that would otherwise collide with public properties from the Struct class
   * itself to be stored. (e.g. 'stringValue', 'fields', or 'elements')
   */
  private _fields = Object.create(null);

  /**
   * Constructor.
   * @param fields        An iterator of field name/value pairs to represent as a struct.
   * @param annotations   An optional array of strings to associate with this null value.
   */
  constructor(
    fields: Iterable<[string, Value]> | Iterable<[string, Value[]]>,
    annotations: string[] = []
  ) {
    super();
    // Struct fields will always be stored as (fieldName, fieldValues) => (string, Value[])
    for (const [fieldName, fieldValue] of fields) {
      this._fields[fieldName] =
        fieldValue instanceof Value ? [fieldValue] : fieldValue;
    }
    this._setAnnotations(annotations);

    // Construct a Proxy that will prevent user-defined fields from shadowing public properties.
    return new Proxy(this, {
      // All values set by the user are stored in `this._fields` to avoid
      // potentially overwriting Struct methods.
      set: function (target, name, value): boolean {
        if (!(value instanceof Value)) {
          value = Value.from(value);
        }
        target._fields[name] = [value];
        return true; // Indicates that the assignment succeeded
      },
      get: function (target, name): any {
        // Property accesses will look for matching Struct API properties before
        // looking for a matching field of the same name.
        if (name in target) {
          return target[name];
        }
        let length =
          target._fields[name] !== undefined ? target._fields[name].length : -1;
        if (length === -1) {
          return target._fields[name];
        }
        return target._fields[name][length - 1];
      },
      deleteProperty: function (target, name): boolean {
        // Property is deleted only if it's in _field Collection
        if (name in target._fields) {
          delete target._fields[name];
        }
        // Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete#Return_value
        return true;
      },
    });
  }

  get(...pathElements: PathElement[]): Value | null {
    if (pathElements.length === 0) {
      throw new Error("Value#get requires at least one parameter.");
    }
    const [pathHead, ...pathTail] = pathElements;
    if (typeof pathHead !== "string") {
      throw new Error(`Cannot index into a struct with a ${typeof pathHead}.`);
    }
    const child: Value[] | undefined = this._fields[pathHead];
    if (child === undefined) {
      return null;
    }
    if (pathTail.length === 0) {
      return child[child.length - 1]!;
    }
    return child[child.length - 1]!.get(...pathTail);
  }

  getAll(...pathElements: PathElement[]): Value[] | null {
    if (pathElements.length === 0) {
      throw new Error("Value#get requires at least one parameter.");
    }
    const [pathHead, ...pathTail] = pathElements;
    if (typeof pathHead !== "string") {
      throw new Error(`Cannot index into a struct with a ${typeof pathHead}.`);
    }
    const child: Value[] | undefined = this._fields[pathHead];
    if (child === undefined) {
      return null;
    }
    if (pathTail.length === 0) {
      return child!;
    }
    let values: Value[] | undefined = [];
    child.forEach((value) => values!.push(...value.getAll(...pathTail)!));
    return values!;
  }

  fieldNames(): string[] {
    return Object.keys(this._fields);
  }

  allFields(): [string, Value[]][] {
    return Object.entries(this._fields);
  }

  fields(): [string, Value][] {
    let singleValueFields = Object.create(null);
    for (const [fieldName, values] of this.allFields()) {
      singleValueFields[fieldName] = values[values.length - 1];
    }
    return Object.entries(singleValueFields);
  }

  elements(): Value[] {
    return Object.values(this._fields).flat() as Value[];
  }

  [Symbol.iterator](): IterableIterator<[string, Value]> {
    return this.fields()[Symbol.iterator]();
  }

  toString(): string {
    return (
      "{" +
      [...this.allFields()]
        .map(([name, value]) => name + ": " + value)
        .join(", ") +
      "}"
    );
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.stepIn(IonTypes.STRUCT);
    for (const [fieldName, values] of this.allFields()) {
      for (let value of values) {
        writer.writeFieldName(fieldName);
        value.writeTo(writer);
      }
    }
    writer.stepOut();
  }

  deleteField(name: string): boolean {
    if (name in this._fields) {
      delete this._fields[name];
      return true;
    }
    return false;
  }

  toJSON() {
    let normalizedFields = Object.create(null);
    for (const [key, value] of this.fields()) {
      normalizedFields[key] = value;
    }
    return normalizedFields;
  }

  static _fromJsValue(jsValue: any, annotations: string[]): Value {
    if (!(jsValue instanceof Object)) {
      throw new Error(`Cannot create a dom.Struct from: ${jsValue.toString()}`);
    }
    const fields: [string, Value[]][] = Object.entries(
      jsValue
    ).map(([key, value]) => [key, [Value.from(value)]]);
    return new this(fields, annotations);
  }

  _valueEquals(
    other: any,
    options: {
      epsilon?: number | null;
      ignoreAnnotations?: boolean;
      ignoreTimestampPrecision?: boolean;
      onlyCompareIon?: boolean;
    } = {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true,
    }
  ): boolean {
    let isSupportedType: boolean = false;
    let valueToCompare: any = null;

    // if the provided value is an ion.dom.Struct instance.
    if (other instanceof Struct) {
      isSupportedType = true;
      valueToCompare = other.allFields();
    } else if (!options.onlyCompareIon) {
      // We will consider other Struct-ish types
      if (typeof other === "object" || other instanceof Object) {
        isSupportedType = true;
        valueToCompare = Value.from(other).allFields();
      }
    }

    if (!isSupportedType) {
      return false;
    }

    if (this.allFields().length !== valueToCompare.length) {
      return false;
    }
    let matchFound: boolean = true;
    const paired: boolean[] = new Array<boolean>(valueToCompare.length);
    for (let i: number = 0; matchFound && i < this.allFields().length; i++) {
      matchFound = false;
      for (let j: number = 0; !matchFound && j < valueToCompare.length; j++) {
        if (!paired[j]) {
          const child = this.allFields()[i];
          const expectedChild = valueToCompare[j];
          matchFound =
            child[0] === expectedChild[0] &&
            this._ionValueEquals(
              child[1].sort(),
              expectedChild[1].sort(),
              options
            );
          if (matchFound) {
            paired[j] = true;
          }
        }
      }
    }
    // set matchFound to the first pair that didn't find a matching field if any
    for (let i: number = 0; i < paired.length; i++) {
      if (!paired[i]) {
        matchFound = false;
        break;
      }
    }
    return matchFound;
  }

  // helper function for comparison of all values of a field
  _ionValueEquals(child: Value[], expectedChild: Value[], options): boolean {
    if (child.length !== expectedChild.length) {
      return false;
    }

    for (let i: number = 0; i < child.length; i++) {
      if (options.onlyCompareIon) {
        if (!child[i].ionEquals(expectedChild[i], options)) {
          return false;
        }
      } else {
        if (!child[i].equals(expectedChild[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
