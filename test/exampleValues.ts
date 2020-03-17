import {Timestamp} from "../src/IonTimestamp";
import {Decimal} from "../src/IonDecimal";
import {load, Value} from "../src/dom";

// Used as a default filtering predicate in functions below
function acceptAnyValue(_: any) : boolean {
    return true;
}

// A common collection of JS values that can be reduced to a relevant subset using the provided filter function.
export function exampleJsValuesWhere(filter: (v: any) => boolean = acceptAnyValue): any[] {
    return [
        null,
        true, false,
        Number.MIN_SAFE_INTEGER, -7.5, -7, 0, 7, 7.5, Number.MAX_SAFE_INTEGER,
        "", "foo",
        new Date(0),
        Timestamp.parse('1970-01-01T00:00:00Z'),
        new Decimal('1.5'),
        [], [1, 2, 3], [{foo: "bar"}],
        {}, {foo: "bar", baz: 5}, {foo: [1, 2, 3]}
    ].filter(filter);
}

// A common collection of Ion dom.Value instances that can be reduced to a relevant subset using
// the provided filter function.
export function exampleIonValuesWhere(filter: (v: Value) => boolean = acceptAnyValue): Value[] {
    return [
        load('null')!, // null
        load('null.string')!, // typed null
        load('true')!, // boolean
        load('1')!, // integer
        load('15e-1')!, // float
        load('15d-1')!, // decimal
        load('1970-01-01T00:00:00.000Z')!, // timestamp
        load('"Hello"')!, // string
        load('Hello')!, // symbol
        load('{{aGVsbG8gd29ybGQ=}}')!, // blob
        load('{{"February"}}')!, // clob
        load('[1, 2, 3]')!, // list
        load('(1 2 3)')!, // s-expression
        load('{foo: true, bar: "Hello", baz: 5, qux: null}')! // struct
    ].filter(filter);
}