import { IonType, IonTypes, Writer } from "../Ion";
import { FromJsConstructor } from "./FromJsConstructor";
import { PathElement, Value } from "./Value";

/**
 * This mixin constructs a new class that:
 * - Extends `DomValue`
 * - Extends `Array`
 * - Has the specified `IonType`.
 *
 * In practice, serves as a common base class for `List` and `SExpression`.
 *
 * @param ionType   The IonType to associate with the new DomValue subclass.
 * @constructor
 * @private
 */
export function Sequence(ionType: IonType) {
  return class
    extends Value(Array, ionType, FromJsConstructor.NONE)
    implements Value, Array<Value> {
    protected constructor(children: Value[], annotations: string[] = []) {
      super();
      for (const child of children) {
        this.push(child);
      }
      this._setAnnotations(annotations);
    }

    get(...pathElements: PathElement[]): Value | null {
      if (pathElements.length === 0) {
        throw new Error("Value#get requires at least one parameter.");
      }
      const [pathHead, ...pathTail] = pathElements;
      if (typeof pathHead !== "number") {
        throw new Error(
          `Cannot index into a ${
            this.getType().name
          } with a ${typeof pathHead}.`
        );
      }

      const children = this as Value[];
      const maybeChild: Value | undefined = children[pathHead];
      const child: Value | null = maybeChild === undefined ? null : maybeChild;
      if (pathTail.length === 0 || child === null) {
        return child;
      }
      return child.get(...pathTail);
    }

    elements(): Value[] {
      return Object.values(this);
    }

    toString(): string {
      return "[" + this.join(", ") + "]";
    }

    static _fromJsValue(jsValue: any, annotations: string[]): Value {
      if (!(jsValue instanceof Array)) {
        throw new Error(
          `Cannot create a ${this.name} from: ${jsValue.toString()}`
        );
      }
      const children = jsValue.map((child) => Value.from(child));
      return new this(children, annotations);
    }

    writeTo(writer: Writer) {
      writer.setAnnotations(this.getAnnotations());
      writer.stepIn(ionType);
      for (const child of this) {
        child.writeTo(writer);
      }
      writer.stepOut();
    }
  };
}
