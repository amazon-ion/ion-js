import {IonType, IonTypes} from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
} from "./FromJsConstructor";
import { Value } from "./Value";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withClasses(Uint8Array)
  .build();

/**
 * This mixin constructs a new class that:
 * - Extends `DomValue`
 * - Extends `Uint8Array`
 * - Has the specified `IonType`.
 *
 * In practice, serves as a common base class for `Blob` and `Clob`.
 *
 * @param ionType   The IonType to associate with the new DomValue subclass.
 * @constructor
 * @private
 */
export function Lob(ionType: IonType) {
  return class
    extends Value(Uint8Array, ionType, _fromJsConstructor)
    implements Value {
    protected constructor(data: Uint8Array, annotations: string[] = []) {
      super(data);
      this._setAnnotations(annotations);
    }

    uInt8ArrayValue(): Uint8Array {
      return this;
    }

    ionEquals(expectedValue: Value): boolean {
      if(expectedValue.getType() !== IonTypes.CLOB) {
        if (expectedValue.getType() !== IonTypes.BLOB) {
          return false;
        }
      }

      let current = this.uInt8ArrayValue();
      let expected = expectedValue.uInt8ArrayValue();
      if(current.length !== expected!.length) {
        return false;
      }
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== expected![i]) {
          return false;
        }
      }
      return true;
    }
  };
}
