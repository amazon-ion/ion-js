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
import * as fs from 'fs';
import * as path from 'path';
import {IonEventStream} from '../src/IonEventStream';
import {IonEventType} from '../src/IonEvent';
import {IonType, Reader, Writer} from '../src/Ion';

function findFiles(folder: string, files: string[] = []) {
    fs.readdirSync(folder).forEach(file => {
        let filePath = path.join(folder, file);
        let stats = fs.lstatSync(filePath);
        if (stats.isDirectory()) {
            findFiles(filePath, files);
        } else {
            files.push(filePath);
        }
    });
    return files;
}

function exhaust(reader: Reader) {
    for (let type; type = reader.next();) {
        if (type.isContainer && !reader.isNull()) {
            reader.stepIn();
            exhaust(reader);
            reader.stepOut();
        } else {
            reader.value();
        }
    }
}

function makeEventStream(src: string | Buffer | Uint8Array, writer: Writer): IonEventStream {
    writer.writeValues(ion.makeReader(src));
    writer.close();
    return new IonEventStream(ion.makeReader(writer.getBytes()));
}

function equivsTest(path: string, expectedEquivalence = true, equivsTimelines = false) {
    let bytes = getInput(path)
    let originalEvents = new IonEventStream(ion.makeReader(bytes)).getEvents();
    let textEvents = makeEventStream(bytes, ion.makeTextWriter()).getEvents();
    let binEvents = makeEventStream(bytes, ion.makeBinaryWriter()).getEvents();

    //i is the index of each toplevel container start event
    for (let i = 0; i < originalEvents.length - 2; i += originalEvents[i].ionValue.length + 1) {
        let event = originalEvents[i];
        let textEvent = textEvents[i];
        let binEvent = binEvents[i];
        //Comparisons can be either IonEventStream[](Embedded Documents List of strings interpreted as top level streams).
        //Or an IonEvent[](contents of an sexp of equivalent Ion values).
        let comparisons : any = [];
        if (event.annotations[0] === 'embedded_documents') {
            //we found a list of strings that we need to interpret as top level ion text streams.
            for (let j = 0; j < event.ionValue.length - 1; j++) {
                comparisons.push(
                    [
                        new IonEventStream(ion.makeReader(event.ionValue[j].ionValue)),
                        new IonEventStream(ion.makeReader(textEvent.ionValue[j].ionValue)),
                        new IonEventStream(ion.makeReader(binEvent.ionValue[j].ionValue))
                    ]
                );
            }
        } else {//we're in an sexp
            for (let j = 0; j < event.ionValue.length - 1; j++) {
                comparisons.push([event.ionValue[j], textEvent.ionValue[j], binEvent.ionValue[j]]);
                if (event.ionValue[j].eventType === IonEventType.CONTAINER_START) {
                    j += event.ionValue[j].ionValue.length
                }
            }
        }
        //width is the number of "copies"  of each value (original, text, binary)
        let width = comparisons[0].length;
        //if we're equal everybody equals everybody
        //if !eq only the copies in our row are equal
        //every value in row j must compare with every other row
        for (let j = 0; j < comparisons.length; j++) {
            for (let k = j + 1; k < comparisons.length; k++) {
                //l tracks our index within row j
                for (let l = 0; l < width; l++) {
                    //m tracks our index within row k
                    for (let m = 0; m < width; m++) {
                        if (equivsTimelines) {
                            assert.equal(comparisons[j][l].ionValue.compareTo(comparisons[k][m].ionValue), 0);
                        } else {
                            assert.equal(comparisons[j][l].equals(comparisons[k][m]), expectedEquivalence);
                        }
                    }
                }
            }
        }
    }
}

function nonEquivsTest(path: string) {
    equivsTest(path, false);
}

function equivTimelinesTest(path: string) {
    equivsTest(path, true, true);
}

function readerCompareTest(source: string | Buffer) {
    function toBytes(source: string | Buffer, writer: Writer) {
        let reader = ion.makeReader(source);
        writer.writeValues(reader);
        writer.close();
        return writer.getBytes();
    }

    let ionBinary = toBytes(source, ion.makeBinaryWriter());
    let ionText = toBytes(source, ion.makeTextWriter());

    readerCompare(ion.makeReader(ionBinary), ion.makeReader(ionText));
}

