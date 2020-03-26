/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {assert} from 'chai';
import * as ion from '../src/Ion';
import * as IonUnicode from '../src/IonUnicode';
import {TextWriter} from '../src/IonTextWriter';
import {Writeable} from "../src/IonWriteable";

let writerTest = function (name: string, instructions, expected) {
    it(name, () => {
        let writeable = new Writeable();
        let writer = new TextWriter(writeable);
        instructions(writer);
        while (writer.depth() > 0) {
            writer.stepOut();
        }
        writer.close();
        let actual = writeable.getBytes();
        let errorMessage = String.fromCharCode.apply(null, actual) + " != " + expected;
        let encodedExpected = IonUnicode.encodeUtf8(expected);
        assert.deepEqual(actual, encodedExpected, errorMessage);
    });
};

let prettyTest = function (name, instructions, expected) {
    it(name, () => {
        let writer = ion.makePrettyWriter(2);
        instructions(writer);
        while (writer.depth() > 0) {
            writer.stepOut();
        }
        writer.close();
        let buf = writer.getBytes();
        let str = '';
        for (let i = 0; i < buf.length; i++) {
            str += String.fromCharCode(buf[i]);
        }
        let msg = str + " != " + expected;
        assert.deepEqual(str, expected, msg);
    });
};

let badWriterTest = function (name, instructions) {
    let test = function () {
        let writer = ion.makeTextWriter();
        instructions(writer);
        writer.close();
    };
    it(name, () => {
        assert.throws(test, Error);
    });
};

