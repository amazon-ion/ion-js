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

  ionEquals(
    expectedValue: Float,
    options: { epsilon?: number | null; strict?: boolean } = {
      epsilon: null,
      strict: true,
    }
  ): boolean {
    if (!(expectedValue instanceof Float)) {
      return false;
    }
    let result: boolean = Object.is(
      this.numberValue(),
      expectedValue.numberValue()
    );

    if (options.epsilon != null) {
      if (
        result ||
        Math.abs(this.numberValue() - expectedValue.numberValue()) <=
          options.epsilon
      ) {
        return true;
      }
    }
    return result;
  }
}
