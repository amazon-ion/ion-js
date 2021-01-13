import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { Value } from "./Value";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withPrimitives(Primitives.Number)
  .withClassesToUnbox(Number)
  .build();

/**
 * Represents a float[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#float
 */
export class Float extends Value(Number, IonTypes.FLOAT, _fromJsConstructor) {
  /**
   * Constructor.
   * @param value         The numeric value to represent as a float.
   * @param annotations   An optional array of strings to associate with `value`.
   */
  constructor(value: number, annotations: string[] = []) {
    super(value);
    this._setAnnotations(annotations);
  }

  public numberValue(): number {
    return +this.valueOf();
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeFloat64(this.numberValue());
  }

  _ionEquals(
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
    if (options.onlyCompareIon && expectedValue instanceof Float) {
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
    let result: boolean = Object.is(this.numberValue(), expectedValue);

    if (options.epsilon != null) {
      if (
        result ||
        Math.abs(this.numberValue() - expectedValue) <= options.epsilon
      ) {
        return true;
      }
    }
    return result;
  }
}
