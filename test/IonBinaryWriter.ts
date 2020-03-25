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
import JSBI from 'jsbi';
import {Decimal, Writer} from "../src/Ion";
import {BinaryWriter, NullNode} from "../src/IonBinaryWriter";
import {Writeable} from "../src/IonWriteable";
import {getSystemSymbolTableImport} from "../src/IonSystemSymbolTable";
import {LocalSymbolTable} from "../src/IonLocalSymbolTable";
import {encodeUtf8} from "../src/IonUnicode";
import {LowLevelBinaryWriter} from "../src/IonLowLevelBinaryWriter";

const ivm = [0xe0, 0x01, 0x00, 0xea];

interface Test {
    name: string;
    instructions: (writer: Writer) => void;
    expected: number[];
    skip?: boolean;
}
interface BadTest {
    name: string;
    instructions: (writer: Writer) => void;
    skip?: boolean;
}

let writerTest = function (name: string, instructions: (writer: Writer) => void, expected: number[]) {
    it(name, () => {
        let symbolTable = new LocalSymbolTable(getSystemSymbolTableImport());
        let writeable = new Writeable();
        let writer = new BinaryWriter(symbolTable, writeable);
        instructions(writer);
        writer.close();
        let actual = writeable.getBytes();
        assert.deepEqual(actual, new Uint8Array(ivm.concat(expected)));
    });
};

let badWriterTest = function (name: string, instructions: (writer: Writer) => void) {
    let test = () => {
        let symbolTable = new LocalSymbolTable(getSystemSymbolTableImport());
        let writeable = new Writeable();
        let writer = new BinaryWriter(symbolTable, writeable);
        instructions(writer);
        writer.close();
    };
    it(name, () => assert.throws(test, Error));
};

let blobWriterTests: Test[] = [
    {
        name: "Writes blob",
        instructions: (writer) => writer.writeBlob(new Uint8Array([1, 2, 3])),
        expected: [0xa3, 1, 2, 3]
    },
    {
        name: "Writes null blob 1",
        instructions: (writer) => writer.writeBlob(null),
        expected: [0xaf]
    },
    {
        name: "Writes null blob 2",
        instructions: (writer) => writer.writeNull(ion.IonTypes.BLOB),
        expected: [0xaf]
    },
    {
        name: "Writes blob with annotation",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeBlob(new Uint8Array([1]));
        },
        expected: [
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
        ]
    },
];

let booleanWriterTests: Test[] = [
    {
        name: "Writes boolean true",
        instructions: (writer) => writer.writeBoolean(true),
        expected: [0x11]
    },
    {
        name: "Writes boolean false",
        instructions: (writer) => writer.writeBoolean(false),
        expected: [0x10]
    },
    {
        name: "Writes null boolean by detecting null",
        instructions: (writer) => writer.writeBoolean(null),
        expected: [0x1f]
    },
    {
        name: "Writes null boolean by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.BOOL),
        expected: [0x1f]
    },
    {
        name: "Writes boolean with annotations",
        instructions: (writer) => {
            writer.setAnnotations(['a', 'b']);
            writer.writeBoolean(true);
        },
        expected: [
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
        ]
    },
];

let clobWriterTests: Test[] = [
    {
        name: "Writes clob",
        instructions: (writer) => writer.writeClob(new Uint8Array([1, 2, 3])),
        expected: [0x93, 1, 2, 3]
    },
    {
        name: "Writes null clob by detecting null",
        instructions: (writer) => writer.writeClob(null),
        expected: [0x9f]
    },
    {
        name: "Writes null clob by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.CLOB),
        expected: [0x9f]
    },
    {
        name: "Writes clob with annotation",
        instructions: (writer) => {
            writer.setAnnotations(['foo']);
            writer.writeClob(new Uint8Array([1, 2, 3]));
        },
        expected: [
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
        ]
    },
];

