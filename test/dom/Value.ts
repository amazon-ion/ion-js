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
 * Tests constructing an Ion value from a JS value. Verifies that the newly constructed
 * value has the expected Ion type, the expected JS type, and the correct value.
 *
 * Callers may optionally provide a wrapped version of the jsValue that will be used converted to
 * an Ion dom.Value. This is useful for validating that Value.from() behaves the same with boxed primitives
 * (Boolean, String, Number) as it does with actual primitives (boolean, string, number).
 *
 * @param jsValue               A JS value to pass to Value.from() after optionally wrapping it by
 *                              calling `wrapperConstructor` if provided.
 * @param expectedIonType       The new dom.Value's expected Ion type.
 * @param wrappedValue          A boxed version of jsValue.
 * @param equalityTest          A function that tests whether the new DOM value is equal to the provided jsValue
 */
function domValueTest(jsValue,
                      expectedIonType,
                      equalityTest: (p1, p2) => boolean = jsEqualsIon,
                      wrappedValue?) {
    function validateDomValue(v: any, annotations) {
        // Verify that the new dom.Value is considered equal to the original (unwrapped) JS value.
        assert.isTrue(equalityTest(jsValue, v));
        assert.equal(expectedIonType, v.getType());
        let expectedDomType: any = JsValueConversion._domConstructorFor(expectedIonType);
        assert.isTrue(v instanceof expectedDomType);
        assert.deepEqual(annotations, v.getAnnotations());
    }

    return () => {
        // Test Value.from() with and without specifying annotations
        let annotations = ['foo', 'bar', 'baz'];
        let sourceValue = _hasValue(wrappedValue) ? wrappedValue : jsValue;
        it('' + sourceValue, () => {
            validateDomValue(Value.from(sourceValue), []);
        });
        it(annotations.join('::') + '::' + sourceValue, () => {
            validateDomValue(Value.from(sourceValue, annotations), annotations);
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
            domValueTest(true, IonTypes.BOOL, jsEqualsIon, new Boolean(true))
        );
        describe('number (integer)',
            domValueTest(7, IonTypes.INT)
        );
        describe('Number (integer)',
            domValueTest(7, IonTypes.INT, jsEqualsIon, new Number(7))
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
            domValueTest(7.5, IonTypes.FLOAT, jsEqualsIon, new Number(7.5))
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
                'Hello',
                IonTypes.STRING,
                jsEqualsIon,
                new String('Hello')
            )
        );
        describe('Blob',
            domValueTest(
                new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
                IonTypes.BLOB,
                (jsValue, domValue) =>
                    jsValue.every(
                        (byte, index) => byte === domValue[index]
                    )
            )
        );
        describe('List',
            domValueTest(
                [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
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
                {foo: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]},
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
