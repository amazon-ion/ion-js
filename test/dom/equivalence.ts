import { assert } from "chai";
import { Value, load } from "../../src/dom";

/**
 * This file contains 'equals()' tests for each Ion data type:
 * - Demonstrates equivalence of dom.Value with strict and non-strict modes.
 * - Also shows equivalence with epsilon precision for Float values.
 */

describe("Equivalence", () => {
  it("equals() for Null", () => {
    let nullValue1: Value = load("null.blob")!;
    let nullValue2: Value = load("null.blob")!;
    let nullValue3: Value = load("null")!;
    let nullValue4: Value = load("null.null")!;
    let nullValue5: Value = load('"null"')!;
    assert.isTrue(nullValue1.equals(nullValue2));
    assert.isFalse(nullValue1.equals(nullValue3));
    assert.isTrue(nullValue3.equals(nullValue4));
    assert.isFalse(nullValue3.equals(nullValue5));
  });

  it("equals() for Boolean", () => {
    let bool1: Value = load("foo::false")!;
    let bool2: Value = load("foo::false")!;
    let bool3: Value = load("false")!;
    let bool4: Value = load("true")!;
    assert.isTrue(bool1.equals(bool2));
    // annotations should match for strict comparison
    assert.isFalse(bool1.equals(bool3));
    assert.isTrue(bool1.equals(bool3, { strict: false }));
    assert.isFalse(bool1.equals(bool4));
  });

  it("equals() for Integer", () => {
    let int1: Value = load("foo::bar::7")!;
    let int2: Value = load("foo::bar::7")!;
    let int3: Value = load("7")!;
    let int4: Value = load("-10")!;
    assert.isTrue(int1.equals(int2));
    // annotations should match for strict comparison
    assert.isFalse(int1.equals(int3));
    assert.isTrue(int1.equals(int3, { strict: false }));
    assert.isFalse(int1.equals(int4));
  });

  it("equals() for Float", () => {
    let float1: Value = load("baz::qux::15e-1")!;
    let float2: Value = load("baz::qux::15e-1")!;
    let float3: Value = load("15e-1")!;
    let float4: Value = load("1.5")!;
    let float5: Value = load("12e-1")!;

    assert.isTrue(float1.equals(float2));
    // annotations should match for strict comparison
    assert.isFalse(float1.equals(float3));
    assert.isTrue(float1.equals(float3, { strict: false }));
    // Decimal and Float values will not be equivalent
    assert.isFalse(float1.equals(float4));
    // both values should be at least equivalent by epsilon value
    assert.isTrue(float3.equals(float5, { epsilon: 0.5 }));
    assert.isFalse(float3.equals(float5, { epsilon: 0.2 }));
  });

  it("equals() for Decimal", () => {
    let decimal1: Value = load("101.5")!;
    let decimal2: Value = load("101.5")!;
    let decimal3: Value = load("101")!;

    assert.isTrue(decimal1.equals(decimal2));
    assert.isFalse(decimal1.equals(decimal3));
    assert.isFalse(decimal3.equals(decimal1));
  });

  it("equals() for Timestamp", () => {
    let timestamp1: Value = load("DOB::2020-01-16T20:15:54.066Z")!;
    let timestamp2: Value = load("DOB::2020-01-16T20:15:54.066Z")!;
    let timestamp3: Value = load("DOB::2001T")!;
    let timestamp4: Value = load("DOB::2001-01-01T")!;

    assert.isTrue(timestamp1.equals(timestamp2));
    // In strict mode the precision and local offsets are also compared
    assert.isFalse(timestamp1.equals(timestamp3));
    // Non strict mode precision and local offset are ignored along with annotations
    assert.isTrue(timestamp3.equals(timestamp4, { strict: false }));
  });

  it("equals() for Symbol", () => {
    let symbol1: Value = load('"Saturn"')!;
    let symbol2: Value = load('"Saturn"')!;
    let symbol3: Value = load('"Jupiter"')!;

    assert.isTrue(symbol1.equals(symbol2));
    assert.isFalse(symbol1.equals(symbol3));
  });

  it("equals() for String", () => {
    let symbol1: Value = load('"Saturn"')!;
    let symbol2: Value = load('"Saturn"')!;
    let symbol3: Value = load('"Jupiter"')!;

    assert.isTrue(symbol1.equals(symbol2));
    assert.isFalse(symbol1.equals(symbol3));
  });

  it("equals() for Clob", () => {
    let clob1: Value = load('month::{{"February"}}')!;
    let clob2: Value = load('month::{{"February"}}')!;
    let clob3: Value = load('month::{{"January"}}')!;

    assert.isTrue(clob1.equals(clob2));
    assert.isFalse(clob1.equals(clob3));
  });

  it("equals() for Blob", () => {
    let blob1: Value = load("quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}")!;
    let blob2: Value = load("quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}")!;
    let blob3: Value = load("quote::{{dHdvIHBhZGRpbmcgY2hhcmFjdGVycw==}}")!;

    assert.isTrue(blob1.equals(blob2));
    assert.isFalse(blob1.equals(blob3));
  });

  it("equals() for List", () => {
    let list1: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;
    let list2: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;
    let list3: Value = load('planets::["Mercury", "Venus"]')!;
    let list4: Value = load(
      'planets::["Mercury", "Venus", "Earth", "Jupiter"]'
    )!;

    assert.isTrue(list1.equals(list2));
    assert.isFalse(list1.equals(list3));
    assert.isFalse(list3.equals(list1));
    assert.isFalse(list1.equals(list4));
    assert.isFalse(list4.equals(list1));
  });

  it("equals() for SExpression", () => {
    let sexp1: Value = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;
    let sexp2: Value = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;
    let sexp3: Value = load('planets::("Mercury" "Venus" "Earth")')!;
    let sexp4: Value = load('planets::("Mercury" "Venus" "Earth" "Jupiter")')!;

    assert.isTrue(sexp1.equals(sexp2));
    assert.isFalse(sexp1.equals(sexp3));
    assert.isFalse(sexp3.equals(sexp1));
    assert.isFalse(sexp1.equals(sexp4));
    assert.isFalse(sexp4.equals(sexp1));
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
    assert.isTrue(struct1.equals(struct2));
    assert.isFalse(struct1.equals(struct3));
    assert.isFalse(struct3.equals(struct1));
    assert.isFalse(struct1.equals(struct4));
    assert.isFalse(struct4.equals(struct1));
    // annotations should match for strict comparison
    assert.isTrue(struct4.equals(struct5, { strict: false }));
  });
});