let decimalWriterTests: Test[] = [
    {
        name: "Writes null decimal by detecting null",
        instructions: (writer) => writer.writeDecimal(null),
        expected: [0x5f]
    },
    {
        name: "Writes null decimal by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.DECIMAL),
        expected: [0x5f]
    },
    {
        name: "Writes implicitly positive zero decimal as single byte",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("0")),
        expected: [0x50]
    },
    {
        name: "Writes explicitly positive zero decimal as single byte",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("+0")),
        expected: [0x50]
    },
    {
        name: "Writes 0d-0 as equiv 0d0 decimal",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("0d-0")),
        expected: [0x50]
    },
    {
        name: "Writes negative zero decimal",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("-0")),
        expected: [0x52, 0x80, 0x80]
    },
    {
        name: "Writes -0d-0 as equiv -0d0 decimal",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("-0d-0")),
        expected: [0x52, 0x80, 0x80]
    },
    {
        name: "Writes null decimal with annotation",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeNull(ion.IonTypes.DECIMAL);
        },
        expected: [
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            0xe3, 0x81, 0x8a, 0x5f
        ]
    },
    {
        name: "Writes decimal -1",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("-1")),
        expected: [0x52, 0x80, 0x81]
    },
    {
        name: "Writes decimal 123.456",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("123.456")),
        expected: [0x54, 0xc3, 0x01, 0xe2, 0x40]
    },
    {
        name: "Writes decimal 123456000",
        instructions: (writer) => writer.writeDecimal(ion.Decimal.parse("123456000")),
        expected: [0x55, 0x80, 0x07, 0x5b, 0xca, 0x00]
    },
];

