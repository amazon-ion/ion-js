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
    if (options.onlyCompareIon && expectedValue instanceof String) {
      expectedValue = expectedValue.stringValue();
    } else if (
      !options.onlyCompareIon &&
      (typeof expectedValue === "string" ||
        expectedValue instanceof global.String)
    ) {
      expectedValue = expectedValue.valueOf();
    } else {
      return false;
    }
    return this.compareValue(expectedValue) === 0;
  }

  compareValue(expectedValue: string): number {
    return this.stringValue().localeCompare(expectedValue);
  }
}