function readerCompare(r1: Reader, r2: Reader) {
    checkReaderValueMethods(r1, r2, null);

    while (true) {
        let t1 = r1.next();
        let t2 = r2.next();

        let v;
        try {
            v = r1.value();
        } catch (e) {
            v = 'value() threw ' + e.message;
        }
        assert.equal(t1, t2);

        checkReaderValueMethods(r1, r2, t1);

        if (t1 === null) {
            break;
        }

        if (t1.isContainer && !r1.isNull()) {
            r1.stepIn();
            r2.stepIn();
            readerCompare(r1, r2);
            r1.stepOut();
            r2.stepOut();
        }
    }
}

function checkReaderValueMethods(r1: Reader, r2: Reader, type: IonType | null) {
    // This RegEx will immediately match any string that's passed to it.
    // It's used to allow assert.throws() to accept any Error that's thrown.
    const ANY_ERROR_MESSAGE = new RegExp('^');
    allValueMethods.forEach(methodName => {
        let typeName = type == null ? 'null' : type.name;
        if (type != null && nonThrowingMethods[typeName][methodName]) {
            let v1 = r1[methodName]();
            let v2 = r2[methodName]();
            assert(v1 !== undefined, "unexpected 'undefined' response");
            assert(v2 !== undefined, "unexpected 'undefined' response");
            assert.deepEqual(v1, v2, methodName + '():  ' + v1 + ' != ' + v2);
        } else if (type != null && methodName === 'value' && type.isContainer && r1.isNull()) {
            // special case for Reader.value() when the readers are pointed at a null container
            assert.isNull(r1[methodName](), 'Expected ' + methodName + '() to return null');
            assert.isNull(r2[methodName](), 'Expected ' + methodName + '() to return null');
        } else {
            assert.throws(() => {
                r1[methodName]()
            }, ANY_ERROR_MESSAGE, 'Expected ' + methodName + '() to throw');
            assert.throws(() => {
                r2[methodName]()
            }, ANY_ERROR_MESSAGE, 'Expected ' + methodName + '() to throw');
        }
    });

    assert(r1.depth() !== undefined, 'depth() is undefined');
    assert(r1.depth() !== null, 'depth() is null');
    assert(r1.depth() >= 0, 'depth() is less than 0');
    assert.equal(r1.depth(), r2.depth(), "depths don't match");

    assert(r1.fieldName() !== undefined, 'fieldname() is undefined');
    assert.equal(r1.fieldName(), r2.fieldName(), "fieldnames don't match");

    assert(r1.isNull() !== undefined, 'isNull() is undefined');
    assert(r1.isNull() !== null, 'isNull() is null');
    assert.equal(r1.isNull(), r2.isNull(), "isNull values don't match");

    assert(r1.annotations() !== undefined, 'annotations() is undefined');
    assert(r1.annotations() !== null, 'annotations() is null');
    assert.deepEqual(r1.annotations(), r2.annotations(), "annotations don't match");

    assert(r1.type() !== undefined, 'type() is undefined');
    assert.equal(r1.type(), type, "type() doesn't match expected type");
    assert.equal(r1.type(), r2.type(), "types don't match");
}

function getInput(path: string): string | Buffer {
    let options = path.endsWith(".10n") ? null : "utf8";
    return fs.readFileSync(path, options);
}

function roundTripEventStreams(input: string | Buffer) {
    let streams: IonEventStream[] = [];
    streams.push(new IonEventStream(ion.makeReader(input)));

    let textWriter = ion.makeTextWriter();
    streams.push(makeEventStream(input, textWriter));
    let text = textWriter.getBytes();

    let binaryWriter = ion.makeBinaryWriter();
    streams.push(makeEventStream(input, binaryWriter));
    let binary = binaryWriter.getBytes();

    // text -> text -> eventstream
    streams.push(makeEventStream(text, ion.makeTextWriter()));

    // text -> binary -> eventstream
    streams.push(makeEventStream(text, ion.makeBinaryWriter()));

    // binary -> text -> eventstream
    streams.push(makeEventStream(binary, ion.makeTextWriter()));

    // binary -> binary -> eventstream
    streams.push(makeEventStream(binary, ion.makeBinaryWriter()));

    // eventstream -> eventstream
    textWriter = ion.makeTextWriter();
    streams[0].writeEventStream(textWriter);
    textWriter.close();
    streams.push(new IonEventStream(ion.makeReader(textWriter.getBytes())));

    for (let i = 0; i < streams.length - 1; i++) {
        for (let j = i + 1; j < streams.length; j++) {
            if (!streams[i].equals(streams[j])) {
                throw new Error("Streams unequal.");
            }
        }
    }
}