let floatWriterTests: Test[] = [
    {
        name: "Writes null float by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.FLOAT),
        expected: [0x4f]
    },
    {
        name: "Writes null 32-bit float by detecting null",
        instructions: (writer) => writer.writeFloat32(null),
        expected: [0x4f]
    },
    {
        name: "Writes null 32-bit float with annotations",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeFloat32(null)
        },
        expected: [
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            0xe3, 0x81, 0x8a, 0x4f
        ]
    },
    {
        name: "Writes 32-bit float 1.0",
        instructions: (writer) => writer.writeFloat32(1.0),
        expected: [0x44, 0x3f, 0x80, 0x00, 0x00]
    },
    {
        name: "Writes 32-bit float 0.0",
        instructions: (writer) => writer.writeFloat32(0),
        expected: [0x40]
    },
    {
        name: "Writes 32-bit float -0.0",
        instructions: (writer) => writer.writeFloat32(-0),
        expected: [0x44, 0x80, 0x00, 0x00, 0x00]
    },
    {
        name: "Writes 32-bit float -8.125",
        instructions: (writer) => writer.writeFloat32(-8.125),
        expected: [0x44, 0xc1, 0x02, 0x00, 0x00]
    },
    {
        name: "Writes null 64-bit float by detecting null",
        instructions: (writer) => writer.writeFloat64(null),
        expected: [0x4f]
    },
    {
        name: "Writes null 64-bit float with annotations",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeFloat64(null)
        },
        expected: [
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            0xe3, 0x81, 0x8a, 0x4f
        ]
    },
    {
        name: "Writes 64-bit float 1.0",
        instructions: (writer) => writer.writeFloat64(1.0),
        expected: [0x48, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
    {
        name: "Writes 64-bit float 0.0",
        instructions: (writer) => writer.writeFloat64(0),
        expected: [0x40]
    },
    {
        name: "Writes 64-bit float -0.0",
        instructions: (writer) => writer.writeFloat64(-0),
        expected: [0x48, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
    {
        name: "Writes 64-bit float -8.125",
        instructions: (writer) => writer.writeFloat64(-8.125),
        expected: [0x48, 0xc0, 0x20, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
];

let intWriterTests: Test[] = [
    {
        name: "Writes null int by detecting null",
        instructions: (writer) => writer.writeInt(null),
        expected: [0x2f]
    },
    {
        name: "Writes null int by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.INT),
        expected: [0x2f]
    },
    {
        name: "Writes int +0",
        instructions: (writer) => writer.writeInt(0),
        expected: [0x20]
    },
    {
        name: "Writes int 123456",
        instructions: (writer) => writer.writeInt(123456),
        expected: [0x23, 0x01, 0xe2, 0x40]
    },
    {
        name: "Writes BigInt 0",
        instructions: (writer) => writer.writeInt(JSBI.BigInt('0')),
        expected: [0x20]
    },
    {
        name: "Writes BigInt 12345678901234567890",
        instructions: (writer) => writer.writeInt(JSBI.BigInt('12345678901234567890')),
        expected: [0x28, 0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]
    },
    {
        name: "Writes BigInt -12345678901234567890",
        instructions: (writer) => writer.writeInt(JSBI.BigInt('-12345678901234567890')),
        expected: [0x38, 0xab, 0x54, 0xa9, 0x8c, 0xeb, 0x1f, 0x0a, 0xd2]
    },
    {
        name: "Writes int 123456 with annotations",
        instructions: (writer) => {
            writer.setAnnotations(['a', 'b', 'c']);
            writer.writeInt(123456);
        },
        expected: [
            0xeb, 0x81, 0x83, 0xd8, 0x87, 0xb6, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0), 0x81, 'c'.charCodeAt(0),
            0xe8, 0x83, 0x8a, 0x8b, 0x8c, 0x23, 0x01, 0xe2, 0x40
        ]
    },
];

let listWriterTests: Test[] = [
    {
        name: "Writes null list by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.LIST),
        expected: [0xbf]
    },
    {
        name: "Writes null list with annotations",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeNull(ion.IonTypes.LIST);
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Annotation
            0xe3, 0x81, 0x8a,
            // List
            0xbf,
        ]
    },
    {
        name: "Writes empty list",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
        },
        expected: [0xb0]
    },
    {
        name: "Writes nested lists",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
            writer.stepOut();
        },
        expected: [0xb2, 0xb1, 0xb0]
    },
    {
        name: "Writes pyramid lists",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
            writer.stepOut();
        },
        expected: [0xb8, 0xb3, 0xb0, 0xb0, 0xb0, 0xb3, 0xb0, 0xb0, 0xb0]
    },
    {
        name: "Writes list with annotation",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut()
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // List
            0xe3, 0x81, 0x8a, 0xb0,
        ]
    },
    {
        name: "Writes nested list with annotation",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.setAnnotations(['a']);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Outer list
            0xb4,
            // Inner list
            0xe3, 0x81, 0x8a, 0xb0,
        ]
    },
    {
        name: "Writes pyramid lists with deep annotations",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.setAnnotations(['a']);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.setAnnotations(['b']);
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
            writer.stepOut();
        },
        expected: [
            // Symbol table
            0xe9, 0x81, 0x83, 0xd6, 0x87, 0xb4, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0),
            // Top-level list
            0xbe, 0x8e,
            // First child
            0xb6, 0xb0, 0xe3, 0x81, 0x8a, 0xb0, 0xb0,
            // Second child
            0xb6, 0xb0, 0xe3, 0x81, 0x8b, 0xb0, 0xb0
        ]
    },
];

let nullWriterTests: Test[] = [
    {
        name: "Writes explicit null",
        instructions: (writer) => writer.writeNull(ion.IonTypes.NULL),
        expected: [0x0f]
    },
];

let sexpWriterTests: Test[] = [
    {
        name: "Writes null sexp by direct call",
        instructions: (writer) => writer.writeNull(ion.IonTypes.SEXP),
        expected: [0xcf]
    },
    {
        name: "Writes null sexp with annotation",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeNull(ion.IonTypes.SEXP);
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Annotation
            0xe3, 0x81, 0x8a,
            // Sexp
            0xcf,
        ]
    },
    {
        name: "Writes empty sexp",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.SEXP);
            writer.stepOut();
        },
        expected: [0xc0]
    },
    {
        name: "Writes nested sexps",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.SEXP);
            writer.stepIn(ion.IonTypes.SEXP);
            writer.stepIn(ion.IonTypes.SEXP);
            writer.stepOut();
            writer.stepOut();
            writer.stepOut();
        },
        expected: [0xc2, 0xc1, 0xc0]
    },
];

