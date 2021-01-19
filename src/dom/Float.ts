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
    other: any,
    options: {
      epsilon?: number | null;
      ignoreAnnotations?: boolean;
      ignoreTimestampPrecision?: boolean;
      compareOnlyIon?: boolean;
    } = {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      compareOnlyIon: true,
    }
  ): boolean {
    let isSupportedType: boolean = false;
    let valueToCompare: any = null;
    if (options.compareOnlyIon) {
      // `compareOnlyIon` requires that the provided value be an ion.dom.Float instance.
      if (other instanceof Float) {
        isSupportedType = true;
        valueToCompare = other.numberValue();
      }
    } else {
      // We will consider other Float-ish types
      if (other instanceof global.Number || typeof other === "number") {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }

    if (!isSupportedType) {
      return false;
    }

    let result: boolean = Object.is(this.numberValue(), valueToCompare);

    if (options.epsilon != null) {
      if (
        result ||
        Math.abs(this.numberValue() - valueToCompare) <= options.epsilon
      ) {
        return true;
      }
    }
    return result;
  }
}
