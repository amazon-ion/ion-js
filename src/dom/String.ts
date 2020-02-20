import {IonTypes} from "../Ion";
import {DomValue} from "./DomValue";

/**
 * Represents a string[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#string
 */
export class String extends DomValue(global.String, IonTypes.STRING) {
    /**
     * Constructor.
     * @param text          The text value to represent as a string.
     * @param annotations   An optional array of strings to associate with the provided text.
     */
    constructor(text: string, annotations: string[] = []) {
        super(text);
        this._setAnnotations(annotations);
    }

    stringValue(): string {
        return this.toString();
    }
}