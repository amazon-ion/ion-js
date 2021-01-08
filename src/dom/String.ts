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

  ionEquals(expectedValue: String): boolean {
    if (!(expectedValue instanceof String)) {
      return false;
    }
    return this.compareValue(expectedValue) === 0;
  }

  compareValue(expectedValue: String): number {
    return this.stringValue().localeCompare(expectedValue.stringValue());
  }
}
