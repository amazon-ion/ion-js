import { IonType, IonTypes } from "../Ion";
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
      if (options.onlyCompareIon) {
        // `compareOnlyIon` requires that the provided value be an ion.dom.Lob instance.
        if (
          other.getType() === IonTypes.CLOB ||
          other.getType() === IonTypes.BLOB
        ) {
          isSupportedType = true;
          valueToCompare = other.uInt8ArrayValue();
        }
      } else {
        // We will consider other Lob-ish types
        if (other instanceof global.Uint8Array) {
          isSupportedType = true;
          valueToCompare = other.valueOf();
        }
      }

      if (!isSupportedType) {
        return false;
      }

      let current = this.uInt8ArrayValue();
      let expected = valueToCompare;
      if (current.length !== expected.length) {
        return false;
      }
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== expected[i]) {
          return false;
        }
      }
      return true;
    }
  };
}
