import { IonTypes } from "../Ion";
import { Sequence } from "./Sequence";
import { Value } from "./Value";

/**
 * Represents an s-expression[1] value in an Ion stream.
 *
 * [1] https://amazon-ion.github.io/ion-docs/docs/spec.html#sexp
 */
export class SExpression extends Sequence(IonTypes.SEXP) {
  /**
   * Constructor.
   * @param children      Values that will be contained in the new s-expression.
   * @param annotations   An optional array of strings to associate with the items in `children`.
   */
  constructor(children: Value[], annotations: string[] = []) {
    super(children, annotations);
  }

  toString(): string {
    return "(" + this.join(" ") + ")";
  }
}
