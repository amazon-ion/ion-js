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

const _exampleIsoStrings: string[] = [
    "1970-01-01T00:00:00Z",
    '2020-02-28T23:00:00.000-01:00',
    "2020-02-29T00:00:00Z",
    "2020-02-29T00:00:00+01:00",
    "2020-02-29T00:00:00-01:00",
    '2020-03-01T00:00:00.000+01:00',
    "2020-03-19T03:17:59.999Z",
    "2020-03-19T03:17:59+03:21",
    "2020-03-19T23:59:59-05:00",
    "2020-03-19T23:01:01-08:00",
    "2020-03-19T11:30:30-08:00",
    "2020-03-19T11:30:30.5-08:00",
    "2020-03-19T11:30:30.50-08:00",
    "2020-03-19T11:30:30.500-08:00",
    "2020-03-22T11:30:30.22-08:00",
    "2020-03-27T00:00:00Z",
    "2020-03-27T00:00:00.000Z",
    "2020-03-27T12:00:00-05:00",
    "2020-03-27T12:00:00-08:00",
    "2020-03-27T12:00:00+01:00",
    "2020-03-27T19:00:00-05:00",
    "2020-03-27T16:00:00-08:00",
    "2020-03-27T16:00:00.5-08:00",
    "2020-03-28T01:00:00+01:00",
    "2020-03-28T01:00:00.123456+01:00",
    "2020-03-28T01:00:00.123456789+01:00",
];

// A common collection of Date values that can be reduced to a relevant subset using
// the provided filter function.
export function exampleDatesWhere(filter: (v: Date) => boolean = acceptAnyValue): Date[] {
    return _exampleIsoStrings
        .map((isoString) => new Date(isoString))
        .filter(filter);
}

// A common collection of Timestamp values that can be reduced to a relevant subset using
// the provided filter function.
export function exampleTimestampsWhere(filter: (v: Timestamp) => boolean = acceptAnyValue): Timestamp[] {
    return _exampleIsoStrings
        .map((isoString) => Timestamp.parse(isoString)!)
        .filter(filter);
}