import {assert} from "chai";
import {Value, load, loadAll} from "../../src/dom";
import {Decimal, dom, IonType, IonTypes, Timestamp} from "../../src/Ion";
import * as ion from "../../src/Ion";
import JSBI from "jsbi";
import * as JsValueConversion from "../../src/dom/JsValueConversion";
import {_hasValue} from "../../src/util";
import {Constructor} from "../../src/dom/Value";
import {exampleDatesWhere, exampleIonValuesWhere, exampleJsValuesWhere, exampleTimestampsWhere} from "../exampleValues";
import {valueName} from "../mochaSupport";

// The same test logic performed by assert.equals() but without an assertion.
function jsEqualsIon(jsValue, ionValue): boolean {
    return jsValue == ionValue;
}

// Tests whether each value is or is not an instance of dom.Value
function instanceOfValueTest(expected: boolean, ...values: any[]) {
    for (let value of values) {
        it(`${valueName(value)} instanceof Value`, () => {
            assert.equal(value instanceof Value, expected);
        });
    }
}

function instanceOfValueSubclassTest(constructor: Constructor, expected: boolean, ...values: any[]) {
    for (let value of values) {
        it(`${valueName(value)} instanceof ${constructor.name}`, () => {
            assert.equal(value instanceof constructor, expected);
        });
    }
}

// Describes the static side of dom.Value subclasses
interface DomValueConstructor extends Constructor {
    _getIonType(): IonType;
}

// The constructors of all dom.Value subclasses
const DOM_VALUE_SUBCLASSES: DomValueConstructor[] = [
    dom.Null,
    dom.Boolean,
    dom.Integer,
    dom.Float,
    dom.Decimal,
    dom.Timestamp,
    dom.Clob,
    dom.Blob,
    dom.String,
    dom.Symbol,
    dom.List,
    dom.SExpression,
    dom.Struct
];

// Converts each argument in `valuesToRoundTrip` to a dom.Value, writes it to an Ion stream, and then load()s the Ion
// stream back into a dom.Value. Finally, compares the original dom.Value with the dom.Value load()ed from the stream
// to ensure that no data was lost.
function domRoundTripTest(typeName: string,
                          equalityTest: (p1, p2) => boolean,
                          ...valuesToRoundTrip: any[]) {
    describe(typeName, () => {
        for (let value of valuesToRoundTrip) {
            it(value + '', () => {
                let writer = ion.makeBinaryWriter();
                // Make a dom.Value out of the provided value if it isn't one already
                let domValue;
                if (value instanceof Value) {
                    domValue = value as Value;
                } else {
                    domValue = Value.from(value);
                }
                // Serialize the dom.Value using the newly instantiated writer
                domValue.writeTo(writer);
                writer.close();
                // Load the serialized version of the value
                let roundTripped = load(writer.getBytes())!;
                // Verify that nothing was lost in the round trip
                assert.isNotNull(roundTripped);
                assert.equal(domValue.isNull(), roundTripped.isNull());
                assert.equal(domValue.getType(), roundTripped.getType());
                assert.deepEqual(domValue.getAnnotations(), roundTripped.getAnnotations());
                assert.isTrue(equalityTest(domValue, roundTripped));
            });
        }
    });
}

/**
 * Tests constructing an Ion dom.Value from a JS value. Verifies that the newly constructed
 * dom.Value has the expected Ion type, the expected JS type, and a value equal to that of jsValue (or
 * `expectValue` instead, if specified).
 *
 * @param jsValue               A JS value to pass to Value.from().
 * @param expectedIonType       The new dom.Value's expected Ion type.
 * @param equalityTest          A function that tests whether the new dom.Value is equal to the provided jsValue.
 * @param expectValue           If specified, `equalityTest` will compare the new dom.Value to `expectValue` instead of
 *                              comparing it to `jsValue`. This is helpful if jsValue is a boxed primitive
 *                              but you want to test for equality with the primitive representation.
 */
function domValueTest(jsValue,
                      expectedIonType,
                      equalityTest: (p1, p2) => boolean = jsEqualsIon,
                      expectValue?) {
    function validateDomValue(domValue: Value, annotations) {
        let equalityTestValue = _hasValue(expectValue) ? expectValue : jsValue;
        // Verify that the new dom.Value is considered equal to the original (unwrapped) JS value.
        assert.isTrue(equalityTest(equalityTestValue, domValue));
        assert.equal(expectedIonType, domValue.getType());
        let expectedDomType: any = JsValueConversion._domConstructorFor(expectedIonType);
        assert.isTrue(domValue instanceof expectedDomType);
        assert.deepEqual(annotations, domValue.getAnnotations());
    }

    return () => {
        // Test Value.from() with and without specifying annotations
        let annotations = ['foo', 'bar', 'baz'];
        it('' + jsValue, () => {
            validateDomValue(Value.from(jsValue), []);
        });
        it(annotations.join('::') + '::' + jsValue, () => {
            validateDomValue(Value.from(jsValue, annotations), annotations);
        });
    };
}

