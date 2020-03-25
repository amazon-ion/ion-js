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
import {LowLevelBinaryWriter} from "../src/IonLowLevelBinaryWriter";
import {Writeable} from "../src/IonWriteable";

let sizeOfUnsignedIntTests = [
    {value: 0, sizeInBytes: 1},
    {value: 255, sizeInBytes: 1},
    {value: 256, sizeInBytes: 2},
    {value: 65535, sizeInBytes: 2},
    {value: 65536, sizeInBytes: 3},
];

let sizeOfSignedIntTests = [
    {value: 0, sizeInBytes: 1},
    {value: 127, sizeInBytes: 1},
    {value: -128, sizeInBytes: 2},
    {value: 128, sizeInBytes: 2},
    {value: -32768, sizeInBytes: 3},
    {value: 32768, sizeInBytes: 3},
];

let sizeOfVarUnsignedIntTests = [
    {value: 0, sizeInBytes: 1},
    {value: 1, sizeInBytes: 1},
    {value: 2, sizeInBytes: 1},
    {value: 127, sizeInBytes: 1},
    {value: 128, sizeInBytes: 2},
    {value: 255, sizeInBytes: 2},
    {value: 256, sizeInBytes: 2},
    {value: 16383, sizeInBytes: 2},
    {value: 16384, sizeInBytes: 3},
];

let sizeOfVarSignedIntTests = [
    {value: 0, sizeInBytes: 1},
    {value: -0, sizeInBytes: 1},
    {value: 1, sizeInBytes: 1},
    {value: -1, sizeInBytes: 1},
    {value: 63, sizeInBytes: 1},
    {value: -63, sizeInBytes: 1},
    {value: 64, sizeInBytes: 2},
    {value: -64, sizeInBytes: 2},
    {value: 8191, sizeInBytes: 2},
    {value: -8191, sizeInBytes: 2},
    {value: 8192, sizeInBytes: 3},
    {value: -8192, sizeInBytes: 3},
];

let unsignedIntWritingTests = [
    {value: 0, expectedBytes: [0]},
    {value: 255, expectedBytes: [255]},
    {value: 256, expectedBytes: [1, 0]},
];

let signedIntWritingTests = [
    {value: 0, expectedBytes: [0]},
    {value: -1, expectedBytes: [0x81]},
    {value: -127, expectedBytes: [0xFF]},
    {value: 127, expectedBytes: [0x7F]},
    {value: -128, expectedBytes: [0x80, 0x80]},
    {value: 128, expectedBytes: [0x00, 0x80]},
    {value: -256, expectedBytes: [0x81, 0x00]},
    {value: 256, expectedBytes: [0x01, 0x00]},
    {value: -32768, expectedBytes: [0x80, 0x80, 0x00]},
    {value: 32768, expectedBytes: [0x00, 0x80, 0x00]},
    {value: -8388608, expectedBytes: [0x80, 0x80, 0x00, 0x00]},
    {value: 8388608, expectedBytes: [0x00, 0x80, 0x00, 0x00]},
];

let varUnsignedIntWritingTests = [
    {value: 0, expectedBytes: [0x80]},
    {value: 1, expectedBytes: [0x81]},
    {value: 127, expectedBytes: [0xFF]},
    {value: 128, expectedBytes: [0x01, 0x80]},
    {value: 255, expectedBytes: [0x01, 0xFF]},
    {value: 256, expectedBytes: [0x02, 0x80]},
    {value: 16383, expectedBytes: [0x7F, 0xFF]},
    {value: 16384, expectedBytes: [0x01, 0x00, 0x80]},
];

let varSignedIntWritingTests = [
    {value: 0, expectedBytes: [0x80]},
    {value: 1, expectedBytes: [0x81]},
    {value: -1, expectedBytes: [0xC1]},
    {value: 63, expectedBytes: [0xBF]},
    {value: -63, expectedBytes: [0xFF]},
    {value: 64, expectedBytes: [0x00, 0xC0]},
    {value: -64, expectedBytes: [0x40, 0xC0]},
    {value: 128, expectedBytes: [0x01, 0x80]},
    {value: -128, expectedBytes: [0x41, 0x80]},
    {value: 8191, expectedBytes: [0x3F, 0xFF]},
    {value: -8191, expectedBytes: [0x7F, 0xFF]},
    {value: 8192, expectedBytes: [0x00, 0x40, 0x80]},
    {value: -8192, expectedBytes: [0x40, 0x40, 0x80]},
    {value: 16384, expectedBytes: [0x01, 0x00, 0x80]},
    {value: -16384, expectedBytes: [0x41, 0x00, 0x80]},
];

let runIntWritingTests = function (tests,
                                   serializer: (LowLevelBinaryWriter, number) => void) {
    tests.forEach(({value, expectedBytes}) => {
        it(value.toString(), () => {
            let writeable = new Writeable();
            let writer = new LowLevelBinaryWriter(writeable);
            serializer(writer, value);
            let actual = writeable.getBytes();
            assert.deepEqual(actual, new Uint8Array(expectedBytes));
        });
    });
};

let runIntSizeTests = function (tests, sizeCalculator: (number) => number): void {
    tests.forEach(({value, sizeInBytes}) => {
        it(value.toString(), () => {
            assert.equal(sizeCalculator(value), sizeInBytes);
        });
    });
};

describe('Low-level binary writer', () => {
    describe('Size of unsigned ints', () => {
        runIntSizeTests(
            sizeOfUnsignedIntTests,
            (value) => LowLevelBinaryWriter.getUnsignedIntSize(value)
        )
    });

    describe('Size of signed ints', () => {
        runIntSizeTests(
            sizeOfSignedIntTests,
            (value) => LowLevelBinaryWriter.getSignedIntSize(value)
        );
    });

    describe('Size of var unsigned ints', () => {
        runIntSizeTests(
            sizeOfVarUnsignedIntTests,
            (value) => LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(value)
        );
    });

    describe('Size of var signed ints', () => {
        runIntSizeTests(
            sizeOfVarSignedIntTests,
            (value) => LowLevelBinaryWriter.getVariableLengthSignedIntSize(value)
        );
    });

    describe('Unsigned ints', () => {
        runIntWritingTests(
            unsignedIntWritingTests,
            (writer, value) => writer.writeUnsignedInt(value)
        );
    });

    describe('Signed ints', () => {
        runIntWritingTests(
            signedIntWritingTests,
            (writer, value) => writer.writeSignedInt(value)
        );
    });

    describe('Var unsigned ints', () => {
        runIntWritingTests(
            varUnsignedIntWritingTests,
            (writer, value) => writer.writeVariableLengthUnsignedInt(value)
        );
    });

    describe('Var signed ints', () => {
        runIntWritingTests(
            varSignedIntWritingTests,
            (writer, value) => writer.writeVariableLengthSignedInt(value)
        );
    });
});