import {IonTypes, toBase64, Writer} from "../Ion";
import {Lob} from "./Lob";

/**
 * Represents a blob[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#blob
 */
export class Blob extends Lob(IonTypes.BLOB) {

    /**
     * Constructor.
     * @param data          Raw, unsigned bytes to represent as a blob.
     * @param annotations   An optional array of strings to associate with `data`.
     */
    constructor(data: Uint8Array, annotations: string[] = []) {
        super(data, annotations);
    }

    /**
     * Converts this Blob to a base64-encoded string when being serialized with `JSON.stringify()`.
     */
    toJSON() {
        return toBase64(this);
    }

    writeTo(writer: Writer): void {
        writer.setAnnotations(this.getAnnotations());
        writer.writeBlob(this);
    }
}