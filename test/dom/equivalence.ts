import { assert } from "chai";
import { load, Value } from "../../src/dom";
import { Decimal } from "../../src/IonDecimal";

/**
 * This file contains 'equals()' tests for each Ion data type:
 * - Demonstrates equivalence of dom.Value with strict and non-strict(relaxed) modes.
 * - Also shows equivalence with epsilon precision for Float values.
 * - Demonstrates equivalence with JS values
 *
 * See the class-level documentation for more details on equals()
 */

describe("Equivalence", () => {
  it("equals() for Null", () => {
    let nullValue1: Value = load("null.blob")!;
    let nullValue2: Value = load("null.blob")!;
    let nullValue3: Value = load("null")!;
    let nullValue4: Value = load("null.null")!;
    let nullValue5: Value = load('"null"')!;
    assert.isTrue(nullValue1.ionEquals(nullValue2));
    assert.isFalse(nullValue1.ionEquals(nullValue3));
    assert.isTrue(nullValue3.ionEquals(nullValue4));
    assert.isFalse(nullValue3.ionEquals(nullValue5));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(nullValue3.equals(null));
    assert.isFalse(nullValue3.ionEquals(null));
    assert.isFalse(nullValue1.equals(null));
  });

  it("equals() for Boolean", () => {
    let bool1: Value = load("foo::false")!;
    let bool2: Value = load("foo::false")!;
    let bool3: Value = load("false")!;
    let bool4: Value = load("true")!;
    assert.isTrue(bool1.ionEquals(bool2));
    // annotations should match for strict comparison
    assert.isFalse(bool1.ionEquals(bool3));
    assert.isTrue(bool1.equals(bool3));
    assert.isFalse(bool1.ionEquals(bool4));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(bool1.equals(false));
    assert.isFalse(bool1.ionEquals(false));
    assert.isFalse(bool1.equals(true));
    assert.isTrue(bool1.equals(new Boolean(false)));
    assert.isFalse(bool1.equals(new Boolean(true)));
  });

  it("equals() for Integer", () => {
    let int1: Value = load("foo::bar::7")!;
    let int2: Value = load("foo::bar::7")!;
    let int3: Value = load("7")!;
    let int4: Value = load("-10")!;
    assert.isTrue(int1.ionEquals(int2));
    // annotations should match for strict comparison
    assert.isFalse(int1.ionEquals(int3));
    assert.isTrue(int1.equals(int3));
    assert.isFalse(int1.ionEquals(int4));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(int1.equals(7));
    assert.isFalse(int1.ionEquals(7));
    assert.isFalse(int1.equals(10));
    assert.isTrue(int1.equals(new Number(7)));
    assert.isFalse(int1.equals(new Number(10)));
    assert.isTrue(int1.equals(7n));
    assert.isFalse(int1.equals(10n));
  });

  it("equals() for Float", () => {
    let float1: Value = load("baz::qux::15e-1")!;
    let float2: Value = load("baz::qux::15e-1")!;
    let float3: Value = load("15e-1")!;
    let float4: Value = load("1.5")!;
    let float5: Value = load("12e-1")!;

    assert.isTrue(float1.ionEquals(float2));
    // annotations should match for strict comparison
    assert.isFalse(float1.ionEquals(float3));
    assert.isTrue(float1.equals(float3));
    // Decimal and Float values will not be equivalent
    assert.isFalse(float1.ionEquals(float4));
    // both values should be at least equivalent by epsilon value
    assert.isTrue(float3.ionEquals(float5, { epsilon: 0.5 }));
    assert.isFalse(float3.ionEquals(float5, { epsilon: 0.2 }));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(float1.equals(1.5));
    assert.isFalse(float1.ionEquals(1.5));
    assert.isFalse(float1.equals(1.2));
    assert.isTrue(float1.equals(1.2, { epsilon: 0.5 }));
    assert.isTrue(float1.equals(new Number(1.5)));
    assert.isFalse(float1.equals(new Number(1.2)));
    assert.isTrue(float1.equals(new Number(1.2), { epsilon: 0.5 }));
  });

  it("equals() for Decimal", () => {
    let decimal1: Value = load("101.5")!;
    let decimal2: Value = load("101.5")!;
    let decimal3: Value = load("101")!;

    assert.isTrue(decimal1.ionEquals(decimal2));
    assert.isFalse(decimal1.ionEquals(decimal3));
    assert.isFalse(decimal3.ionEquals(decimal1));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(decimal1.equals(new Decimal("101.5")));
    assert.isFalse(decimal1.equals(new Decimal("105.8")));
  });

  it("equals() for Timestamp", () => {
    let timestamp1: Value = load("DOB::2020-01-16T20:15:54.066Z")!;
    let timestamp2: Value = load("DOB::2020-01-16T20:15:54.066Z")!;
    let timestamp3: Value = load("DOB::2001T")!;
    let timestamp4: Value = load("DOB::2001-01-01T")!;

    assert.isTrue(timestamp1.ionEquals(timestamp2));
    // In strict mode the precision and local offsets are also compared
    assert.isFalse(timestamp1.ionEquals(timestamp3));
    // Non strict mode precision and local offset are ignored along with annotations
    assert.isTrue(timestamp3.equals(timestamp4));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(timestamp1.equals(new Date("2020-01-16T20:15:54.066Z")));
    assert.isFalse(timestamp1.equals(new Date("2020-02-16T20:15:54.066Z")));
  });

  it("equals() for Symbol", () => {
    let symbol1: Value = load('"Saturn"')!;
    let symbol2: Value = load('"Saturn"')!;
    let symbol3: Value = load('"Jupiter"')!;

    assert.isTrue(symbol1.ionEquals(symbol2));
    assert.isFalse(symbol1.ionEquals(symbol3));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(symbol1.equals("Saturn"));
    assert.isTrue(symbol1.equals(new String("Saturn")));
    assert.isFalse(symbol1.equals(new String("Jupiter")));
    assert.isFalse(symbol1.equals("Jupiter"));
    assert.isFalse(symbol1.ionEquals(new String("Saturn")));
    assert.isFalse(symbol1.ionEquals("Saturn"));
  });

  it("equals() for String", () => {
    let string1: Value = load('"Saturn"')!;
    let string2: Value = load('"Saturn"')!;
    let string3: Value = load('"Jupiter"')!;

    assert.isTrue(string1.ionEquals(string2));
    assert.isFalse(string1.ionEquals(string3));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(string1.equals("Saturn"));
    assert.isTrue(string1.equals(new String("Saturn")));
    assert.isFalse(string1.equals(new String("Jupiter")));
    assert.isFalse(string1.equals("Jupiter"));
    assert.isFalse(string1.ionEquals(new String("Saturn")));
    assert.isFalse(string1.ionEquals("Saturn"));
  });

  it("equals() for Clob", () => {
    let clob1: Value = load('month::{{"February"}}')!;
    let clob2: Value = load('month::{{"February"}}')!;
    let clob3: Value = load('month::{{"January"}}')!;
    let clob4: Value = load('{{"Hello"}}')!;

    assert.isTrue(clob1.ionEquals(clob2));
    assert.isFalse(clob1.ionEquals(clob3));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(clob4.equals(new Uint8Array([72, 101, 108, 108, 111])));
    assert.isFalse(clob4.equals(new Uint8Array([72, 101, 108, 108])));
  });

  it("equals() for Blob", () => {
    let blob1: Value = load("quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}")!;
    let blob2: Value = load("quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}")!;
    let blob3: Value = load("quote::{{dHdvIHBhZGRpbmcgY2hhcmFjdGVycw==}}")!;
    let blob4: Value = load("{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}")!;

    assert.isTrue(blob1.ionEquals(blob2));
    assert.isFalse(blob1.ionEquals(blob3));
    assert.isTrue(blob1.equals(blob4));
  });

  it("equals() for List", () => {
    let list1: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;
    let list2: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;
    let list3: Value = load('planets::["Mercury", "Venus"]')!;
    let list4: Value = load(
      'planets::["Mercury", "Venus", "Earth", "Jupiter"]'
    )!;

    assert.isTrue(list1.ionEquals(list2));
    assert.isFalse(list1.ionEquals(list3));
    assert.isFalse(list3.ionEquals(list1));
    assert.isFalse(list1.ionEquals(list4));
    assert.isFalse(list4.ionEquals(list1));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(list1.equals(["Mercury", "Venus", "Earth", "Mars"]));
    assert.isFalse(list1.equals(["Mercury", "Venus", "Earth"]));
  });

  it("equals() for SExpression", () => {
    let sexp1: Value = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;
    let sexp2: Value = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;
    let sexp3: Value = load('planets::("Mercury" "Venus" "Earth")')!;
    let sexp4: Value = load('planets::("Mercury" "Venus" "Earth" "Jupiter")')!;

    assert.isTrue(sexp1.ionEquals(sexp2));
    assert.isFalse(sexp1.ionEquals(sexp3));
    assert.isFalse(sexp3.ionEquals(sexp1));
    assert.isFalse(sexp1.ionEquals(sexp4));
    assert.isFalse(sexp4.ionEquals(sexp1));
  });

  it("equals() for Struct", () => {
    let struct1: Value = load(
      "foo::bar::{" +
        "name: {" +
        'first: "John", ' +
        'middle: "Jacob", ' +
        'last: "Jingleheimer-Schmidt",' +
        "}," +
        "age: 41" +
        "}"
    )!;
    let struct2: Value = load(
      "foo::bar::{" +
        "name: {" +
        'first: "John", ' +
        'middle: "Jacob", ' +
        'last: "Jingleheimer-Schmidt",' +
        "}," +
        "age: 41" +
        "}"
    )!;
    let struct3: Value = load(
      "foo::bar::{" +
        "name: {" +
        'first: "Jessica", ' +
        'middle: "Jacob", ' +
        'last: "Jingleheimer-Schmidt",' +
        "}," +
        "age: 41" +
        "}"
    )!;
    let struct4: Value = load(
      "foo::bar::{" +
        "name: {" +
        'first: "John", ' +
        'middle: "Jacob", ' +
        'last: "Jingleheimer-Schmidt",' +
        "}," +
        "}"
    )!;
    let struct5: Value = load(
      "{" +
        "name: {" +
        'first: "John", ' +
        'middle: "Jacob", ' +
        'last: "Jingleheimer-Schmidt",' +
        "}," +
        "}"
    )!;
    assert.isTrue(struct1.ionEquals(struct2));
    assert.isFalse(struct1.ionEquals(struct3));
    assert.isFalse(struct3.ionEquals(struct1));
    assert.isFalse(struct1.ionEquals(struct4));
    assert.isFalse(struct4.ionEquals(struct1));
    // annotations should match for strict comparison
    assert.isTrue(struct4.equals(struct5));
    // Equivalence between JS Value and Ion DOM Value
    assert.isTrue(
      struct1.equals({
        name: {
          first: "John",
          middle: "Jacob",
          last: "Jingleheimer-Schmidt",
        },
        age: 41,
      })
    );
    assert.isFalse(
      struct1.equals({
        name: {
          first: "John",
          middle: "Jacob",
          last: "Jingleheimer-Schmidt",
        },
      })
    );
  });

  it("equals() for Struct inside List", () => {
    let value: Value = load(
      '[{ foo: 7, bar: true, baz: 98.6, qux: "Hello" }]'
    )!;
    assert.isTrue(
      value.equals([{ foo: 7, bar: true, baz: 98.6, qux: "Hello" }])
    );
  });

  it("equals() for List inside Struct", () => {
    let value: Value = load("{ foo: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] }")!;
    assert.isTrue(value.equals({ foo: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] }));
  });

  it("equals() for Struct with duplicate fields", () => {
    let value1: Value = load("{ foo: 'bar', foo: 'baz' }")!;
    let value2: Value = load("{ foo: 'bar', foo: 'baz' }")!;
    let value3: Value = load("{ foo: 'bar', foo: 'qux' }")!;
    let value4: Value = load("{ foo: 1, baz: true, foo: 2 }")!;
    let value5: Value = load("{ foo: 2, foo: 1, baz: true }")!;

    assert.isTrue(value1.ionEquals(value2));
    assert.isTrue(value2.ionEquals(value1));
    assert.isFalse(value1.ionEquals(value3));

    // Equivalence for unordered fields
    assert.isTrue(value4.ionEquals(value5));
  });
});
