/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
  ],
  function(intern, registerSuite, assert, ion) {

    var suite = {
      name: 'Binary Writer'
    };

    var ivm = [0xe0, 0x01, 0x00, 0xea];

    var createWriter = function(writeable) {
        var symbolTable = new ion.LocalSymbolTable(ion.getSystemSymbolTableImport());
        return new ion.BinaryWriter(symbolTable, writeable);
    }

    var writerTest = function(name, instructions, expected) {
      suite[name] = function() {
        var symbolTable = new ion.LocalSymbolTable(ion.getSystemSymbolTableImport());
        var writeable = new ion.Writeable();
        var writer = new ion.BinaryWriter(symbolTable, writeable);
        instructions(writer);
        writer.close();
        var actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(ivm.concat(expected)));
      }
    }

    var skippedWriterTest = function(name, instructions, expected) { suite[name] = function() { this.skip() } };

    writerTest('Writes IVM', (writer) => {}, []);

    // Blobs

    writerTest('Writes blob',
      (writer) => { writer.writeBlob(new Uint8Array([1, 2, 3])) },
        [0xa3, 1, 2, 3]);
    writerTest('Writes null blob 1',
      (writer) => { writer.writeBlob(null) },
        [0xaf]);
    writerTest('Writes null blob 2',
      (writer) => { writer.writeNull(ion.TypeCodes.BLOB) },
        [0xaf]);
    writerTest('Writes blob with annotation',
      (writer) => { writer.writeBlob(new Uint8Array([1]), ['a']) },
        [
        // '$ion_symbol_table'::
        0xe7,
        0x81,
        0x83,
        // { 
        0xd4,
        // symbols: 
        0x87,
        // [
        0xb2,

        // "a"
        0x81,
        'a'.charCodeAt(0),

        // ] }

        // Annotations
        0xe4,
        0x81,
        0x8a,

        // Blob
        0xa1,
        1,
      ]);

    // Booleans

    writerTest('Writes boolean true',
      (writer) => { writer.writeBoolean(true) },
        [0x11]);
    writerTest('Writes boolean false',
      (writer) => { writer.writeBoolean(false) },
        [0x10]);
    writerTest('Writes null boolean by detecting null',
      (writer) => { writer.writeBoolean(null) },
        [0x1f]);
    writerTest('Writes null boolean by detecting undefined',
      (writer) => { writer.writeBoolean(undefined) },
        [0x1f]);
    writerTest('Writes null boolean by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.BOOL) },
        [0x1f]);
    writerTest('Writes boolean with annotations',
      (writer) => { writer.writeBoolean(true, ['a', 'b']) },
        [
        // '$ion_symbol_table'::
        0xe9,
        0x81,
        0x83,
        // { symbols: [
        0xd6,
        0x87,
        0xb4,
        // 'a'
        0x81,
        'a'.charCodeAt(0),
        // 'b'
        0x81,
        'b'.charCodeAt(0),

        // Annotations
        0xe4,
        0x82,
        0x8a,
        0x8b,

        // Boolean
        0x11,
      ]);

    // Clobs

    writerTest('Writes clob',
      (writer) => { writer.writeClob(new Uint8Array([1, 2, 3])) },
      [0x93, 1, 2, 3]);
    writerTest('Writes null clob by detecting null',
      (writer) => { writer.writeClob(null) },
      [0x9f]);
    writerTest('Writes null clob by detecting undefined',
      (writer) => { writer.writeClob() },
      [0x9f]);
    writerTest('Writes null clob by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.CLOB) },
      [0x9f]);
    writerTest('Writes clob with annotation',
      (writer) => { writer.writeClob(new Uint8Array([1, 2, 3]), ['foo']) },
        [
        // Symbol table
        // // '$ion_symbol_table'
        0xe9,
        0x81,
        0x83,
        // // { symbols: [
        0xd6,
        0x87,
        0xb4,
        // // "foo" ] }
        0x83,
        'f'.charCodeAt(0),
        'o'.charCodeAt(0),
        'o'.charCodeAt(0),

        // Annotation
        0xe6,
        0x81,
        0x8A,

        // Clob
        0x93,
        1,
        2,
        3
      ]);

    // Decimals

    writerTest('Writes null decimal by detecting null',
      (writer) => { writer.writeDecimal(null) },
        [0x5f]);
    writerTest('Writes null decimal by detecting undefined',
      (writer) => { writer.writeDecimal() },
        [0x5f]);
    writerTest('Writes null decimal by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.DECIMAL) },
        [0x5f]);
    writerTest('Writes implicitly positive zero decimal as single byte',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("0")) },
        [0x50]);
    writerTest('Writes explicitly positive zero decimal as single byte',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("+0")) },
        [0x50]);
    writerTest('Writes negative zero decimal',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("-0")) },
        [0x52, 0x80, 0x80]);
    writerTest('Writes null decimal with annotation',
      (writer) => { writer.writeNull(ion.TypeCodes.DECIMAL, ['a']) },
        [
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        0xe3, 0x81, 0x8a, 0x5f
      ]);
    writerTest('Writes decimal -1',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("-1")) },
        [0x52, 0x80, 0x81]);
    writerTest('Writes decimal 123.456',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("123.456")) },
        [0x54, 0xc3, 0x01, 0xe2, 0x40]);
    writerTest('Writes decimal 123456000',
      (writer) => { writer.writeDecimal(ion.Decimal.parse("123456000")) },
        [0x55, 0x80, 0x07, 0x5b, 0xca, 0x00]);

    // Floats

    writerTest("Writes null float by direct call",
      (writer) => { writer.writeNull(ion.TypeCodes.FLOAT) },
        [0x4f]);

    // 32-bit floats

    writerTest("Writes null 32-bit float by detecting null",
      (writer) => { writer.writeFloat32(null) },
        [0x4f]);
    writerTest("Writes null 32-bit float by detecting undefined",
      (writer) => { writer.writeFloat32() },
        [0x4f]);
    writerTest("Writes null 32-bit float with annotation",
      (writer) => { writer.writeFloat32(null, ['a']) },
        [
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        0xe3, 0x81, 0x8a, 0x4f
      ]);
    writerTest("Writes 32-bit float 1.0",
      (writer) => { writer.writeFloat32(1.0) },
        [0x44, 0x3f, 0x80, 0x00, 0x00]);
    writerTest("Writes 32-bit float -8.125",
      (writer) => { writer.writeFloat32(-8.125) },
        [0x44, 0xc1, 0x02, 0x00, 0x00]);

    // 64-bit floats

    writerTest("Writes null 64-bit float by detecting null",
      (writer) => { writer.writeFloat64(null) },
        [0x4f]);
    writerTest("Writes null 64-bit float by detecting undefined",
      (writer) => { writer.writeFloat64() },
        [0x4f]);
    writerTest("Writes null 64-bit float with annotation",
      (writer) => { writer.writeFloat64(null, ['a']) },
        [
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        0xe3, 0x81, 0x8a, 0x4f
      ]);
    writerTest("Writes 64-bit float 1.0",
      (writer) => { writer.writeFloat64(1.0) },
        [0x48, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    writerTest("Writes 64-bit float -8.125",
      (writer) => { writer.writeFloat64(-8.125) },
        [0x48, 0xc0, 0x20, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // Ints

    writerTest('Writes null int by detecting null',
      (writer) => { writer.writeInt(null) },
        [0x2f]);
    writerTest('Writes null int by detecting undefined',
      (writer) => { writer.writeInt() },
        [0x2f]);
    writerTest('Writes null positive int by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.POSITIVE_INT) },
        [0x2f]);
    writerTest('Writes null negative int by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.NEGATIVE_INT) },
        [0x3f]);
    writerTest('Writes int +0',
      (writer) => { writer.writeInt(0) },
        [0x20]);
    writerTest('Writes int 123456',
      (writer) => { writer.writeInt(123456) },
        [0x23, 0x01, 0xe2, 0x40]);
    writerTest('Writes int 123456 with annotations',
      (writer) => { writer.writeInt(123456, ['a', 'b', 'c']) },
        [
        0xeb, 0x81, 0x83, 0xd8, 0x87, 0xb6, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0), 0x81, 'c'.charCodeAt(0),
        0xe8, 0x83, 0x8a, 0x8b, 0x8c, 0x23, 0x01, 0xe2, 0x40
      ]);

    // Lists

    writerTest('Writes null list by flag',
      (writer) => { writer.writeList(null, true); },
        [0xbf]);
    writerTest('Writes null list by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.LIST) },
        [0xbf]);
    writerTest('Writes null list with annotation',
      (writer) => { writer.writeNull(ion.TypeCodes.LIST, ['a']) },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Annotation
        0xe3, 0x81, 0x8a,
        // List
        0xbf,
      ]);
    writerTest('Writes empty list',
      (writer) => { writer.writeList(); writer.endContainer() },
        [0xb0]);
    writerTest('Writes nested lists',
      (writer) => { writer.writeList(); writer.writeList(); writer.writeList();
                    writer.endContainer(); writer.endContainer(); writer.endContainer() },
        [0xb2, 0xb1, 0xb0]);
    writerTest('Writes pyramid lists',
      (writer) => {
        writer.writeList();
          writer.writeList();
            writer.writeList();
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
          writer.endContainer();
          writer.writeList();
            writer.writeList();
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
          writer.endContainer();
        writer.endContainer();
      },
        [0xb8, 0xb3, 0xb0, 0xb0, 0xb0, 0xb3, 0xb0, 0xb0, 0xb0]);
    writerTest('Writes list with annotation',
      (writer) => { writer.writeList(['a']); writer.endContainer() },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // List
        0xe3, 0x81, 0x8a, 0xb0,
      ]);
    writerTest('Writes nested list with annotation',
      (writer) => { writer.writeList(); writer.writeList(['a']);
                    writer.endContainer(); writer.endContainer() },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Outer list
        0xb4,
        // Inner list
        0xe3, 0x81, 0x8a, 0xb0,
      ]);
    writerTest('Writes pyramid lists with deep annotations',
      (writer) => {
        writer.writeList();
          writer.writeList();
            writer.writeList();
            writer.endContainer();
            writer.writeList(['a']);
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
          writer.endContainer();
          writer.writeList();
            writer.writeList();
            writer.endContainer();
            writer.writeList(['b']);
            writer.endContainer();
            writer.writeList();
            writer.endContainer();
          writer.endContainer();
        writer.endContainer();
      },
        [
        // Symbol table
        0xe9, 0x81, 0x83, 0xd6, 0x87, 0xb4, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0),
        // Top-level list
        0xbe, 0x8e,
          // First child
          0xb6, 0xb0, 0xe3, 0x81, 0x8a, 0xb0, 0xb0,
          // Second child
          0xb6, 0xb0, 0xe3, 0x81, 0x8b, 0xb0, 0xb0]);

    // Nulls

    writerTest('Writes explicit null',
      (writer) => { writer.writeNull(ion.TypeCodes.NULL) },
        [0x0f]);
    writerTest('Writes implicit null',
      (writer) => { writer.writeNull() },
        [0x0f]);

    // S-Expressions

    writerTest('Writes null sexp by flag',
      (writer) => { writer.writeSexp(null, true) },
        [0xcf]);
    writerTest('Writes null sexp by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.SEXP) },
        [0xcf]);
    writerTest('Writes null sexp with annotation',
      (writer) => { writer.writeNull(ion.TypeCodes.SEXP, ['a']) },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Annotation
        0xe3, 0x81, 0x8a,
        // Sexp
        0xcf,
      ]);
    writerTest('Writes empty sexp',
      (writer) => { writer.writeSexp(); writer.endContainer() },
        [0xc0]);
    writerTest('Writes nested sexps',
      (writer) => { writer.writeSexp(); writer.writeSexp(); writer.writeSexp();
                    writer.endContainer(); writer.endContainer(); writer.endContainer() },
        [0xc2, 0xc1, 0xc0]);

    // Strings

    writerTest('Writes null string by detecting null',
      (writer) => { writer.writeString(null) },
        [0x8f]);
    writerTest('Writes null string by detecting undefined',
      (writer) => { writer.writeString() },
        [0x8f]);
    writerTest('Writes null string by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.STRING) },
        [0x8f]);
    writerTest('Writes two top-level strings one with annotation',
      (writer) => { writer.writeString("foo"); writer.writeString("bar", ['a']) },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // First string
        0x83, 'f'.charCodeAt(0), 'o'.charCodeAt(0), 'o'.charCodeAt(0),
        // Second string with annotation
        0xe6, 0x81, 0x8a, 0x83, 'b'.charCodeAt(0), 'a'.charCodeAt(0), 'r'.charCodeAt(0)
      ]);
    writerTest('Writes valid UTF-8',
      (writer) => { writer.writeString("$¢€" + String.fromCodePoint(0x10348)) },
        [
        0x8a,
        // Dollar sign
        0x24,
        // Cent sign
        0xc2, 0xa2,
        // Euro sign
        0xe2, 0x82, 0xac,
        // Gothic letter hwair
        0xf0, 0x90, 0x8d, 0x88
      ]);

    // Structs

    writerTest('Writes null struct by flag',
      (writer) => { writer.writeStruct(null, true) },
        [0xdf]);
    writerTest('Writes empty struct',
      (writer) => { writer.writeStruct(); writer.endContainer() },
        [0xd0]);
    writerTest('Writes nested structs',
      (writer) => { writer.writeStruct(); writer.writeFieldName('a'); writer.writeStruct();
                    writer.endContainer(); writer.endContainer() },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Structs
        0xd2, 0x8a, 0xd0
      ]);
    writerTest('Writes struct with duplicate field names',
      (writer) => {
        writer.writeStruct();
        writer.writeFieldName('a');
        writer.writeNull(ion.TypeCodes.NULL);
        writer.writeFieldName('a');
        writer.writeNull(ion.TypeCodes.NULL);
        writer.endContainer();
      },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Struct
        0xd4, 0x8a, 0x0f, 0x8a, 0x0f
      ]);
    skippedWriterTest('Kitchen sink',
      (writer) => {
        writer.writeStruct(['x']);
        writer.writeFieldName('b');
        writer.writeBoolean(true);
        writer.writeFieldName('b');
        writer.writeBoolean(false);
        writer.writeFieldName('b');
        writer.writeBlob(ion.encodeUtf8('foo'));
        writer.writeFieldName('c');
        writer.writeClob(ion.encodeUtf8('bar'));
        writer.writeFieldName('d');
        writer.writeDecimal("123.456");
        writer.writeFieldName('f');
        writer.writeFloat32(8.125);
        writer.writeFieldName('f');
        writer.writeFloat64(8.125);
        writer.writeFieldName('i');
        writer.writeInt(123456);
        writer.writeFieldName('l');
        writer.writeList();
        writer.endContainer();
        writer.writeFieldName('n');
        writer.writeNull(ion.IonTypes.NULL);
        writer.writeFieldName('s');
        writer.writeSexp();
        writer.endContainer();
        writer.writeFieldName('s');
        writer.writeString('baz');
        writer.writeFieldName('s');
        writer.writeStruct();
        writer.endContainer();
        writer.writeFieldName('s');
        writer.writeSymbol('qux');
        writer.writeFieldName('t');
        writer.writeTimestamp(new ion.Timestamp(ion.Precision.DAY, 0, 2000, 1, 1));
        writer.endContainer();
      },
        [
        // Symbol table
        0xee, // 4
        0x9f, // Length 31 // 5
        0x81, // 6
        0x83, // 7
        0xde, // 8
        0x9b, // Length 27 // 9
        0x87, // 10
        0xbe, // 11
        0x98, // Length 24 // 12
          0x81,
          'x'.charCodeAt(0),
          0x81,
          'b'.charCodeAt(0),
          0x81,
          'c'.charCodeAt(0),
          0x81,
          'd'.charCodeAt(0),
          0x81,
          'f'.charCodeAt(0),
          0x81,
          'i'.charCodeAt(0),
          0x81,
          'l'.charCodeAt(0),
          0x81,
          'n'.charCodeAt(0),
          0x81,
          's'.charCodeAt(0),
          0x83,
          'q'.charCodeAt(0), 'u'.charCodeAt(0), 'x'.charCodeAt(0),
          0x81,
          't'.charCodeAt(0),

        // 'x'::
        0xee, // 37
        0xc4, // Length ???
        0x81,
        0x8a, // 40

        // {
        0xde,
        0xc0, // Length ???

        // 'b':
        0x8b,
        // Boolean true
        0x11,
        // 'b':
        0x8b,
        // Boolean false
        0x10, // 46
        // 'b':
        0x8b,
        // Blob
        0xa3, 'f'.charCodeAt(0), 'o'.charCodeAt(0), 'o'.charCodeAt(0),
        // 'c':
        0x8c,
        // Clob
        0x93, 'b'.charCodeAt(0), 'a'.charCodeAt(0), 'r'.charCodeAt(0),
        // 'd':
        0x8d,
        // Decimal
        0x54, 0xc3, 0x01, 0xe2, 0x40,
        // 'f':
        0x8e, // 63
        // 32-bit float
        0x44, 0x41, 0x02, 0x00, 0x00,
        // 'f':
        0x8e,
        // 64-bit float
        0x48, 0x40, 0x20, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
        // 'i':
        0x8f,
        // Int
        0x23, 0x01, 0xe2, 0x40,
        // 'l':
        0x90,
        // List
        0xb0,
        // 'n':
        0x91,
        // Null
        0x0f, // 87
        // 's':
        0x92,
        // Sexp
        0xc0,
        // 's':
        0x92,
        // "baz"
        0x83, 'b'.charCodeAt(0), 'a'.charCodeAt(0), 'z'.charCodeAt(0),
        // 's':
        0x92,
        // Struct
        0xd0, // 96
        // 's':
        0x92,
        // 'qux'
        0x71, 0x13,
        // 't':
        0x94,
        // Timestamp
        0x65, 0x80, 0x0f, 0xd0, 0x81, 0x81
      ]);

    // Symbols

    writerTest('Writes null symbol by detecting null',
      (writer) => { writer.writeSymbol(null) },
        [0x7f]);
    skippedWriterTest('Writes null symbol by detecting undefined',
      (writer) => { writer.writeSymbol() },
        [0x7f]);
    writerTest('Writes null symbol by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.SYMBOL) },
        [0x7f]);
    writerTest('Writes symbol with identical annotation',
      (writer) => { writer.writeSymbol('a', ['a']) },
        [
        // Symbol table
        0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
        // Symbol
        0xe4, 0x81, 0x8a, 0x71, 0x0a
      ]);
    writerTest('Writes two top-level symbols',
      (writer) => { writer.writeSymbol('a'); writer.writeSymbol('b') },
        [
        // Symbol table
        0xe9, 0x81, 0x83, 0xd6, 0x87, 0xb4, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0),
        // Symbols
        0x71, 0x0a, 0x71, 0x0b
      ]);

    // Timestamps

    writerTest('Writes null timestamp by detecting null',
      (writer) => { writer.writeTimestamp(null) },
        [0x6f]);
    writerTest('Writes null timestamp by detecting undefined',
      (writer) => { writer.writeTimestamp() },
        [0x6f]);
    writerTest('Writes null timestamp by direct call',
      (writer) => { writer.writeNull(ion.TypeCodes.TIMESTAMP) },
        [0x6f]);
      skippedWriterTest('Writes 2000-01-01T12:34:56.789 with year precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.YEAR, 0, 2000, 1, 1, 12, 34, 56, ion.Decimal.parse('.789')))},
        [
        0x63,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
      ]);
      skippedWriterTest('Writes 2000-01-01T12:34:56.789 with month precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.MONTH, 0, 2000, 1, 1, 12, 34, 56, ion.Decimal.parse('.789'))) },
        [
        0x64,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
      ]);
      skippedWriterTest('Writes 2000-01-01T12:34:56.789 with day precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.FRACTION, 0, 2000, 1, 1, 12, 34, 56, ion.Decimal.parse('.789'))) },
        [
        0x65,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
        // Day
        0x81,
      ]);
    skippedWriterTest('Writes 2000-01-01T12:34:56.789 with hour and minute precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.HOUR_AND_MINUTE, 0, 2000, 1, 1, 12, 34, 56, ion.Decimal.parse('.789'))) },
        [
        0x67,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
        // Day
        0x81,
        // Hour
        0x8c,
        // Minute
        0xa2,
      ]);
    writerTest('Writes 2000-01-01T12:34:56.789 with fraction precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.FRACTION, 0, 2000, 1, 1, 12, 34, 56, ion.Decimal.parse('.789'))) },
        [
        0x6b,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
        // Day
        0x81,
        // Hour
        0x8c,
        // Minute
        0xa2,
        // Second (56)
        0xb8,
        // Fraction exponent (-3)
        0xc3,
        // Fraction (789)
        0x03,
        0x15,
      ]);
    writerTest('Writes 2000-01-01T12:34:00.789 with fraction precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.FRACTION, 0, 2000, 1, 1, 12, 34, 0, ion.Decimal.parse('.789'))) },
        [
        0x6b,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
        // Day
        0x81,
        // Hour
        0x8c,
        // Minute
        0xa2,
        // Second
        0x80,
        // Fraction exponent (-3)
        0xc3,
        // Fraction (789)
        0x03,
        0x15,
      ]);
    writerTest('Writes 2000-01-01T12:34:00 with second precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.SECONDS, 0, 2000, 1, 1, 12, 34, 0)) },
        [
        0x68,
        // Offset
        0x80,
        // Year
        0x0f,
        0xd0,
        // Month
        0x81,
        // Day
        0x81,
        // Hour
        0x8c,
        // Minute
        0xa2,
        // Second
        0x80,
      ]);
    writerTest('Writes 2000-01-01T12:34:00-08:00 with second precision',
      (writer) => { writer.writeTimestamp(new ion.Timestamp(ion.Precision.SECONDS, -8 * 60, 2000, 1, 1, 12, 34, 0)) },
        [
        0x69,
        // Offset
        0x43,
        // Year
        0xe0,
        0x0f,
        // Month
        0xd0,
        // Day
        0x81,

        0x81,
        // Hour
        0x94,
        // Minute
        0xa2,
        // Second
        0x80,
      ]);

    // Error tests

    var errorTest = function(name, instructions) {
      suite[name] = function() {
        var symbolTable = new ion.LocalSymbolTable(ion.getSystemSymbolTableImport());
        var writeable = new ion.Writeable();
        var writer = new ion.BinaryWriter(symbolTable, writeable);
        assert.throws(() => { instructions(writer) }, Error);
      }
    }

    errorTest('Cannot write top-level field name',
      (writer) => { writer.writeFieldName('foo') });
    errorTest('Cannot exit container at top level',
      (writer) => { writer.endContainer() });
    errorTest('Cannot double-exit container',
      (writer) => {
        writer.writeList();
        writer.endContainer();
        writer.endConttainer();
      });

    // Node tests

    suite['Calculates node lengths correctly'] = function() {
      var writeable = new ion.Writeable();
      var writer = new ion.LowLevelBinaryWriter(writeable);
      var node = new ion.NullNode(writer, null, ion.TypeCodes.LIST, [10 | 0x80]);
      assert.equal(node.getAnnotatedContainerLength(), 3);
      assert.equal(node.getAnnotationsLength(), 3);
      assert.equal(node.getLength(), 4);
      assert.equal(node.getContainedValueLength(), 1);
      assert.equal(node.getValueLength(), 0);
      node.write();
      var bytes = writeable.getBytes();
      assert.deepEqual(bytes, new Uint8Array([0xe3, 0x81, 0x8a, 0xbf]));
    }

    registerSuite(suite);
  }
);
