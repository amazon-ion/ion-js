import { assert } from "chai";
import { Value, load, loadAll } from "../../src/dom";
import { Decimal, dom, IonType, IonTypes, Timestamp } from "../../src/Ion";
import * as ion from "../../src/Ion";
import JSBI from "jsbi";
import * as JsValueConversion from "../../src/dom/JsValueConversion";
import { Constructor } from "../../src/dom/Value";
import {
  exampleDatesWhere,
  exampleIonValuesWhere,
  exampleJsValuesWhere,
  exampleTimestampsWhere,
} from "../exampleValues";
import { valueName } from "../mochaSupport";

// Tests whether each value is or is not an instance of dom.Value
function instanceOfValueTest(expected: boolean, ...values: any[]) {
  for (let value of values) {
    it(`${valueName(value)} instanceof Value`, () => {
      assert.equal(value instanceof Value, expected);
    });
  }
}

function instanceOfValueSubclassTest(
  constructor: Constructor,
  expected: boolean,
  ...values: any[]
) {
  for (let value of values) {
    it(`${valueName(value)} instanceof ${constructor.name}`, () => {
      assert.equal(value instanceof constructor, expected);
    });
  }
}

// Describes the static side of dom.Value subclasses
interface DomValueConstructor extends Constructor {
  _getIonType(): IonType;
}

// The constructors of all dom.Value subclasses
const DOM_VALUE_SUBCLASSES: DomValueConstructor[] = [
  dom.Null,
  dom.Boolean,
  dom.Integer,
  dom.Float,
  dom.Decimal,
  dom.Timestamp,
  dom.Clob,
  dom.Blob,
  dom.String,
  dom.Symbol,
  dom.List,
  dom.SExpression,
  dom.Struct,
];

// Converts each argument in `valuesToRoundTrip` to a dom.Value, writes it to an Ion stream, and then load()s the Ion
// stream back into a dom.Value. Finally, compares the original dom.Value with the dom.Value load()ed from the stream
// to ensure that no data was lost.
function domRoundTripTest(typeName: string, ...valuesToRoundTrip: any[]) {
  describe(typeName, () => {
    for (let value of valuesToRoundTrip) {
      it(value + "", () => {
        let writer = ion.makeBinaryWriter();
        // Make a dom.Value out of the provided value if it isn't one already
        let domValue;
        if (value instanceof Value) {
          domValue = value as Value;
        } else {
          domValue = Value.from(value);
        }
        // Serialize the dom.Value using the newly instantiated writer
        domValue.writeTo(writer);
        writer.close();
        // Load the serialized version of the value
        let roundTripped = load(writer.getBytes())!;
        // Verify that nothing was lost in the round trip
        assert.isTrue(domValue.ionEquals(roundTripped));
      });
    }
  });
}

/**
 * Tests constructing an Ion dom.Value from a JS value. Verifies that the newly constructed
 * dom.Value has the expected Ion type, the expected JS type, and a value equal to that of jsValue (or
 * `expectValue` instead, if specified).
 *
 * @param jsValue               A JS value to pass to Value.from().
 * @param expectedIonType       The new dom.Value's expected Ion type.
 */
function domValueTest(jsValue, expectedIonType) {
  function validateDomValue(domValue: Value, annotations) {
    let equalityTestValue = jsValue;
    // Verify that the new dom.Value is considered equal to the original (unwrapped) JS value.
    assert.isTrue(
      domValue.equals(equalityTestValue)
    );
    assert.equal(expectedIonType, domValue.getType());
    let expectedDomType: any = JsValueConversion._domConstructorFor(
      expectedIonType
    );
    assert.isTrue(domValue instanceof expectedDomType);
    assert.deepEqual(annotations, domValue.getAnnotations());
  }

  return () => {
    // Test Value.from() with and without specifying annotations
    let annotations = ["foo", "bar", "baz"];
    it("" + jsValue, () => {
      validateDomValue(Value.from(jsValue), []);
    });
    it(annotations.join("::") + "::" + jsValue, () => {
      validateDomValue(Value.from(jsValue, annotations), annotations);
    });
  };
}

