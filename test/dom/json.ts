import {assert} from "chai";
import * as ion from "../../src/Ion";
import {Value} from "../../src/dom";
import {Decimal, IonTypes, Timestamp, toBase64} from "../../src/Ion";
import {encodeUtf8} from "../../src/IonTests";

// Verifies that subtypes of dom.Value down-convert to JSON following the documented process[1].
// [1] http://amzn.github.io/ion-docs/guides/cookbook.html#down-converting-to-json

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

describe('JSON', () => {
    describe('stringify()', () => {
        jsonStringifyTests('Null', null);
        jsonStringifyTests('Boolean', true, false);
        jsonStringifyTests('Integer', 24601, 0, 8675309);
        jsonStringifyTests('Float', 2.4601, 867.5309);
        jsonStringifyTests('Decimal',
            new Decimal("0"),
            new Decimal("1.5"),
            new Decimal("-1.5"),
            new Decimal(".00001"),
            new Decimal("-.00001"),
        );
        jsonStringifyTests('Timestamp',
            new Date('1970-01-01T00:00:00.000Z'),
            Timestamp.parse('1970-01-01T00:00:00.000Z')
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
            let blob = ion.load('{{' + helloWorldBase64 + '}}')!;
            assert.equal(IonTypes.BLOB, blob.getType());
            assert.equal(
                JSON.stringify(helloWorldBase64),
                JSON.stringify(blob)
            );
        });
        it('SExpression', () => {
            assert.equal(
                JSON.stringify([1, 2, 3]),
                JSON.stringify(ion.load('(1 2 3)'))
            );
            assert.equal(
                JSON.stringify([]),
                JSON.stringify(ion.load('()'))
            );
        });
        it('Symbol', () => {
            assert.equal(
                JSON.stringify('foo'),
                JSON.stringify(ion.load('foo'))
            );
        });
        it.skip('Clob', () => {
            //TODO: JSON.stringify() support for Clobs
        });
    });
});