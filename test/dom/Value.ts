import {assert} from "chai";
import {Value} from "../../src/dom";
import {Decimal, IonTypes, Timestamp} from "../../src/Ion";
import {Constructor} from "../../src/dom/Value";
import {_hasValue} from "../../src/util";
import JSBI from "jsbi";
import * as JsValueConversion from "../../src/dom/JsValueConversion";

/**
 * Tests constructing an Ion value from a JS value. Verifies that the newly constructed
 * value has the expected Ion type, the expected JS type, and the correct value.
 *
 * @param jsValue               A JS value to pass to Value.from() after optionally wrapping it by
 *                              calling `wrapperConstructor` if provided.
 * @param annotations           An array of strings to associate with the newly constructed value.
 * @param expectedIonType       The new dom.Value's expected Ion type.
 * @param wrapperConstructor    A wrapper constructor for (e.g.) boxing primitives.
 * @param equalityTest          A function that tests whether the new DOM value is equal to the provided jsValue
 */
function domValueTest(jsValue, annotations, expectedIonType, wrapperConstructor?, equalityTest?) {
    return () => {
        let sourceValue = jsValue;
        if (_hasValue(wrapperConstructor)) {
            sourceValue = wrapperConstructor(jsValue);
        }
        let v: any = Value.from(sourceValue, annotations);
        let expectedDomType: Constructor = JsValueConversion._domConstructorFor(expectedIonType);
        if (_hasValue(equalityTest)) {
            assert.isTrue(equalityTest(jsValue, v));
        } else {
            assert.equal(jsValue, v);
        }
        assert.equal(expectedIonType, v.getType());
        assert.isTrue(v instanceof expectedDomType);
        assert.deepEqual(annotations, v.getAnnotations());
    };
}

describe('Value', () => {
    describe('from()', () => {
        it('null',
            domValueTest(
                null,
                ['foo'],
                IonTypes.NULL,
                null,
                (_, domValue) => domValue.isNull()
            )
        );
        it('boolean',
            domValueTest(true, ['foo'], IonTypes.BOOL)
        );
        it('Boolean',
            domValueTest(true, ['foo'], IonTypes.BOOL, Boolean)
        );
        it('number (integer)',
            domValueTest(7, ['foo'], IonTypes.INT)
        );
        it('Number (integer)',
            domValueTest(7, ['foo'], IonTypes.INT, Number)
        );
        it('BigInt',
            domValueTest(
                JSBI.BigInt(7),
                ['foo'],
                IonTypes.INT,
                null,
                (jsValue, domValue) => JSBI.equal(jsValue, domValue.bigIntValue())
            )
        );
        it('number (floating point)',
            domValueTest(7.5, ['foo'], IonTypes.FLOAT)
        );
        it('Number (floating point)',
            domValueTest(7.5, ['foo'], IonTypes.FLOAT, Number)
        );
        it('Decimal',
            domValueTest(
                new Decimal("7.5"),
                ['foo'],
                IonTypes.DECIMAL,
                null,
                (jsValue, domValue) => domValue.decimalValue().equals(jsValue)
            )
        );
        it('Date',
            domValueTest(
                new Date("1970-01-01T00:00:00Z"),
                ['foo'],
                IonTypes.TIMESTAMP,
                null,
                (jsValue, domValue) => domValue.dateValue().getTime() === jsValue.getTime()
            )
        );
        it('Timestamp',
            domValueTest(
                Timestamp.parse("1970-01-01T00:00:00Z"),
                ['foo'],
                IonTypes.TIMESTAMP,
                null,
                (jsValue, domValue) => domValue.timestampValue().equals(jsValue)
            )
        );
        it('string',
            domValueTest(
                'Hello',
                ['foo'],
                IonTypes.STRING,
            )
        );
        it('String',
            domValueTest(
                'Hello',
                ['foo'],
                IonTypes.STRING,
                String
            )
        );

        const blobData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        it('Blob',
            domValueTest(
                blobData,
                ['foo'],
                IonTypes.BLOB,
                null,
                (jsValue, domValue) =>
                    domValue.uInt8ArrayValue().every(
                        (byte, index) => byte === blobData[index]
                    )
            )
        );

        const listData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        it('List',
            domValueTest(
                listData,
                ['foo'],
                IonTypes.LIST,
                null,
                (jsValue, domValue) =>
                    domValue.every(
                        (ionValue, index) => ionValue.numberValue() == jsValue[index]
                    )
                )
        );

        const structData = {foo: 7, bar: true, baz: 98.6, qux: 'Hello'};
        it('Struct',
            domValueTest(
                structData,
                ['foo'],
                IonTypes.STRUCT,
                null,
                (jsValue, domValue) =>
                    Object.entries(jsValue)
                          .every(([key, value]) => domValue.get(key).valueOf() === value)
            )
        );
    });
});
