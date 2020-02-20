import JSBI from "jsbi";
import {IonTypes} from "../Ion";
import {DomValue} from "./DomValue";

/**
 * Represents an integer value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#int
 */
export class Integer extends DomValue(Number, IonTypes.INT) {
    private _bigIntValue: JSBI | null;
    private _numberValue: number;

    /**
     * Constructor.
     * @param value         The numeric value to represent as an integer.
     * @param annotations   An optional array of strings to associate with `value`.
     */
    constructor(value: JSBI | number, annotations: string[] = []) {
        // If the provided value is a JS number, we will defer constructing a BigInt representation
        // of it until it's requested later by a call to bigIntValue().
        if (typeof value === "number") {
            super(value);
            this._numberValue = value;
            this._bigIntValue = null;
        } else {
            let numberValue: number = JSBI.toNumber(value);
            super(numberValue);
            this._bigIntValue = value;
            this._numberValue = numberValue;
        }
        this._setAnnotations(annotations);
    }

    bigIntValue(): JSBI {
        if (this._bigIntValue === null) {
            this._bigIntValue = JSBI.BigInt(this.numberValue());
        }
        return this._bigIntValue;
    }

    numberValue(): number {
        return this._numberValue;
    }

    toString(): string {
        if (this._bigIntValue === null) {
            return this._numberValue.toString();
        }
        return this._bigIntValue.toString();
    }

    valueOf() {
        return this.numberValue();
    }
}