import {Value, PathElement} from "./Value";
import {DomValue} from "./DomValue";
import {IonType} from "../Ion";

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
    return class extends DomValue(Array, ionType) implements Value, Array<Value> {
        protected constructor(children: Value[], annotations: string[] = []) {
            super();
            this.push(...children);
            this._setAnnotations(annotations);
        }

        get(...pathElements: PathElement[]): Value | null {
            if (pathElements.length === 0) {
                throw new Error('Value#get requires at least one parameter.');
            }
            let [pathHead, ...pathTail] = pathElements;
            if (typeof (pathHead) !== "number") {
                return null;
            }

            let children = this as Value[];
            let maybeChild: Value | undefined = children[pathHead];
            let child: Value | null = maybeChild === undefined ? null : maybeChild;
            if (pathTail.length === 0 || child === null) {
                return child;
            }
            return child.get(...pathTail);
        }

        elements(): Value[] {
            return Object.values(this);
        }

        toString(): string {
            return '[' + this.join(', ') + ']';
        }
    }
}