let stringWriterTests: Test[] = [
    {
        name: "Writes null string by detecting null",
        instructions: (writer) => {
            writer.writeString(null);
        },
        expected: [0x8f]
    },
    {
        name: "Writes null string by direct call",
        instructions: (writer) => {
            writer.writeNull(ion.IonTypes.STRING);
        },
        expected: [0x8f]
    },
    {
        name: "Writes two top-level strings, one of which has an annotation",
        instructions: (writer) => {
            writer.writeString("foo");
            writer.setAnnotations(['a']);
            writer.writeString("bar");
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // First string
            0x83, 'f'.charCodeAt(0), 'o'.charCodeAt(0), 'o'.charCodeAt(0),
            // Second string with annotation
            0xe6, 0x81, 0x8a, 0x83, 'b'.charCodeAt(0), 'a'.charCodeAt(0), 'r'.charCodeAt(0)
        ]
    },
    {
        name: "Writes valid UTF-8",
        instructions: (writer) => {
            writer.writeString("$¢€" + String.fromCodePoint(0x10348))
        },
        expected: [
            0x8a,
            // Dollar sign
            0x24,
            // Cent sign
            0xc2, 0xa2,
            // Euro sign
            0xe2, 0x82, 0xac,
            // Gothic letter hwair
            0xf0, 0x90, 0x8d, 0x88
        ]
    },
];

let structWriterTests: Test[] = [
    {
        name: "Writes null struct by direct call",
        instructions: (writer) => {
            writer.writeNull(ion.IonTypes.STRUCT);
        },
        expected: [0xdf]
    },
    {
        name: "Writes empty struct",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepOut();
        },
        expected: [0xd0]
    },
    {
        name: "Writes nested structs",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.writeFieldName('a');
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepOut();
            writer.stepOut();
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Structs
            0xd2, 0x8a, 0xd0
        ]
    },
    {
        name: "Writes struct with duplicate field names",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.writeFieldName('a');
            writer.writeNull(ion.IonTypes.NULL);
            writer.writeFieldName('a');
            writer.writeNull(ion.IonTypes.NULL);
            writer.stepOut();
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Struct
            0xd4, 0x8a, 0x0f, 0x8a, 0x0f
        ]
    },
    {
        name: "Writes kitchen sink struct",
        instructions: (writer) => {
            writer.setAnnotations(['x']);
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.writeFieldName('b');
            writer.writeBoolean(true);
            writer.writeFieldName('b');
            writer.writeBoolean(false);
            writer.writeFieldName('b');
            writer.writeBlob(encodeUtf8('foo'));
            writer.writeFieldName('c');
            writer.writeClob(encodeUtf8('bar'));
            writer.writeFieldName('d');
            writer.writeDecimal(Decimal.parse("123.456"));
            writer.writeFieldName('f');
            writer.writeFloat32(8.125);
            writer.writeFieldName('f');
            writer.writeFloat64(8.125);
            writer.writeFieldName('i');
            writer.writeInt(123456);
            writer.writeFieldName('l');
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.writeFieldName('n');
            writer.writeNull(ion.IonTypes.NULL);
            writer.writeFieldName('s');
            writer.stepIn(ion.IonTypes.SEXP);
            writer.stepOut();
            writer.writeFieldName('s');
            writer.writeString('baz');
            writer.writeFieldName('s');
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepOut();
            writer.writeFieldName('s');
            writer.writeSymbol('qux');
            writer.writeFieldName('t');
            writer.writeTimestamp(new ion.Timestamp(0, 2000, 1, 1));
            writer.stepOut();
        },
        expected: [
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
            0x65, 0xc0, 0x0f, 0xd0, 0x81, 0x81
        ]
    },
];