// TBD:  add some mechanism to know when this list needs to be updated
//       (e.g., a class that implements IonReader)
let allValueMethods = [
    'booleanValue',
    'byteValue',
    'decimalValue',
    'numberValue',
    'stringValue',
    'timestampValue',
    'value',
];
let nonThrowingMethods = {
    null: {booleanValue: 1, byteValue: 1, decimalValue: 1, numberValue: 1, stringValue: 1, timestampValue: 1, value: 1},
    bool: {booleanValue: 1, value: 1},
    int: {numberValue: 1, value: 1},
    float: {numberValue: 1, value: 1},
    decimal: {decimalValue: 1, value: 1},
    timestamp: {timestampValue: 1, value: 1},
    symbol: {stringValue: 1, value: 1},
    string: {stringValue: 1, value: 1},
    clob: {byteValue: 1, value: 1},
    blob: {byteValue: 1, value: 1},
    list: {},
    sexp: {},
    struct: {},
};

function toSkipList(paths: Array<string>): Map<string, number> {
    let skipList = new Map<string, number>();
    paths.forEach(path => {
        skipList[path] = 1;
    });

    // additional, known bad/slow test files:
    skipList['ion-tests/iontestdata/good/equivs/lists.ion'] = 1;     // runs too long, causes TravisCI to fail
    skipList['ion-tests/iontestdata/good/equivs/sexps.ion'] = 1;     // runs too long, causes TravisCI to fail

    return skipList;
}

let goodSkipList = toSkipList([
    'ion-tests/iontestdata/good/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/intBinary.ion',
    'ion-tests/iontestdata/good/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/symbolZero.ion',
    'ion-tests/iontestdata/good/symbolExplicitZero.10n',
    'ion-tests/iontestdata/good/symbolImplicitZero.10n',
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',
    'ion-tests/iontestdata/good/item1.10n',
    'ion-tests/iontestdata/good/typecodes/T7-large.10n', // https://github.com/amzn/ion-js/issues/541
    'ion-tests/iontestdata/good/typecodes/T7-small.10n', // https://github.com/amzn/ion-js/issues/541
]);