describe('Value', () => {
    describe('from()', () => {
        describe('null',
            domValueTest(
                null,
                IonTypes.NULL,
                (_, domValue) => domValue.isNull()
            )
        );
        describe('boolean',
            domValueTest(true, IonTypes.BOOL)
        );
        describe('Boolean',
            domValueTest(new Boolean(true), IonTypes.BOOL, jsEqualsIon, true)
        );
        describe('number (integer)',
            domValueTest(7, IonTypes.INT)
        );
        describe('Number (integer)',
            domValueTest(new Number(7), IonTypes.INT, jsEqualsIon, 7)
        );
        describe('BigInt',
            domValueTest(
                JSBI.BigInt(7),
                IonTypes.INT,
                (jsValue, domValue) => JSBI.equal(jsValue, domValue.bigIntValue()!)
            )
        );
        describe('number (floating point)',
            domValueTest(7.5, IonTypes.FLOAT)
        );
        describe('Number (floating point)',
            domValueTest(new Number(7.5), IonTypes.FLOAT, jsEqualsIon, 7.5)
        );
        describe('Decimal',
            domValueTest(
                new Decimal("7.5"),
                IonTypes.DECIMAL,
                (jsValue, domValue) => domValue.decimalValue().equals(jsValue)
            )
        );
        describe('Date', () => {
                for (let date of [...exampleDatesWhere(), new Date()]) {
                    domValueTest(
                        date,
                        IonTypes.TIMESTAMP,
                        (jsValue, domValue) => {
                            return domValue.dateValue().getTime() == jsValue.getTime()
                                && domValue.timestampValue().getDate().getTime() === jsValue.getTime();
                        }
                    )();
                }
            }
        );
        describe('Timestamp', () => {
                for (let timestamp of exampleTimestampsWhere()) {
                    domValueTest(
                        timestamp,
                        IonTypes.TIMESTAMP,
                        (jsValue, domValue) => domValue.timestampValue().equals(jsValue)
                    )();
                }
            }
        );
        describe('string',
            domValueTest(
                'Hello',
                IonTypes.STRING,
            )
        );
        describe('String',
            domValueTest(
                new String('Hello'),
                IonTypes.STRING,
                jsEqualsIon,
                'Hello'
            )
        );
        describe('Blob',
            domValueTest(
                new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
                IonTypes.BLOB,
                (jsValue, domValue) =>
                    jsValue.every(
                        (byte, index) => byte === domValue[index]
                    )
            )
        );
        describe('List',
            domValueTest(
                [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                IonTypes.LIST,
                (jsValue, domValue) =>
                    jsValue.every(
                        (listItem, index) => listItem === domValue[index].numberValue()
                    )
                )
        );
        describe('Struct',
            domValueTest(
                {foo: 7, bar: true, baz: 98.6, qux: 'Hello'},
                IonTypes.STRUCT,
                (jsValue, domValue) =>
                    Object.entries(jsValue)
                          .every(([key, value]) => domValue.get(key).valueOf() === value)
            )
        );
        describe('List inside Struct',
            domValueTest(
                {foo: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]},
                IonTypes.STRUCT,
                (jsValue, domValue) => {
                    assert.isTrue(domValue instanceof dom.Struct);
                    assert.isTrue(domValue['foo'] instanceof dom.List);
                    let domList: dom.List = domValue['foo'];
                    return jsValue.foo.every(
                        (arrayNumber, index) => arrayNumber === domList[index].numberValue()
                    )
                }
            )
        );
        describe('Struct inside List',
            domValueTest(
                [{foo: 7, bar: true, baz: 98.6, qux: 'Hello'}],
                IonTypes.LIST,
                (jsValue, domValue) => {
                    assert.isTrue(domValue instanceof dom.List);
                    assert.isTrue(domValue[0] instanceof dom.Struct);
                    let domStruct: dom.Struct = domValue[0];
                    return Object.entries(jsValue[0])
                                 .every(([key, value]) => domStruct.get(key)!.valueOf() === value)
                }
            )
        );
    });
    describe('instanceof', () => {
        describe('All dom.Value subclasses are instances of dom.Value', () => {
            instanceOfValueTest(
                true,
                ...exampleIonValuesWhere()
            );
        });
        describe('No plain Javascript value is an instance of dom.Value', () => {
            instanceOfValueTest(
                false,
                ...exampleJsValuesWhere()
            );
        });
        for (let subclass of DOM_VALUE_SUBCLASSES) {
            describe(`${subclass.name}`, () => {
                // Javascript values are not instances of any dom.Value subclass
                describe(`Plain Javascript value instanceof dom.${subclass.name}`, () => {
                    instanceOfValueSubclassTest(
                        subclass,
                        false,
                        ...exampleJsValuesWhere()
                    );
                });
                // Non-null dom.Values whose Ion type matches that of the constructor must be instances of that
                // dom.Value subclass.
                describe(`Non-null ${subclass._getIonType().name} instanceof dom.${subclass.name}`, () => {
                    instanceOfValueSubclassTest(
                        subclass,
                        true,
                        ...exampleIonValuesWhere(
                            (value) =>
                                (value.isNull() && subclass === dom.Null)
                                || (!value.isNull() && value.getType() === subclass._getIonType())
                        )
                    );
                });
                // Null dom.Values and those whose Ion type does NOT match that of the constructor must not be instances
                // of that dom.Value subclass.
                describe(`Null or non-${subclass._getIonType().name} instanceof dom.${subclass.name}`, () => {
                    instanceOfValueSubclassTest(
                        subclass,
                        false,
                        ...exampleIonValuesWhere(
                            (value) =>
                                (value.isNull() && subclass !== dom.Null)
                                || (!value.isNull() && value.getType() !== subclass._getIonType())
                        )
                    );
                });
            });
        }
    });
    describe('writeTo()', () => {
        domRoundTripTest(
            'Null',
            (n1, n2) => true, // isNull() and getType() are already checked in `domRoundTripTest`
            // Test `null` of every Ion type
            ...Object.values(IonTypes)
                     .map(ionType => load('null.' + ionType.name)!)
        );
        domRoundTripTest(
          'Boolean',
            (b1, b2) => b1.booleanValue() === b2.booleanValue(),
            true,
            false
        );
        domRoundTripTest(
            'Integer',
            (i1, i2) => i1.numberValue() === i2.numberValue(),
            Number.MIN_SAFE_INTEGER,
            -8675309,
            -24601,
            0,
            24601,
            8675309,
            Number.MAX_SAFE_INTEGER
        );
        domRoundTripTest(
            'Float',
            (f1, f2) => Object.is(f1.numberValue(), f2.numberValue()), // Supports NaN equality
            Number.NEGATIVE_INFINITY,
            -867.5309,
            -2.4601,
            0.0,
            2.4601,
            867.5309,
            Number.POSITIVE_INFINITY,
            Number.NaN
        );
        domRoundTripTest(
            'Decimal',
            (d1, d2) => d1.decimalValue().equals(d2.decimalValue()),
            new Decimal("0"),
            new Decimal("1.5"),
            new Decimal("-1.5"),
            new Decimal(".00001"),
            new Decimal("-.00001"),
        );
        domRoundTripTest(
            'Timestamp',
            (t1, t2) => t1.timestampValue().equals(t2.timestampValue()),
            ...exampleDatesWhere(),
            ...exampleTimestampsWhere()
        );
        domRoundTripTest(
            'String',
            (s1, s2) => s1.stringValue() === s2.stringValue(),
            "",
            "foo",
            "bar",
            "baz",
            load('foo::bar::baz::"Hello"')
        );
        domRoundTripTest(
            'Symbol',
            (s1, s2) => s1.stringValue() === s2.stringValue(),
            load('foo'),
            load("'bar'"),
            load('foo::bar::baz'),
        );
        domRoundTripTest(
            'Blob',
            (b1, b2) => b1.every((value, index) => value === b2[index]),
            load('{{aGVsbG8gd29ybGQ=}}'),
            load('foo::bar::{{aGVsbG8gd29ybGQ=}}'),
        );
        domRoundTripTest(
            'Clob',
            (c1, c2) => c1.every((value, index) => value === c2[index]),
            load('{{"February"}}'),
            load('month::{{"February"}}'),
        );
        domRoundTripTest(
            'List',
            (l1, l2) => l1.reduce(
                (equalSoFar, value, index) =>
                    // The dom.Value classes don't have an easy test for deep equality,
                    // so here we only check for general structure.
                    equalSoFar
                        && value.isNull() === l2[index].isNull()
                        && value.getType() === l2[index].getType(),
                true
            ),
            [],
            [1, 2, 3],
            ['foo', 'bar', 'baz'],
            [new Date(0), true, "hello", null]
        );
        domRoundTripTest(
            'S-Expression',
            (s1, s2) => s1.reduce(
                (equalSoFar, value, index) =>
                    // The dom.Value classes don't have an easy test for deep equality,
                    // so here we only check for general structure.
                    equalSoFar
                        && value.isNull() === s2[index].isNull()
                        && value.getType() === s2[index].getType(),
                true
            ),
            load('()'),
            load('(1 2 3)'),
            load('("foo" "bar" "baz")'),
            load('(1970-01-01T00:00:00.000Z true "hello" null null.struct)')
        );
        domRoundTripTest(
            'Struct',
            (s1: Value, s2: Value) => s1.fields().reduce(
                (equalSoFar, [key, value]) =>
                    // The dom.Value classes don't have an easy test for deep equality,
                    // so here we only check for general structure.
                    equalSoFar
                        && value.isNull() === s2[key].isNull()
                        && value.getType() === s2[key].getType(),
                true
            ),
            {},
            {foo: 5, bar: "baz", qux: true},
            {foo: ['dog', 'cat', 'mouse']}
        );
    });
});