# Ion DOM API

While the Ion streaming `Reader` API is more efficient, the Ion DOM `Value` API is often
simpler for developers to work with.

- [`ion.load()`](#ionload)
- [`ion.loadAll()`](#ionloadall)
- [`ion.dom.Value`](#iondomvalue)
- [`ion.dom.Value.from()`](#iondomvaluefrom)
- [`ion.dumpBinary()`, `ion.dumpText()`, and `ion.dumpPrettyText()`](#iondumpbinary-iondumptext-and-iondumpprettytext)
- [`ion.dom` Data Types](#iondom-data-types)
- [Testing Equality](#testing-equality)

### `ion.load()`

To get started, try reading some Ion data into memory by calling `ion.load()` and passing it
either a `string` or `Uint8Array` containing some serialized Ion data. This function will return
a JavaScript object representation of the first value it encounters, including any nested values.

Each Ion DOM data type [extends a native JavaScript type](#iondom-data-types), which means
that in most cases you can treat values returned by `ion.load()` the same way you would
treat the standard JavaScript equivalent.

#### Integer example

```javascript
let int = ion.load("7");
assert.equal(int, 7);
assert.equal(int + 1, 8);
assert.equal(int ** 2, 49);
assert.equal(int / 7, 1);
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
let list = ion.load("[1, 2, 3]");
let sum = list.reduce((subTotal, value) => subTotal + value, 0);
assert.equal(sum, 6);
```

#### Struct example

```javascript
let struct = ion.load(
  '{name: {first: "John", middle: "Jacob", last: "Jingleheimer-Schmidt"}, age: 41}'
);
assert.equal(struct.name.middle, "Jacob");
assert.equal(struct.age, 41);
for (let [fieldName, value] of struct) {
  console.log(fieldName + ": " + value);
}
```

### `ion.loadAll()`

If your Ion data source contains multiple top-level values, you can use `ion.loadAll()` to
eagerly read them all into an array.

```javascript
import * as ion from "ion-js";

let values = ion.loadAll('6 "Hello" true');

assert.equal(values[0], 6);
assert.equal(values[1], "Hello");
assert.isTrue(values[2].booleanValue());
```

### `ion.dom.Value`

Values returned by `load()` implement the `ion.dom.Value` interface, which provides explicit methods for
indexing into Ion values as well as for converting them to native JS representations. While this API is more verbose
than the JavaScript API demonstrated previously, it offers more type safety and is intended to be the interface used
in TypeScript code.

#### Integer example

```typescript
// `i` is a `dom.Integer`, which implements the `Value` interface.
let i: Value = ion.load("7");

// The TypeScript compiler won't allow a direct comparison of a dom.Integer and a JS number, so
// we'll need to down-convert our Ion value before comparing them. We can do this either by calling
// the Value interface's numberValue() method:
assert.equal(i.numberValue(), 7);
// or by using JavaScript's unary `+` operator, which is more concise but less explicit:
assert.equal(+i, 7);

// dom.Integer is not a text value, so there is no string value associated with it.
assert.throws(() => i.stringValue());
```

#### String example

```typescript
// `s` is a `dom.String`, which implements the `Value` interface.
let s: Value = ion.load('"foo"');

// The TypeScript compiler won't allow a direct comparison of a dom.String and a JS string, so
// we'll need to down-convert our Ion value before comparing them. We can do this either by calling
// the Value interface's stringValue() method:
assert.equal(s.stringValue(), "foo");
// or concatenate our dom.String with the empty string, which is more concise but less explicit:
assert.equal("" + s, "foo");

// dom.String is not a numeric value, so there is no number value associated with it.
assert.throws(() => s.numberValue());
```

#### List example

```typescript
// `l` is a `dom.List`, which implements the `Value` interface.
let l: Value = ion.load("[0, 2, 4, 6, 8, 10]");

// We can use the `get()` method to index into the Value
assert.equal(l.get(2), 4);

// iteration example using the `elements()` method
for (let value of l.elements()) {
  assert.isTrue(value % 2 == 0);
}
```

#### Struct example

```typescript
// Ion struct
let person: Value = ion.load(
  "{" +
    "name: {" +
    'first: "John", ' +
    'middle: "Jacob", ' +
    'last: "Jingleheimer-Schmidt",' +
    "}," +
    "age: 41" +
    "}"
)!;

// The get() method can also be used for indexing into structs
assert.equal(person.get("age"), 41);

// If the data is nested, you can pass multiple keys into get() to specify a complete path:
assert.equal(person.get("name", "middle"), "Jacob");

// Iteration example using the `fields()` method
for (let [fieldName, value] of person.fields()) {
  console.log(fieldName + ": " + value);
}
```

### `ion.dom.Value.from()`

You can upgrade a JS value to an Ion value using the `from()` method:

```typescript
let i = ion.dom.Value.from(7);
assert.equal(i.getType(), IonTypes.INT);
assert.equal(i.numberValue(), 7);

let s = ion.dom.Value.from('"foo"', ["bar", "baz"]); // from() accepts an optional list of annotations
assert.equal(s.getType(), IonTypes.STRING);
assert.equal(s.stringValue(), "foo");
assert.deepEqual(s.getAnnotations(), ["bar", "baz"]);
```

## `ion.dumpBinary()`, `ion.dumpText()`, and `ion.dumpPrettyText()`

As a complement to `ion.load()`, Ion provides a collection of convenience methods that make it easy to produce
serialized Ion text or binary data from a given in-memory object:

- `ion.dumpBinary()` writes its parameters to a binary Ion stream and returns a `Uint8Array` containing the
  serialized bytes.
- `ion.dumpText()` writes its parameters to a compact text Ion stream and returns a `string` containing the
  serialized data.
- `ion.dumpPrettyText()` writes its parameters to a text Ion stream that has been generously spaced for human
  readability and returns a `string` containing the serialized data.

### ion.dumpBinary() round-tripping example

```javascript
// Write the number 7 to a binary Ion stream and store the bytes in `data`
let data = ion.dumpBinary(7);
// Use ion.load() to parse `data`
let i = ion.load(data);
// Verify that the value found in the stream is the one we started with
assert.equal(i, 7);
```

### ion.dumpText() vs ion.dumpPrettyText() example

```javascript
let ionText = ion.dumpText([1, 2, 3]);
let ionPrettyText = ion.dumpPrettyText([1, 2, 3]);

assert.equal("[1,2,3]", ionText);
assert.equal("[\n  1,\n  2,\n  3\n]", ionPrettyText);
```

## `ion.dom` Data Types

The Ion DOM data types each extend a native JavaScript type:

| Ion DOM Type          | Extended JS Type |
| --------------------- | :--------------: |
| `ion.dom.Null`        |     `Object`     |
| `ion.dom.Boolean`     |    `Boolean`     |
| `ion.dom.Integer`     |     `Number`     |
| `ion.dom.Float`       |     `Number`     |
| `ion.dom.Decimal`     |     `Number`     |
| `ion.dom.Timestamp`   |      `Date`      |
| `ion.dom.Symbol`      |     `String`     |
| `ion.dom.String`      |     `String`     |
| `ion.dom.Clob`        |   `Uint8Array`   |
| `ion.dom.Blob`        |   `Uint8Array`   |
| `ion.dom.List`        |     `Array`      |
| `ion.dom.SExpression` |     `Array`      |
| `ion.dom.Struct`      |     `Object`     |

### Testing Equality

Note that the JS types being extended are "[wrapper objects](https://developer.mozilla.org/en-US/docs/Glossary/Primitive#Primitive_wrapper_objects_in_JavaScript)"
that box the primitive types themselves. This matters when testing for equality; JavaScript's strict definition of equality
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
assert.isTrue(string === "" + boxedString);
assert.isFalse(boxedString === boxedString2);
```

Ion `dom.Value` instances exhibit the same behavior:

```javascript
let string = "foo"; // Primitive string
let ionString = ion.dom.Value.from("foo"); // ion.dom.String instance
let ionString2 = ion.dom.Value.from("foo"); // Second ion.dom.String instance with the same value

assert.isTrue(string == ionString);
assert.isFalse(string === ionString);
assert.isTrue(string === "" + ionString);
assert.isTrue(string === ionString.stringValue());
assert.isFalse(ionString === ionString2);
```

### `dom.Value` equivalence

`dom.Value` provides two ways to test equality:
1. `ionEquals`, which tests two `dom.Value` instances for equivalence according to the Ion data model.
2. `equals`, which tests for value-based equality and can be used to compare a `dom.Value` with a corresponding JS object.

#### `ionEquals`

This method compares a `dom.Value` object with another `dom.Value` object with either strict or non-strict comparison type. 

*Strict equivalence* refers to Ion data model equivalence as defined in Ion Equivalence (https://www.javadoc.io/doc/com.amazon.ion/ion-java/latest/com/amazon/ion/util/Equivalence.html) and by Ion Specification (http://amzn.github.io/ion-docs/docs/spec.html)
*Structural* (or *non-strict*) *equivalence* follows the same rules as strict equivalence,except that:
* Annotations are not considered, and
* Timestamps that represent the same instant in time are always considered equivalent.

This method accepts an optional configuration object that allows you to modify how equivalence is determined. It recognizes the following properties:

| option                      | description                                                                           | default |
| --------------------------- | :-------------------------------------------------------------------------------------|:--------|
|`epsilon`                    | used by `Float` for an equality with given epsilon precision.                         | `null`  |
|`ignoreAnnotations`          | specifies whether to ignore annotations or not for equality.                          | `false` |
|`ignoreTimestampPrecision`   | specifies whether to ignore timestamp local offset and precision or not for equality. | `false` |

#### `equals`

This method compares a `dom.Value` object with a corresponding JS object as defined in [Ion Data Types section](#iondom-data-types). 
If the other object is a `dom.Value` instance then this comparison checks for structural (or "non-strict") equivalence.

_NOTE:_ 

* This method also provides an optional parameter `epsilon` for `Float` type comparison.
* This method allows `Decimal`, `Float`, and `number` values to be compared to one another.

#### Integer Example
```javascript
let intSame1: Value = load("foo::bar::7");
let intSame2: Value = load("foo::bar::7");
let intUnannotated: Value = load("7");

// Equivalence between two Ion DOM Values
intSame1.ionEquals(intSame2); // returns true
intSame1.ionEquals(intUnannotated); // returns false as annotations didn't match in a strict equivalence
intSame1.ionEquals(intUnannotated, {ignoreAnnotations: true}); // returns true for non-strict equivalence

// Equivalence between JS Value and Ion DOM Value
intSame1.equals(7); // returns true
intSame1.ionEquals(7); // returns false
```

#### Float Example
```javascript
let floatSame1: Value = load("baz::qux::15e-1");
let floatSame2: Value = load("baz::qux::15e-1");
let floatUnannotated: Value = load("15e-1");
let decimal: Value = load("1.5");
let floatNearBy: Value = load("12e-1");

// Equivalence between two Ion DOM Values
floatSame1.ionEquals(floatSame2); // returns true
floatSame1.ionEquals(floatUnannotated); // return false as annotations didn't match in a strict equivalence

floatSame1.ionEquals(decimal); // returns false as Decimal and Float values will not be equivalent
floatUnannotated.ionEquals(floatNearBy, {epsilon: 0.5}); // returns true as both values are equivalent by epsilon value
floatUnannotated.ionEquals(floatNearBy, {epsilon: 0.2}); // returns false as both values are not equivalent by epsilon value

// Equivalence between JS Value and Ion DOM Value
floatSame1.equals(1.5); // returns true
floatSame1.ionEquals(1.5); // returns false
```

#### Timestamp example
```javascript
let timestampSame1: Value = load("DOB::2020-01-16T20:15:54.066Z");
let timestampSame2: Value = load("DOB::2020-01-16T20:15:54.066Z");
let timestampWithYearPrecision: Value = load("DOB::2001T");
let timestampWithDatePrecision: Value = load("DOB::2001-01-01T");

// Equivalence between two Ion DOM Values
timestampSame1.ionEquals(timestampSame2); // returns true 
timestampSame1.ionEquals(timestampWithYearPrecision); // returns false as in strict mode the precision and local offsets are also compared
timestampWithYearPrecision.ionEquals(timestampWithDatePrecision, {ignoreTimestampPrecision: true}); // retruns true as in non strict comparison precision are ignored

// Equivalence between JS Value and Ion DOM Value
timestampSame1.equals(new Date("2020-01-16T20:15:54.066Z")); // returns true
timestampSame1.equals(new Date("2020-02-16T20:15:54.066Z")); // returns false as month is different 
```

#### List Example
```javascript
let listSame1: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]');
let listSame2: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]');
let listWithDifferentLength: Value = load('planets::["Mercury", "Venus"]');

// Equivalence between two Ion DOM Values
listSame1.ionEquals(listSame2) // returns true
listSame1.ionEquals(listWithDifferentLength) // returns false because the lists have different length

// Equivalence between JS Value and Ion DOM Value
listSame1.equals(["Mercury", "Venus", "Earth", "Mars"]); // returns true
listSame1.equals(["Mercury", "Venus", "Earth"]); // returns false because the lists differ with one element "Mars"
```

####Struct Example
```javascript
let structSame1: Value = load(
  "foo::bar::{" +
    "name: {" +
    'first: "John", ' +
    'middle: "Jacob", ' +
    'last: "Jingleheimer-Schmidt",' +
    "}," +
    "age: 41" +
    "}"
);
let structSame2: Value = load(
  "foo::bar::{" +
    "name: {" +
    'first: "John", ' +
    'middle: "Jacob", ' +
    'last: "Jingleheimer-Schmidt",' +
    "}," +
    "age: 41" +
    "}"
);
let structWithDifferentFieldValue: Value = load(
  "foo::bar::{" +
    "name: {" +
    'first: "Jessica", ' +
    'middle: "Jacob", ' +
    'last: "Jingleheimer-Schmidt",' +
    "}," +
    "age: 41" +
    "}"
);

// Equivalence between two Ion DOM Values
structSame1.ionEquals(structSame2); // returns true
structSame1.ionEquals(structWithDifferentFieldValue); // retruns false because name is different for both values

// Equivalence between JS Value and Ion DOM Value
structSame1.equals(
    {
      name: {
        first: "John",
        middle: "Jacob",
        last: "Jingleheimer-Schmidt",
      },
      age: 41,
    }
); // returns true
```