let badSkipList = toSkipList([
    'ion-tests/iontestdata/bad/annotationLengthTooLongContainer.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooLongScalar.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooShortContainer.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooShortScalar.10n',
    'ion-tests/iontestdata/bad/annotationNested.10n',
    'ion-tests/iontestdata/bad/annotationWithNoValue.10n',
    'ion-tests/iontestdata/bad/emptyAnnotatedInt.10n',
    'ion-tests/iontestdata/bad/localSymbolTableImportNullMaxId.ion',
    'ion-tests/iontestdata/bad/negativeIntZero.10n',
    'ion-tests/iontestdata/bad/negativeIntZeroLn.10n',
    'ion-tests/iontestdata/bad/nopPadWithAnnotations.10n',
    'ion-tests/iontestdata/bad/structOrderedEmpty.10n',
    'ion-tests/iontestdata/bad/timestamp/timestampNegativeFraction.10n',
    'ion-tests/iontestdata/bad/timestamp/timestampSept31.10n',
    'ion-tests/iontestdata/bad/timestamp/outOfRange/leapDayNonLeapYear_1.10n',
    'ion-tests/iontestdata/bad/timestamp/outOfRange/leapDayNonLeapYear_2.10n',
    'ion-tests/iontestdata/bad/annotationSymbolIDUnmapped.10n', // https://github.com/amzn/ion-js/issues/542
    'ion-tests/iontestdata/bad/annotationSymbolIDUnmapped.ion', // https://github.com/amzn/ion-js/issues/542
    'ion-tests/iontestdata/bad/fieldNameSymbolIDUnmapped.10n', // https://github.com/amzn/ion-js/issues/542
    'ion-tests/iontestdata/bad/fieldNameSymbolIDUnmapped.ion', // https://github.com/amzn/ion-js/issues/542
    'ion-tests/iontestdata/bad/timestamp/timestampFraction10d-1.10n', // https://github.com/amzn/ion-js/issues/543
    'ion-tests/iontestdata/bad/timestamp/timestampFraction11d-1.10n', // https://github.com/amzn/ion-js/issues/543
    'ion-tests/iontestdata/bad/timestamp/timestampFraction1d0.10n', // https://github.com/amzn/ion-js/issues/543
    'ion-tests/iontestdata/bad/typecodes/type_15_length_0.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_1.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_10.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_11.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_12.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_13.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_14.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_15.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_2.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_3.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_4.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_5.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_6.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_7.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_8.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_15_length_9.10n', // https://github.com/amzn/ion-js/issues/544
    'ion-tests/iontestdata/bad/typecodes/type_1_length_10.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_11.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_12.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_13.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_14.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_2.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_3.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_4.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_5.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_6.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_7.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_8.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_1_length_9.10n', // https://github.com/amzn/ion-js/issues/545
    'ion-tests/iontestdata/bad/typecodes/type_3_length_0.10n', // https://github.com/amzn/ion-js/issues/546
    'ion-tests/iontestdata/bad/typecodes/type_6_length_0.10n', // https://github.com/amzn/ion-js/issues/547
]);

let eventSkipList = toSkipList([
    'ion-tests/iontestdata/good/allNulls.ion',
    'ion-tests/iontestdata/good/clobWithNonAsciiCharacter.10n',
    'ion-tests/iontestdata/good/clobs.ion',
    'ion-tests/iontestdata/good/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/nopPadEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/nopPadNonEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/paddedInts.10n',
    'ion-tests/iontestdata/good/equivs/systemSymbols.ion',
    'ion-tests/iontestdata/good/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/innerVersionIdentifiers.ion',
    'ion-tests/iontestdata/good/intBinary.ion',
    'ion-tests/iontestdata/good/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/lists.ion',
    'ion-tests/iontestdata/good/nopPadInsideEmptyStructZeroSymbolId.10n',
    'ion-tests/iontestdata/good/nopPadInsideStructWithNopPadThenValueZeroSymbolId.10n',
    'ion-tests/iontestdata/good/nopPadInsideStructWithValueThenNopPad.10n',
    'ion-tests/iontestdata/good/notVersionMarkers.ion',
    'ion-tests/iontestdata/good/sexpAnnotationQuotedOperator.ion',
    'ion-tests/iontestdata/good/subfieldVarInt.ion',
    'ion-tests/iontestdata/good/symbolExplicitZero.10n',
    'ion-tests/iontestdata/good/symbolImplicitZero.10n',
    'ion-tests/iontestdata/good/symbolZero.ion',
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',
    'ion-tests/iontestdata/good/item1.10n',
    'ion-tests/iontestdata/good/typecodes/T6-large.10n', // https://github.com/amzn/ion-js/issues/554
    'ion-tests/iontestdata/good/typecodes/T11.10n', // https://github.com/amzn/ion-js/issues/548
    'ion-tests/iontestdata/good/typecodes/T12.10n', // https://github.com/amzn/ion-js/issues/548
    'ion-tests/iontestdata/good/typecodes/T13.10n', // https://github.com/amzn/ion-js/issues/548
    'ion-tests/iontestdata/good/typecodes/T7-large.10n', // https://github.com/amzn/ion-js/issues/549
    'ion-tests/iontestdata/good/typecodes/T7-small.10n', // https://github.com/amzn/ion-js/issues/549
]);

let readerCompareSkipList = toSkipList([]);

