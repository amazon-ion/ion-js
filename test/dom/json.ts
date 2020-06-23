import {assert} from "chai";
import * as ion from "../../src/Ion";
import {Decimal, IonTypes, Timestamp, toBase64} from "../../src/Ion";
import {load, Value} from "../../src/dom";
import {encodeUtf8} from "../../src/IonUnicode";

// Verifies that subtypes of dom.Value down-convert to JSON following the documented process[1].
// [1] http://amzn.github.io/ion-docs/guides/cookbook.html#down-converting-to-json

// Calls dom.Value.from() on each Javascript value to create a corresponding Ion value, then verifies that
// JSON.stringify() produces the same output for both.
function jsonStringifyTests(typeName: string, ...jsValues: any[]) {
    describe(typeName, () => {
        for (let jsValue of jsValues) {
            let json: string = JSON.stringify(jsValue);
            it(json, () => {
                assert.equal(
                    json,
                    JSON.stringify(Value.from(jsValue))
                );
            });
        }
    });
}

// Like jsonStringifyTests above, but produces an Ion value by parsing the provided source text instead of using
// Value.from(). This is useful for Ion data types that cannot be instantiated via `Value.from()` (e.g. SExpression,
// Clob) or individual values that default to another Ion type (e.g. `Number.isInteger(0.0)` is true, so
// dom.Value.from() represents it as an Ion integer instead of a float.)
function jsonStringifyIonSourceTests(typeName: string, ...jsValueIonSourcePairs: [any, string][]) {
    describe(typeName, () => {
        for (let [jsValue, inputIon] of jsValueIonSourcePairs) {
            let json: string = JSON.stringify(jsValue);
            let ionValue: Value = load(inputIon)!;
            it(inputIon, () => {
                assert.equal(
                    json,
                    JSON.stringify(ionValue)
                );
            });
        }
    });
}

describe('JSON', () => {
    describe('stringify()', () => {
        // Create a [null, 'null.typename'] pair for each Ion type
        let typedNulls: [null, string][] = Object.values(IonTypes).map(ionType => [null, 'null.' + ionType.name]);
        jsonStringifyIonSourceTests(
            'Null',
            ...typedNulls
        );
        jsonStringifyTests('Boolean', true, false);
        jsonStringifyTests(
            'Integer',
            Number.MIN_SAFE_INTEGER,
            -8675309,
            -24601,
            -0,
            0,
            24601,
            8675309,
            Number.MAX_SAFE_INTEGER,
        );
        jsonStringifyTests(
            'Float',
            2.4601,
            867.5309
        );
        jsonStringifyIonSourceTests(
            'Float representations of integers',
            [null, '-inf'],
            [null, '+inf'],
            [null, 'nan'],
            [0, '0e0'],
            [-0, '-0e0'], // JSON discards the sign in both cases
        );
        jsonStringifyTests('Decimal',
            new Decimal("0"),
            new Decimal("1.5"),
            new Decimal("-1.5"),
            new Decimal(".00001"),
            new Decimal("-.00001"),
        );
        jsonStringifyTests('Timestamp',
            new Date('1970-01-01T00:00:00.000Z'),
            Timestamp.parse('1970-01-01T00:00:00.000Z'),
            Timestamp.parse('2020-03-01T00:00:00.000+01:00'), // UTC 11PM Leap day
            Timestamp.parse('2020-02-28T23:00:00.000-01:00')  // UTC midnight Leap day
        );
        jsonStringifyTests('String', "foo", "bar", "baz", "");
        jsonStringifyTests(
            'List',
            [],
            [1, 2, 3],
            ['foo', 'bar', 'baz'],
            [new Date(0), {qux: 21, grault: false}]
        );
        jsonStringifyTests(
            'Struct',
            {},
            {foo: 5, bar: "baz", qux: true},
            {foo: ['dog', 'cat', 'mouse']}
        );
        it('Blob', () => {
            let helloWorldBase64 = toBase64(encodeUtf8("Hello, world!"));
            let blob = load('{{' + helloWorldBase64 + '}}')!;
            assert.equal(IonTypes.BLOB, blob.getType());
            assert.equal(
                JSON.stringify(helloWorldBase64),
                JSON.stringify(blob)
            );
        });
        it('Clob', () => {
            // Create a clob that contains some multi-byte, non-ASCII characters.
            let text = "I ❤️ eating 🍕!";
            let utf8 = encodeUtf8(text);
            let clob = new ion.dom.Clob(utf8);

            // JSON.stringify should escape any non-ASCII bytes, so we'll need
            // the Unicode-escaped representations of the emoji used above.
            let unicodeEscaped = {
              heart: "\\u00e2\\u009d\\u00a4\\u00ef\\u00b8\\u008f",
              pizza: "\\u00f0\\u009f\\u008d\\u0095"
            };

            let expectedJsonText = JSON.stringify(`I ${unicodeEscaped.heart} eating ${unicodeEscaped.pizza}!`);
            let actualJsonText = JSON.stringify(clob);

            assert.equal(actualJsonText, expectedJsonText);
        });
        jsonStringifyIonSourceTests(
            'SExpression',
            [[], '()'],
            [[1, 2, 3], '(1 2 3)'],
            [[1, '+', 2], '(1 + 2)'],
            [[1, '+', '2'], '(1 + \'2\')'],
            [[1, '+', '2'], '(1 + "2")'],
            [['-', '+', '@', '=', '/', '&', '*', '^'], '(- + @ = / & * ^)'],
            [['-+@=/&*^'], '(-+@=/&*^)'],
        );
        it('Symbol', () => {
            assert.equal(
                JSON.stringify('foo'),
                JSON.stringify(load('foo'))
            );
        });
    });
});