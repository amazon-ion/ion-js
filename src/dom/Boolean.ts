import { IonTypes, Writer } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
  Primitives,
} from "./FromJsConstructor";
import { _NativeJsBoolean } from "./JsValueConversion";
import { Value } from "./Value";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withPrimitives(Primitives.Boolean)
  .withClassesToUnbox(_NativeJsBoolean)
  .build();

/**
 * Represents a boolean[1] value in an Ion stream.
 *
 * Because this class extends Javascript's (big-B) Boolean data type, it is subject to the same
 * surprising behavior when used for control flow.
 *
 * From the Mozilla Developer Network documentation[2]:
 *
 * > Any object of which the value is not undefined or null, including a Boolean object
 *   whose value is false, evaluates to true when passed to a conditional statement.
 *
 * ```javascript
 *      var b = false;
 *      if (b) {
 *          // this code will NOT be executed
 *      }
 *
 *      b = new Boolean(false);
 *      if (b) {
 *          // this code WILL be executed
 *      }
 * ```
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#bool
 * [2] https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean#Description
 */
export class Boolean extends Value(
  _NativeJsBoolean,
  IonTypes.BOOL,
  _fromJsConstructor
) {
  /**
   * Constructor.
   * @param value         The boolean value of the new instance.
   * @param annotations   An optional array of strings to associate with `value`.
   */
  constructor(value: boolean, annotations: string[] = []) {
    super(value);
    this._setAnnotations(annotations);
  }

  booleanValue(): boolean {
    return this.valueOf() as boolean;
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeBoolean(this.booleanValue());
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
    // if the provided value is an ion.dom.Boolean instance.
    if (other instanceof Boolean) {
      isSupportedType = true;
      valueToCompare = other.booleanValue();
    } else if (!options.onlyCompareIon) {
      // We will consider other Boolean-ish types
      if (typeof other === "boolean" || other instanceof _NativeJsBoolean) {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }

    if (!isSupportedType) {
      return false;
    }

    if (this.booleanValue() !== valueToCompare) {
      return false;
    }
    return true;
  }
}
