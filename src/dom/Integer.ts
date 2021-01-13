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

  ionEquals(
    expectedValue: any,
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
    if (options.onlyCompareIon && expectedValue instanceof Integer) {
      expectedValue = expectedValue.numberValue();
    } else if (
      !options.onlyCompareIon &&
      (typeof expectedValue === "number" ||
        expectedValue instanceof global.Number)
    ) {
      expectedValue = expectedValue.valueOf();
    } else {
      return false;
    }
    return JSBI.EQ(this.numberValue(), expectedValue);
  }
}
