import * as ion from "../Ion";
import { IonTypes } from "../Ion";
import { Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
} from "./FromJsConstructor";
import { Value } from "./Value";

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
  _fromJsConstructor,
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
}
