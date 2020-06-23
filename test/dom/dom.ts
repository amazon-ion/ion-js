import {assert} from "chai";
import JSBI from "jsbi";
import * as ion from "../../src/Ion";
import {IonTypes} from "../../src/Ion";
import {Value, load, loadAll} from "../../src/dom";
import {encodeUtf8} from "../../src/IonUnicode";

/**
 * This file contains two tests for each Ion data type:
 *   1.  'load() _______ as Value'
 *       Demonstrates interacting with DOM nodes via the strongly-typed 'Value' interface.
 *   2.  'load() _______ as any'
 *       Demonstrates interacting with DOM nodes without type information (by casting them as 'any').
 *
 * A 'kitchen sink' example that loads a multi-value, heterogeneous Ion stream is also provided.
 */

describe('DOM', () => {
   it('load() kitchen sink as Value[]', () => {
      let values: Value[] = loadAll(
            ' 7' +
            ' greeting::"Hello"' +
            ' [\'moose\', null.string]' +
            ' 5e1' +
            ' {a: 2.1, b: 4, c: [foo, (bar baz), "qux"]}' +
            ' 1970-01-01T00:00:00.000Z'
      )!;

      // 7
      assert.equal(7, values[0].numberValue());

      // greeting::"Hello"
      assert.equal('Hello', values[1].stringValue());
      assert.deepEqual(['greeting'], values[1].getAnnotations());

      // ['moose', null.string]
      assert.equal('moose', values[2].get(0)!.stringValue());
      assert.isTrue(values[2].get(1)!.isNull());
      assert.equal(IonTypes.STRING, values[2].get(1)!.getType());

      // 5e1
      assert.equal(50, values[3].numberValue());

      // {a: 2.1, b: 4, c: [foo, (bar baz), "qux"]}
      assert.equal(2.1, +values[4].get('a')!);
      assert.equal(4, +values[4].get('b')!);
      assert.equal('foo', ''+values[4].get('c')!.get(0));
      assert.equal('bar', ''+values[4].get('c', 1, 0));
      assert.equal('baz', ''+values[4].get('c', 1, 1));
      assert.equal('qux', ''+values[4].get('c', 2));

      // 1970-01-01T00:00:00.000Z
      assert.equal(new Date(0).getTime(), values[5].dateValue()!.getTime());
   });

   it('load() kitchen sink as any[]', () => {
      // This test casts each Ion value as an `any`, allowing each to be interacted with as a plain JS value.
      let values: any[] = loadAll(
          ' 7' +
          ' greeting::"Hello"' +
          ' [\'moose\', null.string]' +
          ' 5e1' +
          ' {a: 2.1, b: 4, c: [foo, (bar baz), "qux"]}' +
          ' 1970-01-01T00:00:00.000Z'
      )!;

      // 7
      assert.equal(7, values[0]);

      // greeting::"Hello"
      assert.equal('Hello', values[1]);
      assert.deepEqual(['greeting'], values[1].getAnnotations());

      // ['moose', null.string]
      assert.equal('moose', values[2][0]);
      assert.isTrue(values[2][1].isNull());
      assert.equal(IonTypes.STRING, values[2][1].getType());

      // 5e1
      assert.equal(50, values[3]);

      // {a: 2.1, b: 4, c: [foo, (bar baz), "qux"]}
      assert.equal(2.1, values[4].a);
      assert.equal(4, values[4]['b']);
      assert.equal('foo', values[4].c[0]);
      assert.equal('bar', values[4].c[1][0]);
      assert.equal('baz', values[4].c[1][1]);
      assert.equal('qux', values[4].c[2]);

      // 1970-01-01T00:00:00.000Z
      assert.equal(new Date(0).getTime(), values[5].getTime());
   });

   it('load() Null as Value', () => {
      let n = load('null.blob')!;

      assert.isTrue(n.isNull());
      assert.isNull(n.uInt8ArrayValue());
      assert.equal(IonTypes.BLOB, n.getType());
      assert.isTrue(n instanceof ion.dom.Null);

      assert.throws(() => n.booleanValue());
      assert.throws(() => n.numberValue());
      assert.throws(() => n.bigIntValue());
      assert.throws(() => n.decimalValue());
      assert.throws(() => n.stringValue());
      assert.throws(() => n.dateValue());
      assert.throws(() => n.fieldNames());
      assert.throws(() => n.fields());
      assert.throws(() => n.elements());
   });

   // load() `Null` as `any` would be identical to the above.

   it('load() Boolean as Value', () => {
      let b: Value = load('false')!;

      assert.equal(false, b.booleanValue()!);
      assert.equal(false, b.valueOf());
      // Because ion.dom.Boolean is a class representation of a boolean, it does not behave like the
      // primitive boolean type in some cases. See the class-level documentation for details.
      assert.equal(true, !!b);
   });

   it('load() Boolean as any', () => {
      let b: any = load('false')!;

      assert.equal(false, b.booleanValue()!);
      assert.equal(false, b.valueOf());
      // Because ion.dom.Boolean is a class representation of a boolean, it does not behave like the
      // primitive boolean type in some cases. See the class-level documentation for details.
      assert.equal(true, !!b);
      assert.isTrue(b !== false);
      assert.isTrue(b == false);
      assert.isTrue(!!b);

      if (b === false) {
         assert.fail(null, null, 'Unreachable. b === false is not considered true.');
      }

      if (!b) {
         assert.fail(null, null, 'Unreachable. !b is not considered true.');
      }
   });

   it('load() Integer as Value', () => {
      let i: Value = load('foo::bar::7')!;

      assert.equal(IonTypes.INT, i.getType());
      assert.deepEqual(['foo', 'bar'], i.getAnnotations());

      assert.equal(7, +i);
      assert.equal(7, i.numberValue());

      assert.isTrue(7 == +i);
      assert.isTrue(7 === +i);
      assert.isTrue(7 == i.numberValue());
      assert.isTrue(7 === i.numberValue());

      assert.isTrue(
          JSBI.equal(
              JSBI.BigInt(7),
              i.bigIntValue()!
          )
      );
   });

   it('load() Integer as any', () => {
      let i: any = load('foo::bar::7')!;

      assert.equal(IonTypes.INT, i.getType());
      assert.deepEqual(['foo', 'bar'], i.getAnnotations());

      assert.equal(8, i + 1);
      assert.equal(49, i ** 2);
      assert.equal(1, i / 7);
      assert.equal(1, i / i);
      assert.equal(14, i + i);
      assert.equal(128, Math.pow(2, i));

      assert.isTrue(
          JSBI.equal(
              JSBI.BigInt(7),
              i.bigIntValue()
          )
      );
   });

   it('load() Float as Value', () => {
      let f: Value = load('baz::qux::15e-1')!;

      assert.equal(IonTypes.FLOAT, f.getType());
      assert.deepEqual(['baz', 'qux'], f.getAnnotations());

      assert.equal(1.5, +f);
      assert.equal(1.5, f.numberValue());

      assert.isTrue(1.5 == +f);
      assert.isTrue(1.5 === +f);
      assert.isTrue(1.5 == f.numberValue());
      assert.isTrue(1.5 === f.numberValue());
   });

   it('load() Float as any', () => {
      let f: any = load('baz::qux::15e-1')!;

      assert.equal(IonTypes.FLOAT, f.getType());
      assert.deepEqual(['baz', 'qux'], f.getAnnotations());

      assert.equal(2.5, f + 1);
      assert.equal(2.25, f ** 2);
      assert.equal(1, f / 1.5);
      assert.equal(1, f / f);
      assert.equal(3, f + f);
      assert.equal(2 ** 1.5, Math.pow(2, f));
   });

   it('load() Decimal as Value', () => {
      let d: Value = load('101.5')!;

      assert.equal(IonTypes.DECIMAL, d.getType());

      assert.equal(101.5, +d);
      assert.equal(101.5, d.numberValue());
      assert.isTrue(new ion.Decimal('101.5').equals(d.decimalValue()!));
      assert.equal(1015, +d.decimalValue()!.getCoefficient());
   });

   it('load() Decimal as any', () => {
      let d: any = load('101.5')!;

      assert.equal(IonTypes.DECIMAL, d.getType());

      assert.equal(101.5, d);
      assert.equal(101.5, +d);
      assert.isTrue(new ion.Decimal('101.5').equals(d.decimalValue()));
      assert.equal(1015, +d.decimalValue()!.getCoefficient());
   });

   it('load() Timestamp as Value', () => {
      let t: Value = load('DOB::2020-01-16T20:15:54.066Z')!;

      assert.equal(IonTypes.TIMESTAMP, t.getType());
      assert.deepEqual(['DOB'], t.getAnnotations());

      assert.equal(
          new Date('2020-01-16T20:15:54.066Z').getTime(),
          t.dateValue()!.getTime()
      );
   });

   it('load() Timestamp as any', () => {
      let t: any = load('DOB::2020-01-16T20:15:54.066Z')!;

      assert.equal(IonTypes.TIMESTAMP, t.getType());
      assert.deepEqual(['DOB'], t.getAnnotations());

      assert.equal(
          new Date('2020-01-16T20:15:54.066Z').getTime(),
          t.getTime()
      );
   });

   it('load() Symbol as Value', () => {
      let s: Value = load('foo::bar::"Saturn"')!;

      assert.equal(IonTypes.STRING, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      assert.equal('Saturn', ''+s);
      assert.equal('Saturn', s+'');
      assert.equal('Saturn' + ', Jupiter', s + ', Jupiter');
      assert.equal('Saturn'.substr(4), (''+s).substr(4));
      assert.equal('Saturn'.substr(4), s.stringValue()!.substr(4));
   });

   it('load() Symbol as any', () => {
      let s: any = load('foo::bar::"Saturn"')!;

      assert.equal(IonTypes.STRING, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      assert.equal('Saturn', s);
      assert.equal('Saturn' + ', Jupiter', s + ', Jupiter');
      assert.equal('Saturn'.substr(4), s.substr(4));
   });

   it('load() String as Value', () => {
      let s: Value = load('foo::bar::"Saturn"')!;

      assert.equal(IonTypes.STRING, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      assert.equal('Saturn', ''+s);
      assert.equal('Saturn', s+'');
      assert.equal('Saturn' + ', Jupiter', s + ', Jupiter');
      assert.equal('Saturn'.substr(4), (''+s).substr(4));
      assert.equal('Saturn'.substr(4), s.stringValue()!.substr(4));
   });

   it('load() String as any', () => {
      let s: any = load('foo::bar::"Saturn"')!;

      assert.equal(IonTypes.STRING, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      assert.equal('Saturn', s);
      assert.equal('Saturn' + ', Jupiter', s + ', Jupiter');
      assert.equal('Saturn'.substr(4), s.substr(4));
   });

   it('load() Clob as Value', () => {
      let c: Value = load('month::{{"February"}}')!;

      assert.equal(IonTypes.CLOB, c.getType());
      assert.deepEqual(['month'], c.getAnnotations());

      assert.deepEqual(encodeUtf8("February"), c.uInt8ArrayValue()!);
   });

   it('load() Clob as any', () => {
      let c: any = load('month::{{"February"}}')!;

      assert.equal(IonTypes.CLOB, c.getType());
      assert.deepEqual(['month'], c.getAnnotations());

      assert.deepEqual(encodeUtf8("February"), c);
   });

   it('load() Blob as Value', () => {
      let b: Value = load('quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}')!;

      assert.equal(IonTypes.BLOB, b.getType());
      assert.deepEqual(['quote'], b.getAnnotations());

      assert.deepEqual(encodeUtf8("To infinity... and beyond!"), b.uInt8ArrayValue());
   });

   it('load() Blob as any', () => {
      let b: any = load('quote::{{VG8gaW5maW5pdHkuLi4gYW5kIGJleW9uZCE=}}')!;

      assert.equal(IonTypes.BLOB, b.getType());
      assert.deepEqual(['quote'], b.getAnnotations());

      assert.deepEqual(encodeUtf8("To infinity... and beyond!"), b);
   });

   it('load() List as Value', () => {
      let l: Value = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;

      assert.equal(IonTypes.LIST, l.getType());
      assert.deepEqual(['planets'], l.getAnnotations());

      // Iteration
      for (let planet of l.elements()!) {
         assert.isNotNull(planet.stringValue());
      }

      // Indexing
      assert.equal("Mercury", l.get(0)?.stringValue());
      assert.equal("Venus", l.get(1)?.stringValue());
      assert.equal("Earth",l.get(2)?.stringValue());
      assert.equal("Mars", l.get(3)?.stringValue());

      let planets: string[] = l.elements().map(s => s.stringValue()!);
      assert.equal(4, planets.length);
   });

   it('load() List as any', () => {
      let l: any = load('planets::["Mercury", "Venus", "Earth", "Mars"]')!;

      assert.equal(IonTypes.LIST, l.getType());
      assert.deepEqual(['planets'], l.getAnnotations());

      // Iteration
      for (let planet of l) {
         assert.isTrue(planet instanceof String);
      }

      // Indexing
      assert.equal("Mercury", l[0]);
      assert.equal("Venus", l[1]);
      assert.equal("Earth", l[2]);
      assert.equal("Mars", l[3]);

      assert.equal(4, l.length);

      // Directly use Array methods
      assert.isTrue(l.findIndex(s => s == "Earth") > 0);
      assert.isNotNull(l.find(s => s == "Earth"));
   });

   it('load() SExpression as Value', () => {
      let s: Value = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;

      assert.equal(IonTypes.SEXP, s.getType());
      assert.deepEqual(['planets'], s.getAnnotations());

      // Iteration
      for (let planet of s.elements()!) {
         assert.isNotNull(planet.stringValue());
      }

      // Indexing
      assert.equal("Mercury", s.get(0)?.stringValue());
      assert.equal("Venus", s.get(1)?.stringValue());
      assert.equal("Earth",s.get(2)?.stringValue());
      assert.equal("Mars", s.get(3)?.stringValue());

      let planets: string[] = s.elements().map(s => s.stringValue()!);
      assert.equal(4, planets.length);
   });

   it('load() SExpression as any', () => {
      let s: any = load('planets::("Mercury" "Venus" "Earth" "Mars")')!;

      assert.equal(IonTypes.SEXP, s.getType());
      assert.deepEqual(['planets'], s.getAnnotations());

      // Iteration
      for (let planet of s) {
         assert.isTrue(planet instanceof String);
      }

      // Indexing
      assert.equal("Mercury", s[0]);
      assert.equal("Venus", s[1]);
      assert.equal("Earth", s[2]);
      assert.equal("Mars", s[3]);

      assert.equal(4, s.length);

      // Directly use Array methods
      assert.isTrue(s.findIndex(s => s == "Earth") > 0);
      assert.isNotNull(s.find(s => s == "Earth"));
   });

   it('load() Struct as Value', () => {
      let s: Value = load(
          'foo::bar::{' +
            'name: {' +
               'first: "John", ' +
               'middle: "Jacob", ' +
               'last: "Jingleheimer-Schmidt",' +
            '},' +
            'age: 41' +
          '}'
      )!;

      assert.equal(IonTypes.STRUCT, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      // Field access
      assert.equal("Jacob", s.get("name")!.get("middle")!.stringValue());
      assert.equal("Jacob", s.get("name", "middle")!.stringValue());

      // Iteration
      for (let [fieldName, value] of s.fields()) {
         assert.isTrue(typeof fieldName === "string");
         assert.isTrue(fieldName.length > 0);
         assert.isFalse(value.isNull());
      }

      assert.equal(2, s.fields().length);
   });

   it('load() Struct as any', () => {
      let s: any = load(
          'foo::bar::{' +
          'name: {' +
          'first: "John", ' +
          'middle: "Jacob", ' +
          'last: "Jingleheimer-Schmidt",' +
          '},' +
          'age: 41' +
          '}'
      )!;

      assert.equal(IonTypes.STRUCT, s.getType());
      assert.deepEqual(['foo', 'bar'], s.getAnnotations());

      // Field access
      assert.equal("Jacob", s.name.middle);
      assert.equal("Jacob", s["name"]["middle"]);

      // Iteration
      for (let [fieldName, value] of s) {
         assert.isTrue(typeof fieldName === "string");
         assert.isTrue(fieldName.length > 0);
         assert.isFalse(value.isNull());
      }

      assert.equal(2, s.fields().length)
   });
});