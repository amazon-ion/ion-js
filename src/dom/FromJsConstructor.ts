import { dom, IonTypes } from "../Ion";
import { _hasValue } from "../util";
import { Constructor, Value } from "./Value";

// Converts the provided Iterable into a Set. If no iterable is provided, returns an empty set.
function _newSet<T>(values?: Iterable<T>): Set<T> {
  if (_hasValue(values)) {
    return new Set<T>(values);
  }
  return new Set<T>();
}

/**
 * Builder to configure and instantiate FromJsConstructor objects. See the documentation for
 * the FromJsConstructor class for a description of each field.
 *
 * Package-visible for use in dom.Value subclass definitions.
 * @private
 */
export class FromJsConstructorBuilder {
  private _primitives: Set<string>;
  private _classesToUnbox: Set<Constructor>;
  private _classes: Set<Constructor>;

  constructor() {
    this._primitives = _newSet();
    this._classesToUnbox = _newSet();
    this._classes = _newSet();
  }

  withPrimitives(...primitives: string[]): FromJsConstructorBuilder {
    this._primitives = _newSet(primitives);
    return this;
  }

  withClasses(...classes: Constructor[]): FromJsConstructorBuilder {
    this._classes = _newSet(classes);
    return this;
  }

  withClassesToUnbox(...classes: Constructor[]): FromJsConstructorBuilder {
    this._classesToUnbox = _newSet(classes);
    return this;
  }

  build(): FromJsConstructor {
    return new FromJsConstructor(
      this._primitives,
      this._classesToUnbox,
      this._classes
    );
  }
}

/**
 * Provides common conversion and validation logic needed to instantiate subclasses of dom.Value
 * from a given Javascript value of unknown type (`any`) and an optional annotations array.
 *
 * Given a Javascript value, will test its type to see whether it is:
 * 1. A primitive that is supported by the specified constructor.
 * 2. A boxed primitive that is supported by the specified constructor if unboxed via `valueOf()`.
 * 3. A class that is supported by the specified constructor as-is, including boxed primitives.
 *
 * If the value matches any of the above descriptions, the provided constructor will be invoked
 * with the value; otherwise, throws an Error.
 *
 * Constructors are expected to be compatible with the signature:
 *
 *      constructor(value, annotations: string[]): ClassName
 *
 * See also: Value._fromJsValue()
 */
export class FromJsConstructor {
  /**
   * Constructor.
   *
   * @param _primitives       Primitive types that will be passed through as-is.
   * @param _classesToUnbox   Boxed primitive types that will be converted to primitives via
   *                          `valueOf()` and then passed through.
   * @param _classes          Classes that will be passed through as-is.
   */
  constructor(
    private readonly _primitives: Set<string>,
    private readonly _classesToUnbox: Set<Constructor>,
    private readonly _classes: Set<Constructor>
  ) {}

  /**
   * Invokes the provided constructor if `jsValue` is of a supported data type; otherwise
   * throws an Error.
   *
   * @param constructor   A dom.Value subclass's constructor to call.
   * @param jsValue       A Javascript value to validate/unbox before passing through to
   *                      the constructor.
   * @param annotations   An optional array of strings to associate with the newly constructed
   *                      dom.Value.
   */
  construct(constructor: any, jsValue: any, annotations: string[] = []): Value {
    if (jsValue === null) {
      return new dom.Null(IonTypes.NULL, annotations);
    }

    const jsValueType = typeof jsValue;
    if (jsValueType === "object") {
      // jsValue is an unsupported boxed primitive, but we can use it if we convert it to a primitive first
      if (this._classesToUnbox.has(jsValue.constructor)) {
        return new constructor(jsValue.valueOf(), annotations);
      }

      // jsValue is an Object of a supported type, including boxed primitives
      if (this._classes.has(jsValue.constructor)) {
        return new constructor(jsValue, annotations);
      }

      throw new Error(
        `Unable to construct a(n) ${constructor.name} from a ${jsValue.constructor.name}.`
      );
    }

    if (this._primitives.has(jsValueType)) {
      return new constructor(jsValue, annotations);
    }

    throw new Error(
      `Unable to construct a(n) ${constructor.name} from a ${jsValueType}.`
    );
  }
}

// This namespace will be merged with the class definition above. This allows static values to invoke functions in the
// FromJsConstructor class after the class has been fully initialized.
export namespace FromJsConstructor {
  // Useful for dom.Value subclasses that do not use a FromJsConstructor (e.g. Struct, List).
  // Because it has no supported types, any attempt to use this instance will throw an Error.
  export const NONE: FromJsConstructor = new FromJsConstructorBuilder().build();
}

/**
 * A mapping of primitive types to the corresponding string that will be returned by
 * the `typeof` operator.
 */
export const Primitives = {
  /*
   * Some possible values are not included because they are unsupported. In particular:
   *   - "object" indicates that a value is not a primitive.
   *   - The mapping from Javascript's "symbol" to Ion's type system is not yet clear.
   *   - No constructors accept "undefined" as a parameter.
   */
  Boolean: "boolean",
  Number: "number",
  String: "string",
};
