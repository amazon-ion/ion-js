import { IonTypes } from "../Ion";
import { Sequence } from "./Sequence";
import { Value } from "./Value";

/**
 * Represents a list value in an Ion stream.
 *
 * [1] https://amazon-ion.github.io/ion-docs/docs/spec.html#list
 */
export class List extends Sequence(IonTypes.LIST) {
  /**
   * Constructor.
   * @param children      Values that will be contained in the new list.
   * @param annotations   An optional array of strings to associate with the items in `children`.
   */
  constructor(children: Value[], annotations: string[] = []) {
    super(children, annotations);
  }
}
