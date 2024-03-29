import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { Constructor, Value } from "./Value";

// BigInt is an irregular class type in that it provides no constructor, only static
// constructor methods. This means that bigint does not conform to the typical Constructor
// interface of new(...args) => any. Because FromJsConstructor will only use it for
// instanceof tests, we can safely cast it as a Constructor to satisfy the compiler.
const _bigintConstructor: Constructor = (BigInt as unknown) as Constructor;
const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withPrimitives(Primitives.Number, Primitives.BigInt)
  .withClassesToUnbox(Number)
  .withClasses(_bigintConstructor)
  .build();

/**
 * Represents an integer value in an Ion stream.
 *
 * [1] https://amazon-ion.github.io/ion-docs/docs/spec.html#int
 */
export class Integer extends Value(Number, IonTypes.INT, _fromJsConstructor) {
  private _bigIntValue: bigint | null;
  private _numberValue: number;

  /**
   * Constructor.
   * @param value         The numeric value to represent as an integer.
   * @param annotations   An optional array of strings to associate with `value`.
   */
  constructor(value: bigint | number, annotations: string[] = []) {
    // If the provided value is a JS number, we will defer constructing a BigInt representation
    // of it until it's requested later by a call to bigIntValue().
    if (typeof value === "number") {
      super(value);
      this._numberValue = value;
      this._bigIntValue = null;
    } else {
      const numberValue: number = Number(value);
      super(numberValue);
      this._bigIntValue = value;
      this._numberValue = numberValue;
    }
    this._setAnnotations(annotations);
  }

  bigIntValue(): bigint {
    if (this._bigIntValue === null) {
      this._bigIntValue = BigInt(this.numberValue());
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

    // if the provided value is an ion.dom.Integer instance.
    if (other instanceof Integer) {
      isSupportedType = true;
      if (this._bigIntValue == null && other._bigIntValue == null) {
        valueToCompare = other.numberValue();
      } else {
        // One of them is a bigint
        valueToCompare = other.bigIntValue();
      }
    } else if (!options.onlyCompareIon) {
      // We will consider other Integer-ish types
      if (other instanceof Number || typeof other === "number") {
        isSupportedType = true;
        if (this.bigIntValue == null) {
          valueToCompare = other.valueOf();
        } else {
          valueToCompare = BigInt(other.valueOf());
        }
      } else if (typeof other === "bigint") {
        isSupportedType = true;
        valueToCompare = other;
      }
    }

    if (!isSupportedType) {
      return false;
    }

    if (typeof valueToCompare === "bigint") {
      return this.bigIntValue() === valueToCompare;
    }
    return this.numberValue() == valueToCompare;
  }
}
