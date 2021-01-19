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

// TODO:
//   This extends 'String' because ion-js does not yet have a SymbolToken construct.
//   It is not possible to access the raw Symbol ID via the Reader API, so it cannot be accessed from this class.

/**
 * Represents a symbol[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#symbol
 */
export class Symbol extends Value(String, IonTypes.SYMBOL, _fromJsConstructor) {
  /**
   * Constructor.
   * @param symbolText    The text to represent as a symbol.
   * @param annotations   An optional array of strings to associate with this symbol.
   */
  constructor(symbolText: string, annotations: string[] = []) {
    super(symbolText);
    this._setAnnotations(annotations);
  }

  stringValue(): string {
    return this.toString();
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeSymbol(this.stringValue());
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
      // `compareOnlyIon` requires that the provided value be an ion.dom.Symbol instance.
      if (other instanceof Symbol) {
        isSupportedType = true;
        valueToCompare = other.stringValue();
      }
    } else {
      // We will consider other Symbol-ish types
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
