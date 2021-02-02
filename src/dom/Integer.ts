import JSBI from "jsbi";
import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { Constructor, Value } from "./Value";

// JSBI is an irregular class type in that it provides no constructor, only static
// constructor methods. This means that while it is a class type and `instanceof JSBI`
// works as expected, the JSBI class does not conform to the typical Constructor
// interface of new(...args) => any. Because FromJsConstructor will only use it for
// instanceof tests, we can safely cast it as a Constructor to satisfy the compiler.
const _jsbiConstructor: Constructor = (JSBI as unknown) as Constructor;
const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withPrimitives(Primitives.Number)
  .withClassesToUnbox(Number)
  .withClasses(_jsbiConstructor)
  .build();

/**
 * Represents an integer value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#int
 */
export class Integer extends Value(Number, IonTypes.INT, _fromJsConstructor) {
  private _bigIntValue: JSBI | null;
  private _numberValue: number;

  /**
   * Constructor.
   * @param value         The numeric value to represent as an integer.
   * @param annotations   An optional array of strings to associate with `value`.
   */
  constructor(value: JSBI | number, annotations: string[] = []) {
    // If the provided value is a JS number, we will defer constructing a BigInt representation
    // of it until it's requested later by a call to bigIntValue().
    if (typeof value === "number") {
      super(value);
      this._numberValue = value;
      this._bigIntValue = null;
    } else {
      const numberValue: number = JSBI.toNumber(value);
      super(numberValue);
      this._bigIntValue = value;
      this._numberValue = numberValue;
    }
    this._setAnnotations(annotations);
  }

  bigIntValue(): JSBI {
    if (this._bigIntValue === null) {
      this._bigIntValue = JSBI.BigInt(this.numberValue());
    }
    return this._bigIntValue;
  }

  numberValue(): number {
    return this._numberValue;
  }

  toString(): string {
    if (this._bigIntValue === null) {
      return this._numberValue.toString();
    }
    return this._bigIntValue.toString();
  }

  valueOf() {
    return this.numberValue();
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    if (this._bigIntValue === null) {
      writer.writeInt(this.numberValue());
    } else {
      writer.writeInt(this._bigIntValue);
    }
  }

  _ionEquals(
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

    if (options.onlyCompareIon) {
      // `compareOnlyIon` requires that the provided value be an ion.dom.Integer instance.
      if (other instanceof Integer) {
        isSupportedType = true;
        if (this._bigIntValue == null && other._bigIntValue == null) {
          valueToCompare = other.numberValue();
        } else {
          // One of them is a JSBI
          valueToCompare = other.bigIntValue();
        }
      }
    } else {
      // We will consider other Integer-ish types
      if (other instanceof global.Number || typeof other === "number") {
        isSupportedType = true;
        if (this.bigIntValue == null) {
          valueToCompare = other.valueOf();
        } else {
          valueToCompare = JSBI.BigInt(other.valueOf());
        }
      } else if (other instanceof JSBI) {
        isSupportedType = true;
        valueToCompare = other;
      }
    }

    if (!isSupportedType) {
      return false;
    }

    if (valueToCompare instanceof JSBI) {
      return JSBI.equal(this.bigIntValue(), valueToCompare);
    }
    return this.numberValue() == valueToCompare;
  }
}
