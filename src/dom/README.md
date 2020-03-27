# Ion DOM API

While the Ion streaming `Reader` API is more efficient, the Ion DOM `Value` API is often
simpler for developers to work with.

* [`ion.load()`](#ionload)
* [`ion.loadAll()`](#ionloadall)
* [`ion.dom.Value`](#iondomvalue)
* [`ion.dom.Value.from()`](#iondomvaluefrom)
* [`ion.dumpBinary()`, `ion.dumpText()`, and `ion.dumpPrettyText()`](#iondumpbinary-iondumptext-and-iondumpprettytext)
* [`ion.dom` Data Types](#iondom-data-types)
* [Testing Equality](#testing-equality)

### `ion.load()`

To get started, try reading some Ion data into memory by calling `ion.load()` and passing it
either a `string` or `Uint8Array` containing some serialized Ion data. This function will return
a Javascript object representation of the first value it encounters, including any nested values.

Each Ion DOM data type [extends a native Javascript type](#iondom-data-types), which means 
that in most cases you can treat values returned by `ion.load()` the same way you would
treat the standard Javascript equivalent. 

#### Integer example
```javascript
let int = ion.load('7');
assert.equal(7, int);
assert.equal(8, int + 1);
assert.equal(49, int ** 2);
assert.equal(1, int / 7);
```

#### String example
```javascript
let string = ion.load('"Hello, World!"');
if (string.match(/hello/i)) {
  let shoutedGreeting = string.toUpperCase();
  console.log(shoutedGreeting);
}
```

#### List example
```javascript
let list = ion.load('[1, 2, 3]');
let sum = list.reduce((subTotal, value) => subTotal + value, 0);
assert.equal(6, sum);
```

#### Struct example
```javascript
let struct = ion.load('person::{name: {first: "John", middle: "Jacob", last: "Jingleheimer-Schmidt"}, age: 41}');
assert.equal("Jacob", struct.name.middle);
assert.equal(41, struct.age);
for (let [fieldName, value] of struct) {
  console.log(fieldName + ': ' + value);
}
```

### `ion.loadAll()`

If your Ion data source contains multiple top-level values, you can use `ion.loadAll()` to
eagerly read them all into an array.

```javascript
import * as ion from 'ion-js';

let values = ion.loadAll('6 "Hello" true');

assert.equal(6, values[0]);
assert.equal("Hello", values[1]);
assert.isTrue(values[2].booleanValue());
```

### `ion.dom.Value`

Values returned by `load()` implement the `ion.dom.Value` interface, which provides explicit methods for
indexing into Ion values as well as for converting them to native JS representations. While this API is more verbose
than the Javascript API demonstrated previously, it offers more type safety and is intended to be the interface used
in Typescript code. 

#### Integer example
```typescript
// `i` is a `dom.Integer`, which implements the `Value` interface.
let i: Value = ion.load('7');

// The Typescript compiler won't allow a direct comparison of a dom.Integer and a JS number, so
// we'll need to down-convert our Ion value before comparing them. We can do this either by calling 
// the Value interface's numberValue() method:
assert.equal(7, i.numberValue()); 
// or by using Javascript's unary `+` operator, which is more concise but less explicit:
assert.equal(7, +i);

// dom.Integer is not a text value, so there is no string value associated with it.
assert.throws(() => i.stringValue());
```

#### String example
```typescript
// `s` is a `dom.String`, which implements the `Value` interface.
let s: Value = ion.load('"foo"');

// The Typescript compiler won't allow a direct comparison of a dom.String and a JS string, so
// we'll need to down-convert our Ion value before comparing them. We can do this either by calling 
// the Value interface's stringValue() method:
assert.equal("foo", s.stringValue()); 
// or concatenate our dom.String with the empty string, which is more concise but less explicit:
assert.equal("foo", +s);

// dom.String is not a numeric value, so there is no number value associated with it.
assert.throws(() => s.numberValue());
```

#### List example
```typescript
// `l` is a `dom.List`, which implements the `Value` interface.
let l: Value = ion.load('[0, 2, 4, 6, 8, 10]');

// We can use the `get()` method to index into the Value
assert.equal(4, l.get(2));

// iteration example using the `elements()` method
for (let value of l.elements()) {
    assert.isTrue(value % 2 == 0);
}
```

#### Struct example
```typescript
// Ion struct
let person: Value = ion.load(
  'person::{' +
      'name: {' +
          'first: "John", ' +
          'middle: "Jacob", ' +
          'last: "Jingleheimer-Schmidt",' +
     '},' +
     'age: 41' +
  '}'
)!;

// The get() method can also be used for indexing into structs
assert.equal(41, person.get('age'));

// If the data is nested, you can pass multiple keys into get() to specify a complete path:
assert.equal('Jacob', person.get('name', 'middle'));

// Iteration example using the `fields()` method
for (let [fieldName, value] of person.fields()) {
    console.log(fieldName + ': ' + value);
}
```


### `ion.dom.Value.from()`

You can upgrade a JS value to an Ion value using the `from()` method: 

```typescript
let i = ion.dom.Value.from(7);
assert.equal(IonTypes.INT, i.getType());
assert.equal(7, i.numberValue());

let s = ion.dom.Value.from("foo", ["bar", "baz"]); // from() accepts an optional list of annotations
assert.equal(IonTypes.STRING, s.getType());
assert.equal("foo", s.stringValue());
assert.deepEqual(['bar', 'baz'], s.getAnnotations());
```

## `ion.dumpBinary()`, `ion.dumpText()`, and `ion.dumpPrettyText()`

As a complement to `ion.load()`, Ion provides a collection of convenience methods that make it easy to produce
serialized Ion text or binary data from a given in-memory object:

* `ion.dumpBinary()` writes its parameters to a binary Ion stream and returns a `Uint8Array` containing the 
  serialized bytes.
* `ion.dumpText()` writes its parameters to a compact text Ion stream and returns a `string` containing the
  serialized data.
* `ion.dumpPrettyText()` writes its parameters to a text Ion stream that has been generously spaced for human
  readability and returns a `string` containing the serialized data.

### ion.dumpBinary() round-tripping example
```javascript
// Write the number 7 to a binary Ion stream and store the bytes in `data`
let data = ion.dumpBinary(7);
// Use ion.load() to parse `data`
let i = ion.load(data);
// Verify that the value found in the stream is the one we started with
assert.equal(7, i);
```

### ion.dumpText() vs ion.dumpPrettyText() example
```
let ionText = ion.dumpText([1, 2, 3]);
let ionPrettyText = ion.dumpPrettyText([1, 2, 3]);

assert.equal(ionText, '[1,2,3]');
assert.equal(ionPrettyText, '[\n  1,\n  2,\n  3\n]');
```

## `ion.dom` Data Types

The Ion DOM data types each extend a native Javascript type: 

Ion DOM Type | Extended JS Type
---|:---: 
`ion.dom.Null` | `Object`
`ion.dom.Boolean` | `Boolean`
`ion.dom.Integer` | `Number`
`ion.dom.Float` | `Number`
`ion.dom.Decimal` | `Number`
`ion.dom.Timestamp` | `Date`
`ion.dom.Symbol` | `String`
`ion.dom.String` | `String`
`ion.dom.Clob` | `Uint8Array`
`ion.dom.Blob` | `Uint8Array`
`ion.dom.List` | `Array`
`ion.dom.SExpression` | `Array`
`ion.dom.Struct` | `Object`

### Testing Equality

Note that the JS types being extended are "[wrapper objects](https://developer.mozilla.org/en-US/docs/Glossary/Primitive#Primitive_wrapper_objects_in_JavaScript)"
that box the primitive types themselves. This matters when testing for equality; Javascript's strict definition of equality 
(used by the `===` operator) takes `Object` identity into account and so will return `false` when comparing two different
wrapper objects representing the same value.

#### `String` example 

The code below demonstrates this behavior using the primitive `string` type and its wrapper object, `String`:
```javascript
let string = "foo"; // Primitive string
let boxedString = new String("foo"); // String wrapper object
let boxedString2 = new String("foo"); // Second wrapper object with the same value

assert.isTrue(string == boxedString);
assert.isFalse(string === boxedString);
assert.isFalse(boxedString == boxedString2);
assert.isTrue(string === ''+boxedString);
assert.isFalse(boxedString === boxedString2);
```

Ion `dom.Value` instances exhibit the same behavior:
```javascript
let string = "foo"; // Primitive string
let ionString = ion.dom.Value.from("foo"); // ion.dom.String instance
let ionString2 = ion.dom.Value.from("foo"); // Second ion.dom.String instance with the same value

assert.isTrue(string == ionString);
assert.isFalse(string === ionString);
assert.isTrue(string === ''+ionString);
assert.isTrue(string === ionString.stringValue());
assert.isFalse(ionString === ionString2);
``` 