describe("Value", () => {
  describe("from()", () => {
    describe("null", domValueTest(null, IonTypes.NULL));
    describe("boolean", domValueTest(true, IonTypes.BOOL));
    describe("Boolean", domValueTest(new Boolean(true), IonTypes.BOOL));
    describe("number (integer)", domValueTest(7, IonTypes.INT));
    describe("Number (integer)", domValueTest(new Number(7), IonTypes.INT));
    describe("BigInt", domValueTest(JSBI.BigInt(7), IonTypes.INT));
    describe("number (floating point)", domValueTest(7.5, IonTypes.FLOAT));
    describe(
      "Number (floating point)",
      domValueTest(new Number(7.5), IonTypes.FLOAT)
    );
    describe("Decimal", domValueTest(new Decimal("7.5"), IonTypes.DECIMAL));
    describe("Date", () => {
      for (let date of [...exampleDatesWhere(), new Date()]) {
        domValueTest(date, IonTypes.TIMESTAMP)();
      }
    });
    describe("Timestamp", () => {
      for (let timestamp of exampleTimestampsWhere()) {
        domValueTest(timestamp, IonTypes.TIMESTAMP)();
      }
    });
    describe("string", domValueTest("Hello", IonTypes.STRING));
    describe("String", domValueTest(new String("Hello"), IonTypes.STRING));
    describe(
      "Blob",
      domValueTest(
        new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
        IonTypes.BLOB
      )
    );
    describe(
      "List",
      domValueTest([9, 8, 7, 6, 5, 4, 3, 2, 1, 0], IonTypes.LIST)
    );
    describe(
      "Struct",
      domValueTest(
        { foo: 7, bar: true, baz: 98.6, qux: "Hello" },
        IonTypes.STRUCT
      )
    );
    describe(
      "List inside Struct",
      domValueTest({ foo: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] }, IonTypes.STRUCT)
    );
    describe(
      "Struct inside List",
      domValueTest(
        [{ foo: 7, bar: true, baz: 98.6, qux: "Hello" }],
        IonTypes.LIST
      )
    );
  });
  describe("instanceof", () => {
    describe("All dom.Value subclasses are instances of dom.Value", () => {
      instanceOfValueTest(true, ...exampleIonValuesWhere());
    });
    describe("No plain Javascript value is an instance of dom.Value", () => {
      instanceOfValueTest(
        false,
        ...exampleJsValuesWhere(),
        Object.create(null)
      );
    });
    for (let subclass of DOM_VALUE_SUBCLASSES) {
      describe(`${subclass.name}`, () => {
        // Javascript values are not instances of any dom.Value subclass
        describe(`Plain Javascript value instanceof dom.${subclass.name}`, () => {
          instanceOfValueSubclassTest(
            subclass,
            false,
            ...exampleJsValuesWhere()
          );
        });
        // Non-null dom.Values whose Ion type matches that of the constructor must be instances of that
        // dom.Value subclass.
        describe(`Non-null ${subclass._getIonType().name} instanceof dom.${
          subclass.name
        }`, () => {
          instanceOfValueSubclassTest(
            subclass,
            true,
            ...exampleIonValuesWhere(
              (value) =>
                (value.isNull() && subclass === dom.Null) ||
                (!value.isNull() && value.getType() === subclass._getIonType())
            )
          );
        });
        // Null dom.Values and those whose Ion type does NOT match that of the constructor must not be instances
        // of that dom.Value subclass.
        describe(`Null or non-${subclass._getIonType().name} instanceof dom.${
          subclass.name
        }`, () => {
          instanceOfValueSubclassTest(
            subclass,
            false,
            ...exampleIonValuesWhere(
              (value) =>
                (value.isNull() && subclass !== dom.Null) ||
                (!value.isNull() && value.getType() !== subclass._getIonType())
            )
          );
        });
      });
    }
  });
  describe("writeTo()", () => {
    domRoundTripTest(
      "Null",
      // isNull() and getType() are already checked in `domRoundTripTest`
      // Test `null` of every Ion type
      ...Object.values(IonTypes).map((ionType) => load("null." + ionType.name)!)
    );
    domRoundTripTest("Boolean", true, false);
    domRoundTripTest(
      "Integer",
      Number.MIN_SAFE_INTEGER,
      -8675309,
      -24601,
      0,
      24601,
      8675309,
      Number.MAX_SAFE_INTEGER
    );
    domRoundTripTest(
      "Float",
      // Supports NaN equality
      Number.NEGATIVE_INFINITY,
      -867.5309,
      -2.4601,
      0.0,
      2.4601,
      867.5309,
      Number.POSITIVE_INFINITY,
      Number.NaN
    );
    domRoundTripTest(
      "Decimal",
      new Decimal("0"),
      new Decimal("1.5"),
      new Decimal("-1.5"),
      new Decimal(".00001"),
      new Decimal("-.00001")
    );
    domRoundTripTest(
      "Timestamp",
      ...exampleDatesWhere(),
      ...exampleTimestampsWhere()
    );
    domRoundTripTest(
      "String",
      "",
      "foo",
      "bar",
      "baz",
      load('foo::bar::baz::"Hello"')
    );
    domRoundTripTest(
      "Symbol",
      load("foo"),
      load("'bar'"),
      load("foo::bar::baz")
    );
    domRoundTripTest(
      "Blob",
      load("{{aGVsbG8gd29ybGQ=}}"),
      load("foo::bar::{{aGVsbG8gd29ybGQ=}}")
    );
    domRoundTripTest(
      "Clob",
      load('{{"February"}}'),
      load('month::{{"February"}}')
    );
    domRoundTripTest(
      "List",
      [],
      [1, 2, 3],
      ["foo", "bar", "baz"],
      [new Date(0), true, "hello", null]
    );
    domRoundTripTest(
      "S-Expression",
      load("()"),
      load("(1 2 3)"),
      load('("foo" "bar" "baz")'),
      load('(1970-01-01T00:00:00.000Z true "hello" null null.struct)')
    );
    domRoundTripTest(
      "Struct",
      {},
      { foo: 5, bar: "baz", qux: true },
      { foo: ["dog", "cat", "mouse"] }
    );
  });
  describe("Large containers", () => {
    const LARGE_CONTAINER_NUM_ENTRIES = 1_000_000;
    let largeJsArray: Value[] = new Array(LARGE_CONTAINER_NUM_ENTRIES);
    let largeJsObject = {};
    for (let i = 0; i < LARGE_CONTAINER_NUM_ENTRIES; i++) {
      let ionValue = Value.from(i);
      largeJsArray[i] = ionValue;
      largeJsObject[i] = ionValue;
    }
    it("List", () => {
      let ionList = Value.from(largeJsArray) as any;
      assert.equal(ionList.getType(), IonTypes.LIST);
      assert.equal(ionList.length, LARGE_CONTAINER_NUM_ENTRIES);
    });
    it("S-Expression", () => {
      let ionSExpression = new dom.SExpression(largeJsArray) as any;
      assert.equal(ionSExpression.getType(), IonTypes.SEXP);
      assert.equal(ionSExpression.length, LARGE_CONTAINER_NUM_ENTRIES);
    });
    it("Struct", function () {
      this.timeout(5_000);
      let ionStruct = Value.from(largeJsObject) as any;
      assert.equal(ionStruct.getType(), IonTypes.STRUCT);
      assert.equal(ionStruct.fields().length, LARGE_CONTAINER_NUM_ENTRIES);
    });
  });
});
