import {DomValue} from "./DomValue";
import {IonTypes} from "../Ion";

/**
 * Represents a blob[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#blob
 */
export class Blob extends DomValue(Uint8Array, IonTypes.BLOB) {

    /**
     * Constructor.
     * @param data          Raw, unsigned bytes to represent as a blob.
     * @param annotations   An optional array of strings to associate with `bytes`.
     */
    constructor(data: Uint8Array, annotations: string[] = []) {
        super(data);
        this._setAnnotations(annotations);
    }

    uInt8ArrayValue(): Uint8Array {
        return this;
    }
}