describe("Text Writer", () => {
    describe("Writing blobs", () => {
        writerTest('Writes blob',
            writer => writer.writeBlob([1, 2, 3]),
            '{{AQID}}');
        writerTest('Writes null blob using null',
            writer => writer.writeBlob(null),
            'null.blob');
        writerTest('Writes null blob using type',
            writer => writer.writeNull(ion.IonTypes.BLOB),
            'null.blob');
        writerTest('Writes blob with identifier annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.writeBlob([1, 2, 3])
            },
            'foo::bar::{{AQID}}');
        writerTest('Writes blob with non-identifier annotations',
            writer => {
                writer.setAnnotations(['123abc', '{}']);
                writer.writeBlob([1, 2, 3])
            },
            "'123abc'::'{}'::{{AQID}}");
    });

    describe("Writing booleans", () => {
        writerTest('Writes boolean true',
            writer => writer.writeBoolean(true),
            'true');
        writerTest('Writes boolean false',
            writer => writer.writeBoolean(false),
            'false');
        writerTest('Writes null boolean using null',
            writer => writer.writeBoolean(null),
            'null.bool');
        writerTest('Writes null boolean using type',
            writer => writer.writeNull(ion.IonTypes.BOOL),
            'null.bool');
        writerTest('Writes boolean with annotations',
            writer => {
                writer.setAnnotations(['abc', '123']);
                writer.writeBoolean(true)
            },
            "abc::'123'::true");
    });

    describe("Writing clob", () => {
        writerTest('Writes clob',
            writer => writer.writeClob(['A'.charCodeAt(0)]),
            '{{"A"}}');
        writerTest('Writes null clob using null',
            writer => writer.writeClob(null),
            'null.clob');
        writerTest('Writes null clob using type',
            writer => writer.writeNull(ion.IonTypes.CLOB),
            'null.clob');
        writerTest('Writes clob with annotations',
            writer => {
                writer.setAnnotations(['baz', 'qux']);
                writer.writeClob(['A'.charCodeAt(0)])
            },
            'baz::qux::{{"A"}}');
        writerTest('Writes clob escapes',
            writer => writer.writeClob([0x00, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x22, 0x27, 0x2f, 0x3f, 0x5c]),
            '{{"\\0\\a\\b\\t\\n\\v\\f\\r\\"\\\'\\/\\?\\\\"}}');
    });

    describe("Writing decimals", () => {
        let decimalTest = function (name, decimalString, expected) {
            writerTest(
                name,
                writer => writer.writeDecimal(ion.Decimal.parse(decimalString)),
                expected
            );
        };
        decimalTest('Writes positive decimal', '123.456', '123456d-3');
        decimalTest('Writes negative decimal', '-123.456', '-123456d-3');
        decimalTest('Writes integer decimal', '123456.', '123456d0');
        decimalTest('Mantissa-only decimal has leading zero', '123456d-6', '123456d-6');
        writerTest('Writes null decimal using null',
            writer => writer.writeDecimal(null),
            'null.decimal');
        writerTest('Writes null decimal using type',
            writer => writer.writeNull(ion.IonTypes.DECIMAL),
            'null.decimal');
        writerTest('Writes decimal with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.writeDecimal(ion.Decimal.parse('123.456'))
            },
            'foo::bar::123456d-3');
    });

    describe("Writing floats", () => {
        writerTest('Writes 32-bit float',
            writer => writer.writeFloat32(8.125),
            '8.125e0');
        writerTest('Writes null 32-bit float using null',
            writer => writer.writeFloat32(null),
            'null.float');
        writerTest('Writes 32-bit float with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.writeFloat32(8.125)
            },
            'foo::bar::8.125e0');
        writerTest('Writes negative 32-bit float',
            writer => writer.writeFloat32(-8.125),
            '-8.125e0');
        writerTest('Writes positive 0 as a 32-bit float',
            writer => writer.writeFloat32(0),
            '0e0');
        writerTest('Writes negative 0 as a 32-bit float',
            writer => writer.writeFloat32(-0),
            '-0e0');
        writerTest('Writes nan as a 32-bit float',
            writer => writer.writeFloat32(NaN),
            'nan');
        writerTest('Writes +inf as a 32-bit float',
            writer => writer.writeFloat32(Number.POSITIVE_INFINITY),
            '+inf');
        writerTest('Writes -inf as a 32-bit float',
            writer => writer.writeFloat32(Number.NEGATIVE_INFINITY),
            '-inf');

        writerTest('Writes 64-bit float',
            writer => writer.writeFloat64(8.125),
            '8.125e0');
        writerTest('Writes null 64-bit float using null',
            writer => writer.writeFloat64(null),
            'null.float');
        writerTest('Writes 64-bit float with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.writeFloat64(8.125)
            },
            'foo::bar::8.125e0');
        writerTest('Writes negative 64-bit float',
            writer => writer.writeFloat64(-8.125),
            '-8.125e0');
        writerTest('Writes positive 0 as a 64-bit float',
            writer => writer.writeFloat64(0),
            '0e0');
        writerTest('Writes negative 0 as a 64-bit float',
            writer => writer.writeFloat64(-0),
            '-0e0');
        writerTest('Writes ten billion as a 64-bit float',
            writer => writer.writeFloat64(10000000000),
            '1e10');
        writerTest('Writes nan as a 64-bit float',
            writer => writer.writeFloat64(Number.NaN),
            'nan');
        writerTest('Writes +inf as a 64-bit float',
            writer => writer.writeFloat64(Number.POSITIVE_INFINITY),
            '+inf');
        writerTest('Writes -inf as a 64-bit float',
            writer => writer.writeFloat64(Number.NEGATIVE_INFINITY),
            '-inf');
    });

    describe("Writing ints", () => {
        writerTest('Writes positive int',
            writer => writer.writeInt(123456),
            '123456');
        writerTest('Writes negative int',
            writer => writer.writeInt(-123456),
            '-123456');
        writerTest('Writes null int using null',
            writer => writer.writeInt(null),
            'null.int');
        writerTest('Writes null using type',
            writer => writer.writeNull(ion.IonTypes.INT),
            'null.int');

    });

    describe("Writing lists", () => {
        writerTest('Writes empty list',
            writer => writer.stepIn(ion.IonTypes.LIST),
            '[]');
        writerTest('Writes empty list with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.stepIn(ion.IonTypes.LIST)
            },
            'foo::bar::[]');
        writerTest('Writes nested empty lists',
            writer => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepIn(ion.IonTypes.LIST)
            },
            '[[[]]]');
        writerTest('Writes list with multiple values',
            writer => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.writeSymbol('$');
                writer.writeSymbol('%')
            },
            "[$,'%']");
        writerTest('Writes nested lists with multiple values',
            writer => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.writeSymbol('foo');
                writer.writeSymbol('bar');
                writer.stepIn(ion.IonTypes.LIST);
                writer.writeSymbol('baz');
                writer.writeSymbol('qux');
            },
            '[foo,bar,[baz,qux]]'
        );
    });

    describe("Writing nulls", () => {
        writerTest('Writes null',
            writer => writer.writeNull(ion.IonTypes.NULL),
            'null');
        writerTest('Writes null with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.writeNull(ion.IonTypes.NULL)
            },
            'foo::bar::null');
    });

    describe("Writing s-expressions", () => {
        writerTest('Writes empty sexp',
            writer => writer.stepIn(ion.IonTypes.SEXP),
            '()');
        writerTest('Writes null sexp',
            writer => writer.writeNull(ion.IonTypes.SEXP),
            'null.sexp');
        writerTest('Writes empty sexp with annotations',
            writer => {
                writer.setAnnotations(['foo', 'bar']);
                writer.stepIn(ion.IonTypes.SEXP)
            },
            'foo::bar::()');
        writerTest('Writes sexp with adjacent operators',
            writer => {
                writer.stepIn(ion.IonTypes.SEXP);
                writer.writeSymbol('+');
                writer.writeSymbol('-');
                writer.writeSymbol('/');
            },
            '(+ - /)');
        writerTest('Writes sexp with expression',
            writer => {
                writer.stepIn(ion.IonTypes.SEXP);
                writer.writeSymbol('x');
                writer.writeSymbol('+');
                writer.writeSymbol('y');
            },
            '(x + y)');
    });

    describe("Writing strings", () => {
        writerTest('Writes string containing double quote',
            writer => writer.writeString('"'),
            '"\\""');
        writerTest('Writes string containing null',
            writer => writer.writeString(String.fromCharCode(0)),
            '"\\0"');
        writerTest('Writes string containing control character',
            writer => writer.writeString(String.fromCharCode(1)),
            '"\\x01"');
    });

    describe("Writing structs", () => {
        writerTest('Writes empty struct',
            writer => writer.stepIn(ion.IonTypes.STRUCT),
            '{}');
        writerTest('Writes nested structs',
            writer => {
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('foo');
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.stepOut();
                writer.writeFieldName('bar');
                writer.stepIn(ion.IonTypes.STRUCT);
            },
            '{foo:{},bar:{}}');
        writerTest('Writes struct with non-identifier field name and annotation',
            writer => {
                writer.setAnnotations(['1foo']);
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('123');
                writer.setAnnotations(['2bar']);
                writer.stepIn(ion.IonTypes.STRUCT);
            },
            "'1foo'::{'123':'2bar'::{}}");
        badWriterTest('Cannot write field name at top level',
            writer => writer.writeFieldName('foo'));
        badWriterTest('Cannot write field name inside non-struct',
            writer => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.writeFieldName('foo')
            });
        badWriterTest('Cannot write two adjacent field names',
            writer => {
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('foo');
                writer.writeFieldName('foo')
            });
        badWriterTest('Cannot write value without field name',
            writer => {
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeSymbol('foo')
            });
        badWriterTest('Cannot end struct with missing field value',
            writer => {
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('foo');
                writer.stepOut()
            });
    });

    describe("Writing symbols", () => {
        writerTest('Writes symbol containing single quote',
            writer => writer.writeSymbol("'"),
            "'\\''");
        writerTest('Writes symbol containing null',
            writer => writer.writeSymbol(String.fromCharCode(0)),
            "'\\0'");
        writerTest('Writes symbol containing control character',
            writer => writer.writeSymbol(String.fromCharCode(1)),
            "'\\x01'");
    });

    describe("Writing annotations", () => {
        badWriterTest('Should throw when setting annotations to null',
            (writer) => { writer.setAnnotations(null); writer.writeInt(5) });

        badWriterTest('Should throw when passing single string as an annotation.',
            (writer) => { writer.setAnnotations('taco'), writer.writeInt(5) });
        badWriterTest('Should throw when adding int as annotation.',
            (writer) => { writer.addAnnotation(5), writer.writeInt(5) });
        badWriterTest('Should throw when adding array of chars.',
            (writer) => { writer.addAnnotation(['t', 'a', 'c', 'o']), writer.writeInt(5) });
        badWriterTest('Should throw when adding a non string annotation.',
            (writer) => { writer.addAnnotation(null), writer.writeInt(5) });
        badWriterTest('Should throw when adding a non string annotation.',
            (writer) => { writer.addAnnotation(undefined), writer.writeInt(5) });
        badWriterTest('Should throw when passing annotations array without a string.',
            (writer) => { writer.setAnnotations([5]), writer.writeInt(5) });
        badWriterTest('Should throw when passing annotations array containing a non string value.',
            (writer) => { writer.setAnnotations(['a', 5,'t']), writer.writeInt(5) });
        badWriterTest('Should throw when passing annotations array containing undefined.',
            (writer) => { writer.setAnnotations([undefined]), writer.writeInt(5) });
        badWriterTest('Should throw when passing annotations array containing null',
            (writer) => { writer.setAnnotations([null]), writer.writeInt(5) });
        badWriterTest('Should throw when passing undefined as annotations.',
            (writer) => { writer.setAnnotations(undefined), writer.writeInt(5) });
        badWriterTest('Should throw when writing top-level field name',
            (writer) => { writer.writeFieldName('foo') });
        badWriterTest('Should throw when exiting a container at top level',
            (writer) => { writer.stepOut() });
        badWriterTest('Should throw when double-exiting a container',
            (writer) => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepOut();
                writer.stepOut();
            });
    });

    describe("Writing timestamps", () => {
        let timestampTest = function (name, timestamp, expected) {
            writerTest(
                name,
                writer => writer.writeTimestamp(ion.Timestamp.parse(timestamp)),
                expected
            );
        };

        timestampTest('Writes year timestamp', '2017T', '2017T');
        timestampTest('Writes month timestamp', '2017-02T', '2017-02T');
        timestampTest('Writes day timestamp', '2017-02-01', '2017-02-01T');
        timestampTest('Writes hour and minute timestamp', '2017-02-01T22:38+00:00', '2017-02-01T22:38Z');
        timestampTest('Writes whole second timestamp', '2017-02-01T22:38:43+00:00', '2017-02-01T22:38:43Z');
        timestampTest('Writes fractional second timestamp', '2017-02-01T22:38:43.125Z', '2017-02-01T22:38:43.125Z');

        timestampTest('Writes positive offset timestamp', '2017-02-01T22:38+08:00', '2017-02-01T22:38+08:00');
        timestampTest('Writes negative offset timestamp', '2017-02-01T22:38-08:00', '2017-02-01T22:38-08:00');
        timestampTest('Writes zulu offset timestamp', '2017-02-01T22:38Z', '2017-02-01T22:38Z');
    });

    describe("Writing datagrams", () => {
        writerTest('Writes two top-level symbols',
            writer => {
                writer.writeSymbol('a');
                writer.writeSymbol('b')
            },
            'a\nb');
        writerTest('Writes two top-level lists',
            writer => {
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepOut();
                writer.stepIn(ion.IonTypes.LIST)
            },
            '[]\n[]');
        writerTest('Writes two top-level lists with annotations',
            writer => {
                writer.setAnnotations(['foo']);
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepOut();
                writer.setAnnotations(['bar']);
                writer.stepIn(ion.IonTypes.LIST);
            },
            'foo::[]\nbar::[]');
        writerTest('Writes two top-level structs',
            writer => {
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.stepOut();
                writer.stepIn(ion.IonTypes.STRUCT)
            },
            '{}\n{}');
    });

    describe("Pretty printing", () => {
        prettyTest('Writes composite pretty ion',
            writer => {
                writer.setAnnotations(['a1']);
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('int');
                writer.setAnnotations(['a3']);
                writer.writeInt(123);
                writer.writeFieldName('string');
                writer.setAnnotations(['a4']);
                writer.writeString('string');
                writer.writeFieldName('symbol');
                writer.setAnnotations(['a5']);
                writer.writeSymbol('symbol');
                writer.writeFieldName('symbol');
                writer.writeNull(ion.IonTypes.SYMBOL);
                writer.writeFieldName('timestamp');
                writer.setAnnotations(['a8']);
                writer.writeTimestamp(ion.Timestamp.parse('2017-04-03T00:00:00.000Z'));
                writer.writeFieldName('decimal');
                writer.setAnnotations(['a9']);
                writer.writeDecimal(ion.Decimal.parse('1.2'));
                writer.writeFieldName('struct');
                writer.setAnnotations(['a10']);
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.writeFieldName('symbol');
                writer.setAnnotations(['a11']);
                writer.writeSymbol('symbol');
                writer.stepOut();
                writer.writeFieldName('list');
                writer.setAnnotations(['a12']);
                writer.stepIn(ion.IonTypes.LIST);
                writer.setAnnotations(['a14']);
                writer.writeInt(123);
                writer.setAnnotations(['a15']);
                writer.writeString('string');
                writer.setAnnotations(['a16']);
                writer.writeSymbol('symbol');
                writer.setAnnotations(['a19']);
                writer.writeTimestamp(ion.Timestamp.parse('2017-04-03T00:00:00.000Z'));
                writer.setAnnotations(['a20']);
                writer.writeDecimal(ion.Decimal.parse('1.2'));
                writer.setAnnotations(['a21']);
                writer.stepIn(ion.IonTypes.STRUCT);
                writer.stepOut();
                writer.setAnnotations(['a22']);
                writer.stepIn(ion.IonTypes.LIST);
                writer.stepOut();
                writer.stepOut();
                writer.writeFieldName('sexp');
                writer.setAnnotations(['a23']);
                writer.stepIn(ion.IonTypes.SEXP);
                writer.setAnnotations(['a24']);
                writer.writeNull(ion.IonTypes.SYMBOL);
                writer.setAnnotations(['a25']);
                writer.writeNull(ion.IonTypes.STRING);
                writer.setAnnotations(['a26']);
                writer.writeNull(ion.IonTypes.NULL);
                writer.stepOut();
            },
            `a1::{
  int:a3::123,
  string:a4::"string",
  symbol:a5::symbol,
  symbol:null.symbol,
  timestamp:a8::2017-04-03T00:00:00.000Z,
  decimal:a9::12d-1,
  struct:a10::{
    symbol:a11::symbol
  },
  list:a12::[
    a14::123,
    a15::"string",
    a16::symbol,
    a19::2017-04-03T00:00:00.000Z,
    a20::12d-1,
    a21::{
    },
    a22::[
    ]
  ],
  sexp:a23::(
    a24::null.symbol 
    a25::null.string 
    a26::null
  )
}`);
    });
});