let equivsSkipList = toSkipList([
    'ion-tests/iontestdata/good/equivs/annotatedIvms.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/localSymbolTableAppend.ion',
    'ion-tests/iontestdata/good/equivs/localSymbolTableNullSlots.ion',
    'ion-tests/iontestdata/good/equivs/localSymbolTables.ion',
    'ion-tests/iontestdata/good/equivs/nonIVMNoOps.ion',
    'ion-tests/iontestdata/good/equivs/nopPadEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/nopPadNonEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/structsFieldsDiffOrder.ion',
    'ion-tests/iontestdata/good/equivs/systemSymbols.ion',
    'ion-tests/iontestdata/good/equivs/systemSymbolsAsAnnotations.ion',
    'ion-tests/iontestdata/good/equivs/textNewlines.ion',

    'ion-tests/iontestdata/good/equivs/clobNewlines.ion', // https://github.com/amzn/ion-js/issues/550
    'ion-tests/iontestdata/good/equivs/localSymbolTableWithAnnotations.ion', // https://github.com/amzn/ion-js/issues/551
    'ion-tests/iontestdata/good/equivs/longStringsWithComments.ion', // https://github.com/amzn/ion-js/issues/552
]);

let nonEquivsSkipList = toSkipList([
    'ion-tests/iontestdata/good/non-equivs/clobs.ion',
    'ion-tests/iontestdata/good/non-equivs/floats.ion',
    'ion-tests/iontestdata/good/non-equivs/floatsVsDecimals.ion',
    'ion-tests/iontestdata/good/non-equivs/symbolTablesUnknownText.ion',//Cannot pass until we implement symbol token support.
]);

let goodTestsPath = path.join('ion-tests', 'iontestdata', 'good');
let badTestsPath = path.join('ion-tests', 'iontestdata', 'bad');
let equivTestsPath = path.join('ion-tests', 'iontestdata', 'good', 'equivs');
let nonEquivTestsPath = path.join('ion-tests', 'iontestdata', 'good', 'non-equivs');
let equivTimelineTestsPath = path.join('ion-tests', 'iontestdata', 'good', 'timestamp', 'equivTimeline');

let goodTestFiles = findFiles(goodTestsPath);
let badTestFiles = findFiles(badTestsPath);
let equivTestFiles = findFiles(equivTestsPath);
let nonEquivTestFiles = findFiles(nonEquivTestsPath);
let equivTimelineTestFiles = findFiles(equivTimelineTestsPath);

function skipOrTest(paths: Array<string>, skipLists: Array<Map<string, number>>, test: (s: string) => void): void {
    for (let path of paths) {
        let skipped = false;

        if (path.endsWith('.md')) {
            skipped = true;
        } else {
            for (let skipList of skipLists) {
                if (skipList[path]) {
                    it.skip(path, () => {});
                    skipped = true;
                    break;
                }
            }
        }
        if (!skipped) {
            it(path, () => test(path));
        }
    }
}

describe('ion-tests', () => {
    describe('Good', () => {
        skipOrTest(
            goodTestFiles,
            [goodSkipList],
            (path) => exhaust(ion.makeReader(getInput(path)))
        );
    });

    describe('Bad', () => {
        skipOrTest(
            badTestFiles,
            [badSkipList],
            (path) => assert.throws(() => exhaust(ion.makeReader(getInput(path))))
        );
    });

    describe('Equivs', () => {
        skipOrTest(
            equivTestFiles,
            [equivsSkipList],
            (path) => equivsTest(path)
        );
    });

    describe('Non-equivs', () => {
        skipOrTest(
            nonEquivTestFiles,
            [nonEquivsSkipList],
            (path) => nonEquivsTest(path)
        );
    });

    describe('Equiv timelines', () => {
        skipOrTest(
            equivTimelineTestFiles,
            [],
            (path) => equivTimelinesTest(path)
        );
    });

    describe('EventStream', () => {
        skipOrTest(
            // Re-use the 'good' file set
            goodTestFiles,
            [eventSkipList],
            (path) => roundTripEventStreams(getInput(path))
        );
    });

    describe('ReaderCompare', () => {
        skipOrTest(
            // Re-use the 'good' file set
            goodTestFiles,
            [eventSkipList, readerCompareSkipList],
            (path) => readerCompareTest(getInput(path))
        );
    });
});
