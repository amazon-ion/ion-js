import {IonTypes} from "../Ion";
import {Lob} from "./Lob";

/**
 * Represents a clob[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#clob
 */
export class Clob extends Lob(IonTypes.CLOB) {
    /**
     * Constructor.
     * @param bytes         Raw, unsigned bytes to represent as a clob.
     * @param annotations   An optional array of strings to associate with `bytes`.
     */
    constructor(bytes: Uint8Array, annotations: string[] = []) {
        super(bytes, annotations);
    }
}