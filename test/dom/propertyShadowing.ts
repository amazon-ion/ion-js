import {assert} from "chai";
import {dom, IonTypes} from "../../src/Ion";

describe('dom.Struct property shadowing', () => {
    it('Built-in properties cannot be shadowed', () => {
        // Create a struct with field names that conflict with method names
        let s = dom.Value.from({
            getType: "baz",
            getAnnotations: 56,
            fieldNames: ['dog', 'cat', 'mouse'],
            toString: 10,
            greetings: "hi",
            age: 7
        }, ['foo', 'bar']);

        // Method names are still directly accessible
        assert.equal(s.getType(), IonTypes.STRUCT);
        assert.deepEqual(s.getAnnotations(), ['foo', 'bar']);
        assert.deepEqual(s.fieldNames(), ['getType', 'getAnnotations', 'fieldNames', 'toString', 'greetings', 'age']);

        // Fields with names that would shadow a built-in are accessible via Value#get()
        assert.equal(s.get('getType')!.stringValue(), "baz");
        assert.equal(s.get('getAnnotations')!.numberValue(), 56);
        assert.equal(s.get('fieldNames', 0)!.stringValue(), 'dog');
        assert.equal(s.get('fieldNames', 1)!.stringValue(), 'cat');
        assert.equal(s.get('fieldNames', 2)!.stringValue(), 'mouse');

        // deleteProperty proxy method
        assert.isTrue(delete s['greetings']);
        assert.deepEqual(s.fieldNames(), ['getType', 'getAnnotations', 'fieldNames', 'toString', 'age']);

        // deleteField Struct method
        assert.isTrue(s.deleteField('age'));
        assert.deepEqual(s.fieldNames(), ['getType', 'getAnnotations', 'fieldNames', 'toString']);

        // delete for properties that match built-in
        assert.equal(s.get('toString')!.numberValue(), 10);
        assert.isTrue(delete s['toString']);
        assert.equal(typeof s.toString, "function");
        assert.deepEqual(s.fieldNames(), ['getType', 'getAnnotations', 'fieldNames']);

        // delete for field that doesn't exist
        assert.isFalse(s.deleteField('toString'));
        assert.isFalse(s.deleteField('greetings'));
        assert.isFalse(s.deleteField('name'));
        assert.isUndefined(s['greetings']);

        // deleteField will throw an error if it's called on a dom.Value that isn't a struct
        let l = dom.Value.from([1, 2, 3]);
        assert.throws(() => l.deleteField("1"), Error);

        // get() does not return values for properties on `Object`
        assert.isNull(s.get('toString'));
        assert.isNull(s.get('toLocaleString'));
        assert.isNull(s.get('valueOf'));
    })
});