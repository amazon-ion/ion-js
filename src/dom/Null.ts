import {Decimal, IonType, IonTypes} from "../Ion";
import JSBI from "jsbi";
import {PathElement, Value} from "./Value";
import {FromJsConstructor} from "./FromJsConstructor";

/**
 * Represents a null[1] value in an Ion stream.
 *
 * An Ion null differs from a Javascript null in that an instance of an Ion null may have data associated with it.
 *
 * In particular, Ion nulls have an Ion data type:
 *
 *      text encoding | Ion data type
 *  ======================================
 *      null          | IonType.NULL
 *      null.null     | IonType.NULL
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
export class Null extends Value(Object, IonTypes.NULL, FromJsConstructor.NONE) {
    private static _supportedIonTypesByOperation = new Map<string, Set<IonType>>([
        ['booleanValue', new Set([IonTypes.BOOL])],
        ['numberValue', new Set([IonTypes.INT, IonTypes.FLOAT, IonTypes.DECIMAL])],
        ['bigIntValue', new Set([IonTypes.INT])],
        ['decimalValue', new Set([IonTypes.DECIMAL])],
        ['stringValue', new Set([IonTypes.STRING, IonTypes.SYMBOL])],
        ['dateValue', new Set([IonTypes.TIMESTAMP])],
        ['timestampValue', new Set([IonTypes.TIMESTAMP])],
        ['uInt8ArrayValue', new Set([IonTypes.BLOB, IonTypes.CLOB])],
        ['fields', new Set([IonTypes.STRUCT])],
        ['fieldNames', new Set([IonTypes.STRUCT])],
        ['elements', new Set([IonTypes.LIST, IonTypes.SEXP, IonTypes.STRUCT])]
    ]);

    private static _operationIsSupported(ionType: IonType, operation: string): boolean {
        return Null._supportedIonTypesByOperation.get(operation)!.has(ionType);
    }

    /**
     * Constructor.
     * @param ionType       The Ion data type associated with this null value.
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

    // If a [type]Value() operation was called on this Null value, we need to see whether the associated Ion type
    // supports that conversion. If it does, we'll return a JS null. If it doesn't, we'll throw an Error.
    private _convertToJsNull(operation: string): null | never {
        if (Null._operationIsSupported(this.getType(), operation)) {
            return null;
        }
        throw new Error(`${operation}() is not supported by Ion type ${this.getType().name}`);
    }

    // If this Null's Ion type supports the requested operation, throw an Error indicating this was a null dereference.
    // Otherwise, throw an Error indicating that the requested operation is not supported.
    private _unsupportedOperationOrNullDereference(operation: string): never {
        if (Null._operationIsSupported(this.getType(), operation)) {
            throw new Error(`${operation}() called on a null ${this.getType().name}.`);
        }
        throw new Error(`${operation}() is not supported by Ion type ${this.getType().name}`);
    }

    booleanValue(): boolean | null {
        return this._convertToJsNull('booleanValue');
    }

    numberValue(): number | null {
        return this._convertToJsNull('numberValue');
    }

    bigIntValue(): JSBI | null {
        return this._convertToJsNull('bigIntValue');
    }

    decimalValue(): Decimal | null {
        return this._convertToJsNull('decimalValue');
    }

    stringValue(): string | null {
        return this._convertToJsNull('stringValue');
    }

    dateValue(): Date | null {
        return this._convertToJsNull('dateValue');
    }

    uInt8ArrayValue(): Uint8Array | null {
        return this._convertToJsNull('uInt8ArrayValue');
    }

    fieldNames(): string[] {
        this._unsupportedOperationOrNullDereference('fieldNames');
    }

    fields(): [string, Value][] {
        this._unsupportedOperationOrNullDereference('fields');
    }

    elements(): Value[] {
        this._unsupportedOperationOrNullDereference('elements');
    }

    get(...pathElements: PathElement[]): Value | null {
        return null;
    }

    toString(): string {
        if (this.getType() == IonTypes.NULL) {
            return 'null';
        }
        return 'null.' + this._ionType.name;
    }

    /**
     * Converts this dom.Null to a Javascript null when being serialized with `JSON.stringify()`.
     */
    toJSON() {
        return null;
    }
}
