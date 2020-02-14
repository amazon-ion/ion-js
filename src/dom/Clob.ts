import {IonTypes} from "../Ion";
import {DomValue} from "./DomValue";

/**
 * Represents a clob[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#clob
 */
export class Clob extends DomValue(Uint8Array, IonTypes.CLOB) {
    /**
     * Constructor.
     * @param bytes         Raw, unsigned bytes to represent as a clob.
     * @param annotations   An optional array of strings to associate with `bytes`.
     */
    constructor(bytes: Uint8Array, annotations: string[] = []) {
        super(bytes);
        this._setAnnotations(annotations);
    }

    uInt8ArrayValue(): Uint8Array {
        return this;
    }
}