/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
 define(
  function(require) {
    const registerSuite = require('intern!object');
    const assert = require('intern/chai!assert');
    const ion = require('dist/amd/es6/Ion');
    const ionTextWriter = require('dist/amd/es6/IonTextWriter');
    const ionUnicode = require('dist/amd/es6/IonUnicode');
    const ionTest = require('dist/amd/es6/IonTests')

    var suite = {
      name: 'Text Writer'
    };

    var writerTest = function(name, instructions, expected) {
      suite[name] = function() {
        var writeable = new ionTest.Writeable();
        var writer = new ionTextWriter.TextWriter(writeable);
        instructions(writer);
        writer.close();
        var actual = writeable.getBytes();
        var errorMessage = String.fromCharCode.apply(null, actual) + " != " + expected;
        var encodedExpected = ionUnicode.encodeUtf8(expected);
        assert.deepEqual(actual, encodedExpected, errorMessage);
      }
    }

    var badWriterTest = function(name, instructions) {
      var test = function() {
        var writer = new ion.makeTextWriter();
        instructions(writer);
        writer.close();
      };
      suite[name] = function() {
        assert.throws(test, Error);
      }
    }

    // Blobs

    writerTest('Writes blob',
      writer => writer.writeBlob([1, 2, 3]),
      '{{AQID}}');
    writerTest('Writes null blob using null',
      writer => writer.writeBlob(null),
      'null.blob');
    writerTest('Writes null blob using undefined',
      writer => writer.writeBlob(),
      'null.blob');
    writerTest('Writes null blob using type',
      writer => writer.writeNull(ion.TypeCodes.BLOB),
      'null.blob');
    writerTest('Writes blob with identifier annotations',
      writer => writer.writeBlob([1, 2, 3], ['foo', 'bar']),
      'foo::bar::{{AQID}}');
    writerTest('Writes blob with non-identifier annotations',
      writer => writer.writeBlob([1, 2, 3], ['123abc', '{}']),
      "'123abc'::'{}'::{{AQID}}");

    // Booleans

    writerTest('Writes boolean true',
      writer => writer.writeBoolean(true),
      'true');
    writerTest('Writes boolean false',
      writer => writer.writeBoolean(false),
      'false');
    writerTest('Writes null boolean using null',
      writer => writer.writeBoolean(null),
      'null.bool');
    writerTest('Writes null boolean using undefined',
      writer => writer.writeBoolean(),
      'null.bool');
    writerTest('Writes null boolean using type',
      writer => writer.writeNull(ion.TypeCodes.BOOL),
      'null.bool');
    writerTest('Writes boolean with annotations',
      writer => writer.writeBoolean(true, ['abc', '123']),
      "abc::'123'::true");

    // Clobs

    writerTest('Writes clob',
      writer => writer.writeClob(['A'.charCodeAt(0)]),
      '{{"A"}}');
    writerTest('Writes null clob using null',
      writer => writer.writeClob(null),
      'null.clob'); 
    writerTest('Writes null clob using undefined',
      writer => writer.writeClob(),
      'null.clob'); 
    writerTest('Writes null clob using type',
      writer => writer.writeNull(ion.TypeCodes.CLOB),
      'null.clob'); 
    writerTest('Writes clob with annotations',
      writer => writer.writeClob(['A'.charCodeAt(0)], ['baz', 'qux']),
      'baz::qux::{{"A"}}');
    writerTest('Writes clob escapes',
      writer => writer.writeClob([0x00, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x22, 0x27, 0x2f, 0x3f, 0x5c]),
      '{{"\\0\\a\\b\\t\\n\\v\\f\\r\\"\\\'\\/\\?\\\\"}}');
    badWriterTest('Rejects clob with non-ASCII character',
      writer => writer.writeClob([128]));

    // Decimals

    var decimalTest = function(name, decimalString, expected) {
      writerTest(name,
        writer => writer.writeDecimal(ion.Decimal.parse(decimalString)),
        expected);
    }

    decimalTest('Writes positive decimal', '123.456', '123.456');
    decimalTest('Writes negative decimal', '-123.456', '-123.456');
    decimalTest('Writes integer decimal', '123456', '123456');
    decimalTest('Mantissa-only decimal has leading zero', '123456d-6', '0.123456');
    writerTest('Writes null decimal using null',
      writer => writer.writeDecimal(null),
      'null.decimal');
    writerTest('Writes null decimal using undefined',
      writer => writer.writeDecimal(),
      'null.decimal');
    writerTest('Writes null decimal using type',
      writer => writer.writeNull(ion.TypeCodes.DECIMAL),
      'null.decimal');
    writerTest('Writes decimal with annotations',
      writer => writer.writeDecimal(ion.Decimal.parse('123.456'), ['foo', 'bar']),
      'foo::bar::123.456');

    // Floats

    writerTest('Writes 32-bit float',
      writer => writer.writeFloat32(8.125),
      '8.125');
    writerTest('Writes null 32-bit float using null',
      writer => writer.writeFloat32(null),
      'null.float');
    writerTest('Writes null 32-bit float using undefined',
      writer => writer.writeFloat32(),
      'null.float');
    writerTest('Writes 32-bit float with annotations',
      writer => writer.writeFloat32(8.125, ['foo', 'bar']),
      'foo::bar::8.125');
    writerTest('Writes negative 32-bit float',
      writer => writer.writeFloat32(-8.125),
      '-8.125');

    // Ints

    writerTest('Writes positive int',
      writer => writer.writeInt(123456),
      '123456');
    writerTest('Writes negative int',
      writer => writer.writeInt(-123456),
      '-123456');
    writerTest('Writes null int using null',
      writer => writer.writeInt(null),
      'null.int');
    writerTest('Writes null int using undefined',
      writer => writer.writeInt(),
      'null.int');
    writerTest('Writes null using type',
      writer => writer.writeNull(ion.TypeCodes.POSITIVE_INT),
      'null.int');

    // Lists

    writerTest('Writes empty list',
      writer => writer.writeList(),
      '[]');
    writerTest('Writes empty list with annotations',
      writer => writer.writeList(['foo', 'bar']),
      'foo::bar::[]');
    writerTest('Writes nested empty lists',
      writer => { writer.writeList(); writer.writeList(); writer.writeList() },
      '[[[]]]');
    writerTest('Writes list with multiple values',
      writer => { writer.writeList(); writer.writeSymbol('$'); writer.writeSymbol('%') },
      "[$,'%']");
    writerTest('Writes nested lists with multiple values',
      writer => {
        writer.writeList();
        writer.writeSymbol('foo');
        writer.writeSymbol('bar');
        writer.writeList();
        writer.writeSymbol('baz');
        writer.writeSymbol('qux');
      },
      '[foo,bar,[baz,qux]]');

    // Nulls

    writerTest('Writes null',
      writer => writer.writeNull(ion.TypeCodes.NULL),
      'null.null');
    writerTest('Writes null with annotations',
      writer => writer.writeNull(ion.TypeCodes.NULL, ['foo', 'bar']),
      'foo::bar::null.null');

    // S-Expressions

    writerTest('Writes empty sexp',
      writer => writer.writeSexp(),
      '()');
    writerTest('Writes null sexp',
      writer => writer.writeNull(ion.TypeCodes.SEXP),
      'null.sexp');
    writerTest('Writes empty sexp with annotations',
      writer => writer.writeSexp(['foo', 'bar']),
      'foo::bar::()');
    writerTest('Writes sexp with adjacent operators',
      writer => {
        writer.writeSexp();
        writer.writeSymbol('+');
        writer.writeSymbol('-');
        writer.writeSymbol('/');
      },
      '(+ - /)');
    writerTest('Writes sexp with expression',
      writer => {
        writer.writeSexp();
        writer.writeSymbol('x');
        writer.writeSymbol('+');
        writer.writeSymbol('y');
      },
      '(x + y)');

    // Strings

    writerTest('Writes string containing double quote',
      writer => writer.writeString('"'),
      '"\\""');
    writerTest('Writes string containing null',
      writer => writer.writeString(String.fromCharCode(0)),
      '"\\0"');
    writerTest('Writes string containing control character',
      writer => writer.writeString(String.fromCharCode(1)),
      '"\\u0001"');

    // Structs

    writerTest('Writes empty struct',
      writer => writer.writeStruct(),
      '{}');
    writerTest('Writes nested structs',
      writer => {
        writer.writeStruct();
        writer.writeFieldName('foo');
        writer.writeStruct();
        writer.endContainer();
        writer.writeFieldName('bar');
        writer.writeStruct();
      },
      '{foo:{},bar:{}}');
    writerTest('Writes struct with non-identifier field name and annotation',
      writer => {
        writer.writeStruct(['1foo']);
        writer.writeFieldName('123');
        writer.writeStruct(['2bar']);
     },
     "'1foo'::{'123':'2bar'::{}}");
    badWriterTest('Cannot write field name at top level',
      writer => writer.writeFieldName('foo'));
    badWriterTest('Cannot write field name inside non-struct',
      writer => { writer.writeList(); writer.writeFieldName('foo') });
    badWriterTest('Cannot write two adjacent field names',
      writer => { writer.writeStruct(); writer.writeFieldName('foo'); writer.writeFieldName('foo') });
    badWriterTest('Cannot write value without field name',
      writer => { writer.writeStruct(); writer.writeSymbol('foo') });
    badWriterTest('Cannot end struct with missing field value',
      writer => { writer.writeStruct(); writer.writeFieldName('foo'); writer.endContainer() });

    // Symbols

    writerTest('Writes symbol containing single quote',
      writer => writer.writeSymbol("'"),
      "'\\''");
    writerTest('Writes symbol containing null',
      writer => writer.writeSymbol(String.fromCharCode(0)),
      "'\\0'");
    writerTest('Writes symbol containing control character',
      writer => writer.writeSymbol(String.fromCharCode(1)),
      "'\\u0001'");

    // Timestamps

    var timestampTest = function(name, timestamp, expected) {
      writerTest(name,
        writer => {
          var parsed = ion.Timestamp.parse(timestamp);
          writer.writeTimestamp(parsed);
        },
        expected);
    };

    timestampTest('Writes year timestamp', '2017T', '2017T');
    timestampTest('Writes month timestamp', '2017-02T', '2017-02T');
    timestampTest('Writes day timestamp', '2017-02-01', '2017-02-01');
    timestampTest('Writes hour and minute timestamp', '2017-02-01T22:38', '2017-02-01T22:38Z');
    timestampTest('Writes whole second timestamp', '2017-02-01T22:38:43', '2017-02-01T22:38:43Z');
    timestampTest('Writes fractional second timestamp', '2017-02-01T22:38:43.125', '2017-02-01T22:38:43.125Z');

    timestampTest('Writes positive offset timestamp', '2017-02-01T22:38+08:00', '2017-02-01T22:38+08:00');
    timestampTest('Writes negative offset timestamp', '2017-02-01T22:38-08:00', '2017-02-01T22:38-08:00');
    timestampTest('Writes zulu offset timestamp', '2017-02-01T22:38Z', '2017-02-01T22:38Z');

    // Datagrams

    writerTest('Writes two top-level symbols',
      writer => { writer.writeSymbol('a'); writer.writeSymbol('b') },
      'a\nb');
    writerTest('Writes two top-level lists',
      writer => { writer.writeList(); writer.endContainer(); writer.writeList() },
      '[]\n[]');
    writerTest('Writes two top-level lists with annotations',
      writer => { writer.writeList(['foo']); writer.endContainer(); writer.writeList(['bar']) },
      'foo::[]\nbar::[]');
    writerTest('Writes two top-level structs',
      writer => { writer.writeStruct(); writer.endContainer(); writer.writeStruct() },
      '{}\n{}');

    registerSuite(suite);
  }
);
