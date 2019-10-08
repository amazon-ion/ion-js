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
        'intern/dojo/node!fs',
        'intern/dojo/node!path',
        'dist/amd/es6/IonTests',
        'dist/amd/es6/IonEventStream',
    ],
    function(intern, registerSuite, assert, fs, paths, ion, es) {
        // TBD split each suite into a different test source file;
        //     perhaps good/bad and equivs/non-equivs pairs belong together

        let goodSuite = { name: 'Good tests' };
        let badSuite = { name: 'Bad tests' };
        let equivsSuite = { name: 'Equivs tests' };
        let nonEquivsSuite = { name: 'Non-equivs tests' };
        let equivTimelinesSuite = { name: 'Equiv timelines tests' };
        let eventStreamSuite = { name: 'EventStream tests' };
        let readerCompareSuite = { name: 'ReaderCompare tests' };

        let goodTestsPath = paths.join('ion-tests', 'iontestdata', 'good');
        findFiles(goodTestsPath).forEach(path => {
            if (!goodSkipList[path]) {
                goodSuite[path] = () => exhaust(ion.makeReader(getInput(path)));
            }
            if (!eventSkipList[path]) {
                eventStreamSuite[path] = () => roundTripEventStreams(ion.makeReader(getInput(path)));
                if (!readerCompareSkipList[path]) {
                    readerCompareSuite[path] = () => readerCompareTest(getInput(path));
                }
            }
        });

        let badTestsPath = paths.join('ion-tests', 'iontestdata', 'bad');
        findFiles(badTestsPath).forEach(path => {
            if (!badSkipList[path]) {
                badSuite[path] = () => assert.throws(() => exhaust(ion.makeReader(getInput(path))));
            }
        });

        let equivsTestsPath = paths.join('ion-tests', 'iontestdata', 'good', 'equivs');
        findFiles(equivsTestsPath).forEach(path => {
            if (!equivsSkipList[path]) {
                equivsSuite[path] = () => equivsTest(path);
            }
        });

        let nonEquivsTestsPath = paths.join('ion-tests', 'iontestdata', 'good', 'non-equivs');
        findFiles(nonEquivsTestsPath).forEach(path => {
            if (!nonEquivsSkipList[path]) {
                nonEquivsSuite[path] = () => nonEquivsTest(path);
            }
        });

        let equivTimelinesPath = paths.join('ion-tests', 'iontestdata', 'good', 'timestamp', 'equivTimeline');
        findFiles(equivTimelinesPath).forEach(path => {
            equivTimelinesSuite[path] = () => equivTimelinesTest(path);
        });

        registerSuite(goodSuite);
        registerSuite(badSuite);
        registerSuite(equivsSuite);
        registerSuite(nonEquivsSuite);
        registerSuite(equivTimelinesSuite);
        registerSuite(eventStreamSuite);
        registerSuite(readerCompareSuite);

        function findFiles(folder, files = []) {
            fs.readdirSync(folder).forEach(file => {
                let path = paths.join(folder, file);
                let stats = fs.lstatSync(path);
                if (stats.isDirectory()) {
                    findFiles(path, files);
                } else {
                    files.push(path);
                }
            });
            return files;
        }

        function exhaust(reader) {
            for (let type; type = reader.next(); ) {
                if (type.isContainer && !reader.isNull()) {
                    reader.stepIn();
                    exhaust(reader);
                    reader.stepOut();
                } else {
                    reader.value();
                }
            }
        }

        function loadValues(path, newWriter) {
            let reader = ion.makeReader(getInput(path));
            let values = [];
            let containerIdx = 0;

            for (let topLevelType; topLevelType = reader.next(); ) {
                if (!topLevelType.isContainer) {
                    throw Error('Expected top-level value to be a container, was ' + topLevelType);
                }

                reader.stepIn();
                values.push([]);

                for (let type; type = reader.next(); ) {
                    let writer = newWriter();
                    writer.writeValue(reader);
                    writer.close();
                    values[containerIdx].push(writer.getBytes());
                }

                containerIdx += 1;
                reader.stepOut();
            }
            return values;
        }

        function bytesToString(c, idx, bytes) {
            let sb = '[' + c + '][' + idx + ']';
            if (bytes.length >= 4 && bytes[0] === 224 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 234) {
                // Ion binary, convert to hex string
                bytes.forEach(b => {
                    sb += ' ' + ('0' + (b & 0xFF).toString(16)).slice(-2);
                });
                return sb;
            }
            // otherwise, text:
            return sb + ' ' + String.fromCharCode.apply(null, bytes);
        }

        function equivsTestCompare(c, i, j, bytesI, bytesJ, expectedEquivalence) {
            let eventStreamI = new es.IonEventStream(ion.makeReader(bytesI));
            let eventStreamJ = new es.IonEventStream(ion.makeReader(bytesJ));
            let result = eventStreamI.equals(eventStreamJ);
            assert(expectedEquivalence ? result : !result,
                'Expected ' + bytesToString(c, i, bytesI)
                + ' to' + (expectedEquivalence ? '' : ' not')
                + ' be equivalent to ' + bytesToString(c, j, bytesJ));
        }

        function equivsTest(path, expectedEquivalence = true, compare = equivsTestCompare) {
            let binaryValues = loadValues(path, () => ion.makeBinaryWriter());
            let textValues = loadValues(path, () => ion.makeTextWriter());

            for (let c = 0; c < binaryValues.length; c++) {
                for (let i = 0; i < binaryValues[c].length; i++) {
                    for (let j = i + 1; j < binaryValues[c].length; j++) {
                        compare(c, i, j, binaryValues[c][i], binaryValues[c][j], expectedEquivalence);
                        compare(c, i, j, binaryValues[c][i], textValues[c][j], expectedEquivalence);
                        compare(c, i, j, textValues[c][i], textValues[c][j], expectedEquivalence);
                    }
                }
            }
        }

        function nonEquivsTest(path) {
            equivsTest(path, false);
        }

        function equivTimelinesTest(path) {
            function timelinesCompare(c, i, j, bytesI, bytesJ) {
                function readTimestamp(bytes) {
                    let reader = ion.makeReader(bytes);
                    reader.next();
                    return reader.value();
                }
                let tsI = readTimestamp(bytesI);
                let tsJ = readTimestamp(bytesJ);
                // assert that the timestamps represent the same instant (but not necessarily data-model equivalent):
                assert(tsI.compareTo(tsJ) === 0, 'Expected ' + tsI + ' to be instant-equivalent to ' + tsJ);
            }
            equivsTest(path, true, timelinesCompare);
        }

        function readerCompareTest(source) {
            function toBytes(source, writer) {
                let reader = ion.makeReader(source);
                writer.writeValues(reader);
                writer.close();
                return writer.getBytes();
            }

            let ionBinary = toBytes(source, ion.makeBinaryWriter());
            let ionText = toBytes(source, ion.makeTextWriter());

            readerCompare(ion.makeReader(ionBinary), ion.makeReader(ionText));
        }

        function readerCompare(r1, r2) {
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

        function checkReaderValueMethods(r1, r2, type) {
            allValueMethods.forEach(methodName => {
                let typeName = type == null ? 'null' : type.name;
                if (type != null && nonThrowingMethods[typeName][methodName]) {
                    let v1 = r1[methodName]();
                    let v2 = r2[methodName]();
                    assert(v1 !== undefined, "unexpected 'undefined' response");
                    assert(v2 !== undefined, "unexpected 'undefined' response");
                    assert.deepEqual(v1, v2, methodName + '():  ' + v1 + ' != ' + v2);
                } else {
                    assert.throws(() => { r1[methodName]() }, '', '', 'Expected ' + methodName + '() to throw');
                    assert.throws(() => { r2[methodName]() }, '', '', 'Expected ' + methodName + '() to throw');
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

        function getInput(path){
            let options = path.endsWith(".10n") ? null : "utf8";
            return fs.readFileSync(path, options);
        }

        function roundTripEventStreams(reader) {
            let streams = [];
            streams.push(new es.IonEventStream(reader));

            let eventWriter = ion.makeTextWriter();
            streams[0].writeEventStream(eventWriter);
            eventWriter.close();
            streams.push(new es.IonEventStream(new ion.makeReader(eventWriter.getBytes())));

            let textWriter = ion.makeTextWriter();
            streams[0].writeIon(textWriter);
            streams.push(new es.IonEventStream(new ion.makeReader(textWriter.getBytes())));

            let binaryWriter = ion.makeBinaryWriter();
            streams[0].writeIon(binaryWriter);
            streams.push(new es.IonEventStream(new ion.makeReader(binaryWriter.getBytes())));

            let eventTextWriter = ion.makeTextWriter();
            streams[0].writeIon(eventTextWriter);
            streams.push(new es.IonEventStream(new ion.makeReader(eventTextWriter.getBytes())));

            let eventBinaryWriter = ion.makeBinaryWriter();
            streams[0].writeIon(eventBinaryWriter);
            streams.push(new es.IonEventStream(new ion.makeReader(eventBinaryWriter.getBytes())));

            for (let i = 0; i < streams.length - 1; i++) {
                for (let j = i + 1; j < streams.length; j++) {
                    if (!streams[i].equals(streams[j])) {
                        throw new Error("Streams unequal.");
                    }
                }
            }
        }
    }
);

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
    null:      {booleanValue: 1, byteValue: 1, decimalValue: 1, numberValue: 1, stringValue: 1, timestampValue: 1, value: 1},
    bool:      {booleanValue: 1, value: 1},
    int:       {numberValue: 1, value: 1},
    float:     {numberValue: 1, value: 1},
    decimal:   {decimalValue: 1, value: 1},
    timestamp: {timestampValue: 1, value: 1},
    symbol:    {stringValue: 1, value: 1},
    string:    {stringValue: 1, value: 1},
    clob:      {byteValue: 1, value: 1},
    blob:      {byteValue: 1, value: 1},
    list:      {},
    sexp:      {},
    struct:    {},
};

function toSkipList(paths) {
    let skipList = {};
    paths.forEach(path => {
        skipList[path] = 1;
    });

    // additional, known bad/slow test files:
    skipList['ion-tests/iontestdata/good/equivs/lists.ion'] = 1;     // runs too long, causes TravisCI to fail
    skipList['ion-tests/iontestdata/good/equivs/sexps.ion'] = 1;     // runs too long, causes TravisCI to fail

    return skipList;
}


////// beginning of generated skiplists

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
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',

    // Support for reading LongInts was removed as part of: https://github.com/amzn/ion-js/issues/310
    'ion-tests/iontestdata/good/equivs/paddedInts.10n',
    'ion-tests/iontestdata/good/intBigSize1201.10n',
    'ion-tests/iontestdata/good/intBigSize13.10n',
    'ion-tests/iontestdata/good/intBigSize14.10n',
    'ion-tests/iontestdata/good/intBigSize16.10n',
    'ion-tests/iontestdata/good/intBigSize256.10n',
    'ion-tests/iontestdata/good/intLongMaxValuePlusOne.10n',
    'ion-tests/iontestdata/good/intLongMinValue.10n',
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
]);

let eventSkipList = toSkipList([
    'ion-tests/iontestdata/good/allNulls.ion',
    'ion-tests/iontestdata/good/clobWithNonAsciiCharacter.10n',
    'ion-tests/iontestdata/good/clobs.ion',
    'ion-tests/iontestdata/good/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/bigInts.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/ints.ion',
    'ion-tests/iontestdata/good/equivs/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/nopPadEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/nopPadNonEmptyStruct.10n',
    'ion-tests/iontestdata/good/equivs/paddedInts.10n',
    'ion-tests/iontestdata/good/equivs/systemSymbols.ion',
    'ion-tests/iontestdata/good/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/innerVersionIdentifiers.ion',
    'ion-tests/iontestdata/good/intBigSize1201.10n',
    'ion-tests/iontestdata/good/intBigSize13.10n',
    'ion-tests/iontestdata/good/intBigSize14.10n',
    'ion-tests/iontestdata/good/intBigSize16.10n',
    'ion-tests/iontestdata/good/intBigSize256.10n',
    'ion-tests/iontestdata/good/intBigSize256.ion',
    'ion-tests/iontestdata/good/intBigSize512.ion',
    'ion-tests/iontestdata/good/intBinary.ion',
    'ion-tests/iontestdata/good/intLongMaxValuePlusOne.10n',
    'ion-tests/iontestdata/good/intLongMinValue.10n',
    'ion-tests/iontestdata/good/integer_values.ion',
    'ion-tests/iontestdata/good/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/lists.ion',
    'ion-tests/iontestdata/good/non-equivs/floats.ion',
    'ion-tests/iontestdata/good/non-equivs/ints.ion',
    'ion-tests/iontestdata/good/non-equivs/nulls.ion',
    'ion-tests/iontestdata/good/nopPadInsideEmptyStructZeroSymbolId.10n',
    'ion-tests/iontestdata/good/nopPadInsideStructWithNopPadThenValueZeroSymbolId.10n',
    'ion-tests/iontestdata/good/nopPadInsideStructWithValueThenNopPad.10n',
    'ion-tests/iontestdata/good/notVersionMarkers.ion',
    'ion-tests/iontestdata/good/nullList.10n',
    'ion-tests/iontestdata/good/nullSexp.10n',
    'ion-tests/iontestdata/good/nullStruct.10n',
    'ion-tests/iontestdata/good/nulls.ion',
    'ion-tests/iontestdata/good/sexpAnnotationQuotedOperator.ion',
    'ion-tests/iontestdata/good/subfieldUInt.ion',
    'ion-tests/iontestdata/good/subfieldVarInt.ion',
    'ion-tests/iontestdata/good/symbolExplicitZero.10n',
    'ion-tests/iontestdata/good/symbolImplicitZero.10n',
    'ion-tests/iontestdata/good/symbolZero.ion',
    'ion-tests/iontestdata/good/testfile22.ion',
    'ion-tests/iontestdata/good/testfile23.ion',
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',
]);

let readerCompareSkipList = toSkipList([
]);

let equivsSkipList = toSkipList([
    'ion-tests/iontestdata/good/equivs/annotatedIvms.ion',
    'ion-tests/iontestdata/good/equivs/bigInts.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/ints.ion',
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
    'ion-tests/iontestdata/good/equivs/utf8/stringU0001D11E.ion',
    'ion-tests/iontestdata/good/equivs/utf8/stringUtf8.ion',

    // See: https://github.com/amzn/ion-js/issues/310
    'ion-tests/iontestdata/good/equivs/paddedInts.10n',
]);

let nonEquivsSkipList = toSkipList([
    'ion-tests/iontestdata/good/non-equivs/clobs.ion',
    'ion-tests/iontestdata/good/non-equivs/floats.ion',
    'ion-tests/iontestdata/good/non-equivs/floatsVsDecimals.ion',

    // See: https://github.com/amzn/ion-js/issues/310
    'ion-tests/iontestdata/good/non-equivs/ints.ion',
]);

////// end of generated skiplists


/*
  notes from the previous skipList mechanism:
    'good/intBinary.ion', //binaryInts unsupported.
    'good/integer_values.ion', //binary ints unsupported.
    'good/intsWithUnderscores.ion', //binary ints unsupported.
    'good/intBigSize256.ion', //int maxsize limitation.
    'good/equivs/intsWithUnderscores.ion', //binary ints unsupported.
    'good/equivs/binaryInts.ion', //binary ints unsupported.
    'good/floatsWithUnderscores.ion', //numbers with underscores unsupported.
    'good/equivs/floatsWithUnderscores.ion', //numbers with underscores unsupported.
    'good/equivs/decimalsWithUnderscores.ion', //numbers with underscores unsupported.
    'good/decimalsWithUnderscores.ion', //numbers with underscores unsupported.
    'good/equivs/bigInts.ion', //numbers unsupported by js's int or float are unsupported.
    'good/intBigSize512.ion', //int maxsize limitation.
    'good/symbolZero.ion', //no symboltoken support as of yet.
    'good/testfile12.ion',
    'good/non-equivs/nonNulls.ion',
    'good/equivs/utf8/stringU0001D11E.ion',
    'good/equivs/structComments.ion',
    'good/equivs/sexps.ion',
    'good/equivs/lists.ion',
 */

