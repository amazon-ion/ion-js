import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { Value } from "./Value";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withPrimitives(Primitives.String)
  .withClassesToUnbox(global.String)
  .build();

/**
 * Represents a string[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#string
 */
export class String extends Value(
  global.String,
  IonTypes.STRING,
  _fromJsConstructor
) {
  /**
   * Constructor.
   * @param text          The text value to represent as a string.
   * @param annotations   An optional array of strings to associate with the provided text.
   */
  constructor(text: string, annotations: string[] = []) {
    super(text);
    this._setAnnotations(annotations);
  }

  stringValue(): string {
    return this.toString();
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeString(this.stringValue());
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

    // if the provided value is an ion.dom.String instance.
    if (other instanceof String) {
      isSupportedType = true;
      valueToCompare = other.stringValue();
    } else if (!options.onlyCompareIon) {
      // We will consider other String-ish types
      if (typeof other === "string" || other instanceof global.String) {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }

    if (!isSupportedType) {
      return false;
    }

    return this.compareValue(valueToCompare) === 0;
  }

  compareValue(expectedValue: string): number {
    return this.stringValue().localeCompare(expectedValue);
  }
}
