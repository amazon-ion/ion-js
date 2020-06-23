import {assert} from "chai";
import {dom, IonTypes} from "../../src/Ion";

describe('dom.Struct property shadowing', () => {
    it('Built-in properties cannot be shadowed', () => {
        // Create a struct with field names that conflict with method names
        let s = dom.Value.from({
            getType: "baz",
            getAnnotations: 56,
            fieldNames: ['dog', 'cat', 'mouse']
        }, ['foo', 'bar']);

        // Method names are still directly accessible
        assert.equal(s.getType(), IonTypes.STRUCT);
        assert.deepEqual(s.getAnnotations(), ['foo', 'bar']);
        assert.deepEqual(s.fieldNames(), ['getType', 'getAnnotations', 'fieldNames']);

        // Fields with names that would shadow a built-in are accessible via Value#get()
        assert.equal(s.get('getType')!.stringValue(), "baz");
        assert.equal(s.get('getAnnotations')!.numberValue(), 56);
        assert.equal(s.get('fieldNames', 0)!.stringValue(), 'dog');
        assert.equal(s.get('fieldNames', 1)!.stringValue(), 'cat');
        assert.equal(s.get('fieldNames', 2)!.stringValue(), 'mouse');

        // get() does not return values for properties on `Object`
        assert.isNull(s.get('toString'));
        assert.isNull(s.get('toLocaleString'));
        assert.isNull(s.get('valueOf'));
    })
});