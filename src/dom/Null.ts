import {DomValue} from "./DomValue";
import {IonType, IonTypes} from "../Ion";

/**
 * Represents a null[1] value in an Ion stream.
 *
 * An Ion null differs from a Javascript null in that an instance of an Ion null may have data associated with it.
 *
 * In particular, Ion nulls have an Ion data type:
 *
 *      text encoding | Ion data type
 *  ======================================
 *      null          | IonType.NULL (implicit)
 *      null.null     | IonType.NULL (explicit)
 *      null.string   | IonType.STRING
 *      null.int      | IonType.INT
 *      null.struct   | IonType.STRUCT
 *      ...
 *
 * They can also be annotated:
 *
 *      customerName::null.string
 *      dollars::null.decimal
 *      meters::null.float
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#null
 */
export class Null extends DomValue(Object, IonTypes.NULL) {
    /**
     * Constructor.
     * @param ionType       The ion data type associated with this null value.
     * @param annotations   An optional array of strings to associate with this null value.
     */
    constructor(ionType: IonType = IonTypes.NULL, annotations: string[] = []) {
        super();
        this._ionType = ionType;
        this._setAnnotations(annotations);
    }

    isNull(): boolean {
        return true;
    }

    toString(): string {
        if (this.getType() == IonTypes.NULL) {
            return 'null';
        }
        return 'null.' + this._ionType;
    }
}