let symbolWriterTests: Test[] = [
    {
        name: "Writes null symbol by detecting null",
        instructions: (writer) => {
            writer.writeSymbol(null);
        },
        expected: [0x7f]
    },
    {
        name: "Writes null symbol by direct call",
        instructions: (writer) => {
            writer.writeNull(ion.IonTypes.SYMBOL);
        },
        expected: [0x7f]
    },
    {
        name: "Writes symbol with identical annotation",
        instructions: (writer) => {
            writer.setAnnotations(['a']);
            writer.writeSymbol('a');
        },
        expected: [
            // Symbol table
            0xe7, 0x81, 0x83, 0xd4, 0x87, 0xb2, 0x81, 'a'.charCodeAt(0),
            // Symbol
            0xe4, 0x81, 0x8a, 0x71, 0x0a
        ]
    },
    {
        name: "Writes two top-level symbols",
        instructions: (writer) => {
            writer.writeSymbol('a');
            writer.writeSymbol('b');
        },
        expected: [
            // Symbol table
            0xe9, 0x81, 0x83, 0xd6, 0x87, 0xb4, 0x81, 'a'.charCodeAt(0), 0x81, 'b'.charCodeAt(0),
            // Symbols
            0x71, 0x0a, 0x71, 0x0b
        ]
    },
];

let timestampWriterTests: Test[] = [
    {
        name: "Writes null timestamp by detecting null",
        instructions: (writer) => {
            writer.writeTimestamp(null);
        },
        expected: [0x6f]
    },
    {
        name: "Writes null timestamp by direct call",
        instructions: (writer) => {
            writer.writeNull(ion.IonTypes.TIMESTAMP);
        },
        expected: [0x6f]
    },
    {
        name: "Writes 2000T",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(0, 2000));
        },
        expected: [
            0x63,
            // Offset
            0xc0,
            // Year
            0x0f,
            0xd0,
        ]
    },
    {
        name: "Writes 2000T-01T",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(0, 2000, 1));
        },
        expected: [
            0x64,
            // Offset
            0xc0,
            // Year
            0x0f,
            0xd0,
            // Month
            0x81,
        ]
    },
    {
        name: "Writes 2000T-01-01T",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(0, 2000, 1, 1));
        },
        expected: [
            0x65,
            // Offset
            0xc0,
            // Year
            0x0f,
            0xd0,
            // Month
            0x81,
            // Day
            0x81,
        ]
    },
    {
        name: "Writes 2000T-01-01T12:34",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(0, 2000, 1, 1, 12, 34));
        },
        expected: [
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
        ]
    },
    {
        name: "Writes 2000-01-01T12:34:56.789 with fraction precision",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(0, 2000, 1, 1, 12, 34, ion.Decimal.parse('56.789')));
        },
        expected: [
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
        ]
    },
    {
        name: "Writes 2000-01-01T12:34:00-08:00 with second precision",
        instructions: (writer) => {
            writer.writeTimestamp(new ion.Timestamp(-8 * 60, 2000, 1, 1, 12, 34, ion.Decimal.parse('0')));
        },
        expected: [
            0x69,
            0x43,
            0xe0,
            0x0f,
            0xd0,
            0x81,
            0x81,
            0x94,
            0xa2,
            0x80,
        ]
    },
];

