import {assert} from "chai";
import {Value} from "../../src/dom";
import {Decimal, dom, IonTypes, Timestamp} from "../../src/Ion";
import JSBI from "jsbi";
import * as JsValueConversion from "../../src/dom/JsValueConversion";
import {_hasValue} from "../../src/util";

// The same test logic performed by assert.equals() but without an assertion.
function jsEqualsIon(jsValue, ionValue): boolean {
    return jsValue == ionValue;
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
        describe('Date',
            domValueTest(
                new Date("1970-01-01T00:00:00Z"),
                IonTypes.TIMESTAMP,
                (jsValue, domValue) => domValue.dateValue().getTime() === jsValue.getTime()
            )
        );
        describe('Timestamp',
            domValueTest(
                Timestamp.parse("1970-01-01T00:00:00Z"),
                IonTypes.TIMESTAMP,
                (jsValue, domValue) => domValue.timestampValue().equals(jsValue)
            )
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
});
