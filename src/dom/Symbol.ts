import {IonTypes} from "../Ion";
import {DomValue} from "./DomValue";

// TODO:
//   This extends 'String' because ion-js does not yet have a SymbolToken construct.
//   It is not possible to access the raw Symbol ID via the Reader API, so it cannot be accessed from this class.

/**
 * Represents a symbol[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#symbol
 */
export class Symbol extends DomValue(String, IonTypes.SYMBOL) {
    /**
     * Constructor.
     * @param symbolText    The text to represent as a symbol.
     * @param annotations   An optional array of strings to associate with this null value.
     */
    constructor(protected readonly symbolText: string, annotations: string[] = []) {
        super(symbolText);
        this._setAnnotations(annotations);
    }

    stringValue(): string {
        return this.valueOf() as string;
    }
}