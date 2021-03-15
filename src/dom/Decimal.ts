import * as ion from "../Ion";
import { IonTypes } from "../Ion";
import { Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
} from "./FromJsConstructor";
import { Value } from "./Value";
import { Float } from "./Float";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withClasses(ion.Decimal)
  .build();

/**
 * Represents a decimal[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#decimal
 */
export class Decimal extends Value(
  Number,
  IonTypes.DECIMAL,
  _fromJsConstructor
) {
  private readonly _decimalValue: ion.Decimal;
  private readonly _numberValue: number;

  /**
   * Constructor.
   * @param value         The numeric value to represent as a decimal.
   * @param annotations   An optional array of strings to associate with `value`.
   */
  constructor(value: ion.Decimal, annotations: string[] = []) {
    super(...[value.getCoefficient(), value.getExponent(), value.isNegative()]);
    this._decimalValue = value;
    this._numberValue = value.numberValue();
    this._setAnnotations(annotations);
  }

  numberValue(): number {
    return this._numberValue;
  }

  decimalValue(): ion.Decimal {
    return this._decimalValue;
  }

  toString(): string {
    return this._decimalValue.toString();
  }

  valueOf(): number {
    return this._numberValue;
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeDecimal(this.decimalValue());
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
    // if the provided value is an ion.dom.Decimal instance.
    if (other instanceof Decimal) {
      isSupportedType = true;
      valueToCompare = other.decimalValue();
    } else if (options.coerceNumericType === true && other instanceof Float) {
      isSupportedType = true;
      valueToCompare = new ion.Decimal(other.toString());
    } else if (!options.onlyCompareIon) {
      // We will consider other Decimal-ish types
      if (other instanceof ion.Decimal) {
        // expectedValue is a non-DOM Decimal
        isSupportedType = true;
        valueToCompare = other;
      } else if (other instanceof Number || typeof other === "number") {
        isSupportedType = true;
        // calling numberValue() on ion.Decimal is lossy and could result in imprecise comparisons
        // hence converting number to ion.Decimal for comparison even though it maybe expensive
        valueToCompare = new ion.Decimal(other.toString());
      }
    }

    if (!isSupportedType) {
      return false;
    }

    return this.decimalValue().equals(valueToCompare);
  }
}