let badWriterTests: BadTest[] = [
    {
        name: "Cannot step into struct with missing field value",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepIn(ion.IonTypes.STRUCT);
        }
    },
    {
        name: "Cannot step into sexp with missing field value",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepIn(ion.IonTypes.SEXP);
        }
    },
    {
        name: "Cannot step into list with missing field value",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.stepIn(ion.IonTypes.LIST);
        }
    },
    {
        name: "Cannot write a struct value without setting the field name",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.STRUCT);
            writer.writeInt(0);
        }
    },
    {
        name: "Cannot write a top-level field name",
        instructions: (writer) => {
            writer.writeFieldName('foo');
        }
    },
    {
        name:'Should throw when passing a single string as an annotation.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations('taco');
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when setting annotations to null.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations(null);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when passing annotations array without a string.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations([5]);
            writer.writeInt(5)
        }
    },
    {
        name:'Should throw when adding an int as annotation.',
        instructions: (writer) => {
            // @ts-ignore
            writer.addAnnotation(5), writer.writeInt(5)
        }
    },
    {
        name:'Should throw when adding array of chars.',
        instructions: (writer) => {
            // @ts-ignore
            writer.addAnnotation(['t', 'a', 'c', 'o']);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when passing annotations array containing a non string value.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations(['a', 5,'t']);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when adding a non string annotation.',
        instructions: (writer) => {
            // @ts-ignore
            writer.addAnnotation(null);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when adding a non string annotation.',
        instructions: (writer) => {
            // @ts-ignore
            writer.addAnnotation(undefined);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when passing annotations array containing undefined.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations([undefined]);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when passing annotations array containing null.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations([null]);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when passing undefined as annotations.',
        instructions: (writer) => {
            // @ts-ignore
            writer.setAnnotations(undefined);
            writer.writeInt(5);
        }
    },
    {
        name:'Should throw when writing top-level field name.',
        instructions: (writer) => {
            writer.writeFieldName('foo');
        }
    },
    {
        name: "Cannot stepOut() of the top level",
        instructions: (writer) => {
            writer.stepOut();
        }
    },
    {
        name: "Cannot stepOut() more times than you have stepped in",
        instructions: (writer) => {
            writer.stepIn(ion.IonTypes.LIST);
            writer.stepOut();
            writer.stepOut();
        }
    },
];

function runWriterTests(tests: Test[]) {
    tests.forEach(({name, instructions, expected, skip}) => {
        if (skip) {
            it.skip(name, () => {});
            return;
        }
        writerTest(name, instructions, expected);
    });
}

function runBadWriterTests(tests: BadTest[]) {
    tests.forEach(({name, instructions, skip}) => {
        if (skip) {
            it.skip(name, () => {});
            return;
        }
        badWriterTest(name, instructions);
    });
}

describe('Binary Writer', () => {
    describe('Writing Ion Values', () => {
        describe('Null', () => runWriterTests(nullWriterTests));
        describe('Boolean', () => runWriterTests(booleanWriterTests));
        describe('Int', () => runWriterTests(intWriterTests));
        describe('Float', () => runWriterTests(floatWriterTests));
        describe('Decimal', () => runWriterTests(decimalWriterTests));
        describe('Timestamp', () => runWriterTests(timestampWriterTests));
        describe('Symbol', () => runWriterTests(symbolWriterTests));
        describe('String', () => runWriterTests(stringWriterTests));
        describe('Clob', () => runWriterTests(clobWriterTests));
        describe('Blob', () => runWriterTests(blobWriterTests));
        describe('List', () => runWriterTests(listWriterTests));
        describe('S-Expression', () => runWriterTests(sexpWriterTests));
        describe('Struct', () => runWriterTests(structWriterTests));
    });
    describe('Catching illegal behavior', () => {
        runBadWriterTests(badWriterTests);
    });
    it('Calculates node lenghts correctly', () => {
        let writeable = new Writeable();
        let writer = new LowLevelBinaryWriter(writeable);
        let node = new NullNode(writer, null, ion.IonTypes.LIST, new Uint8Array([10 | 0x80]));
        assert.equal(node.getAnnotatedContainerLength(), 3);
        assert.equal(node.getAnnotationsLength(), 3);
        assert.equal(node.getLength(), 4);
        assert.equal(node.getContainedValueLength(), 1);
        assert.equal(node.getValueLength(), 0);
        node.write();
        let bytes = writeable.getBytes();
        assert.deepEqual(bytes, new Uint8Array([0xe3, 0x81, 0x8a, 0xbf]));
    });
});
