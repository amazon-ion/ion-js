import {IonTypes} from "../Ion";
import {Value} from "./Value";
import {FromJsConstructor, FromJsConstructorBuilder, Primitives} from "./FromJsConstructor";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
    .withPrimitives(Primitives.Number)
    .withClassesToUnbox(Number)
    .build();

/**
 * Represents a float[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#float
 */
export class Float extends Value(Number, IonTypes.FLOAT, _fromJsConstructor) {

    /**
     * Constructor.
     * @param value         The numeric value to represent as a float.
     * @param annotations   An optional array of strings to associate with `value`.
     */
    constructor(value: number, annotations: string[] = []) {
        super(value);
        this._setAnnotations(annotations);
    }

    public numberValue(): number {
        return +this.valueOf();
    }
}