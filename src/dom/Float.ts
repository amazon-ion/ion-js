import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { Value } from "./Value";
import { Decimal } from "./Decimal";
import * as ion from "../Ion";

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

  _valueEquals(
    other: any,
    options: {
      epsilon?: number | null;
      ignoreAnnotations?: boolean;
      ignoreTimestampPrecision?: boolean;
      onlyCompareIon?: boolean;
      coerceNumericType: boolean;
    } = {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true,
      coerceNumericType: false,
    }
  ): boolean {
    let isSupportedType: boolean = false;
    let valueToCompare: any = null;
    // if the provided value is an ion.dom.Float instance.
    if (other instanceof Float) {
      isSupportedType = true;
      valueToCompare = other.numberValue();
    } else if (options.coerceNumericType === true && other instanceof Decimal) {
      // if other is Decimal convert both values to Decimal for comparison.
      let thisValue = new ion.Decimal(other.toString());
      return thisValue!.equals(other.decimalValue());
    } else if (!options.onlyCompareIon) {
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
