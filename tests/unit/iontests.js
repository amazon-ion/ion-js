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
    ],
    function(intern, registerSuite, assert, fs, paths, ion) {
        let goodSuite = { name: 'Good tests' };
        let badSuite = { name: 'Bad tests' };
        let eventStreamSuite = { name: 'EventStream tests' };
        let readerCompareSuite = { name: 'ReaderCompare tests' };

        let goodTestsPath = paths.join('ion-tests', 'iontestdata', 'good');
        findFiles(goodTestsPath).forEach(path => {
            if (!goodSkipList[path]) {
                goodSuite[path] = () => { exhaust(ion.makeReader(getInput(path))) };
            }
            if (!eventSkipList[path]) {
                eventStreamSuite[path] = () => { roundTripEventStreams(ion.makeReader(getInput(path))) };
                if (!readerCompareSkipList[path]) {
                    readerCompareSuite[path] = () => { readerCompareTest(getInput(path)) };
                }
            }
        });

        let badTestsPath = paths.join('ion-tests', 'iontestdata', 'bad');
        findFiles(badTestsPath).forEach(path => {
            if (!badSkipList[path]) {
                badSuite[path] = () => { assert.throws(() => { exhaust(ion.makeReader(getInput(path))) }) };
            }
        });

        registerSuite(goodSuite);
        registerSuite(badSuite);
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
                if (type.container && !reader.isNull()) {
                    reader.stepIn();
                    exhaust(reader);
                    reader.stepOut();
                } else {
                    reader.value();
                }
            }
        }

        function readerCompareTest(source) {
            function toBytes(source, writer) {
                let reader = ion.makeReader(source);
                writeTo(reader, writer);
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

                if (t1.container && !r1.isNull()) {
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

            assert(r1.annotations() !== undefined, 'annotations() is udnefined');
            assert(r1.annotations() !== null, 'annotations() is null');
            assert.deepEqual(r1.annotations(), r2.annotations(), "annotations don't match");
        }

        // TBD:  move this (or equivalent code) to a public API (pending addition of IonReader.type())
        function writeTo(reader, writer, depth = 0) {
            for (let type; type = reader.next(); ) {
                if (depth > 0) {
                    if (reader.fieldName() != undefined) {
                        writer.writeFieldName(reader.fieldName());
                    }
                }
                if (reader.isNull()) {
                    writer.writeNull(type.bid, reader.annotations());
                } else {
                    switch (type) {
                        case ion.IonTypes.BOOL:      writer.writeBoolean(reader.booleanValue(), reader.annotations()); break;
                        case ion.IonTypes.INT:       writer.writeInt(reader.numberValue(), reader.annotations()); break;
                        case ion.IonTypes.FLOAT:     writer.writeFloat64(reader.numberValue(), reader.annotations()); break;
                        case ion.IonTypes.DECIMAL:   writer.writeDecimal(reader.decimalValue(), reader.annotations()); break;
                        case ion.IonTypes.TIMESTAMP: writer.writeTimestamp(reader.timestampValue(), reader.annotations()); break;
                        case ion.IonTypes.SYMBOL:    writer.writeSymbol(reader.stringValue(), reader.annotations()); break;
                        case ion.IonTypes.STRING:    writer.writeString(reader.stringValue(), reader.annotations()); break;
                        case ion.IonTypes.CLOB:      writer.writeClob(reader.byteValue(), reader.annotations()); break;
                        case ion.IonTypes.BLOB:      writer.writeBlob(reader.byteValue(), reader.annotations()); break;
                        case ion.IonTypes.LIST:      writer.writeList(reader.annotations()); break;
                        case ion.IonTypes.SEXP:      writer.writeSexp(reader.annotations()); break;
                        case ion.IonTypes.STRUCT:    writer.writeStruct(reader.annotations()); break;
                        default: throw new Error('Unrecognized type' + type);
                    }
                    if (type.container) {
                        reader.stepIn();
                        writeTo(reader, writer, depth + 1);
                        writer.endContainer();
                        reader.stepOut();
                    }
                }
            }
        }

        function getInput(path){
            let options = path.endsWith(".10n") ? null : "utf8";
            return fs.readFileSync(path, options);
        }

        function roundTripEventStreams(reader) {
            let streams = [];
            streams.push(new ion.IonEventStream(reader));

            let eventWriter = ion.makeTextWriter();
            streams[0].writeEventStream(eventWriter);
            eventWriter.close();
            streams.push(new ion.IonEventStream(new ion.makeReader(eventWriter.getBytes())));

            let textWriter = ion.makeTextWriter();
            streams[0].writeIon(textWriter);
            streams.push(new ion.IonEventStream(new ion.makeReader(textWriter.getBytes())));

            let binaryWriter = ion.makeBinaryWriter();
            streams[0].writeIon(binaryWriter);
            streams.push(new ion.IonEventStream(new ion.makeReader(binaryWriter.getBytes())));

            let eventTextWriter = ion.makeTextWriter();
            streams[0].writeIon(eventTextWriter);
            streams.push(new ion.IonEventStream(new ion.makeReader(eventTextWriter.getBytes())));

            let eventBinaryWriter = ion.makeBinaryWriter();
            streams[0].writeIon(eventBinaryWriter);
            streams.push(new ion.IonEventStream(new ion.makeReader(eventBinaryWriter.getBytes())));

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
    skipList['ion-tests/iontestdata/good/subfieldVarUInt32bit.ion'] = 1;
    skipList['ion-tests/iontestdata/good/equivs/lists.ion'] = 1;     // runs too long, causes TravisCI to fail
    skipList['ion-tests/iontestdata/good/equivs/sexps.ion'] = 1;     // runs too long, causes TravisCI to fail

    return skipList;
}


////// beginning of generated skiplists

let goodSkipList = toSkipList([
    'ion-tests/iontestdata/good/decimal64BitBoundary.ion',
    'ion-tests/iontestdata/good/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/binaryInts.ion',
    'ion-tests/iontestdata/good/equivs/decimalsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/equivs/timestampFractions.10n',
    'ion-tests/iontestdata/good/floatsWithUnderscores.ion',
    'ion-tests/iontestdata/good/intBinary.ion',
    'ion-tests/iontestdata/good/intsWithUnderscores.ion',
    'ion-tests/iontestdata/good/item1.10n',
    'ion-tests/iontestdata/good/symbolZero.ion',
    'ion-tests/iontestdata/good/timestamp/timestamp2011-02-20T19_30_59_100-08_00.10n',
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',
]);

let badSkipList = toSkipList([
    'ion-tests/iontestdata/bad/annotationLengthTooLongContainer.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooLongScalar.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooShortContainer.10n',
    'ion-tests/iontestdata/bad/annotationLengthTooShortScalar.10n',
    'ion-tests/iontestdata/bad/annotationNested.10n',
    'ion-tests/iontestdata/bad/annotationWithNoValue.10n',
    'ion-tests/iontestdata/bad/blobLenTooLarge.10n',
    'ion-tests/iontestdata/bad/clobLenTooLarge.10n',
    'ion-tests/iontestdata/bad/emptyAnnotatedInt.10n',
    'ion-tests/iontestdata/bad/floatLenTooLarge.10n',
    'ion-tests/iontestdata/bad/localSymbolTableImportNullMaxId.ion',
    'ion-tests/iontestdata/bad/minLongWithLenTooLarge.10n',
    'ion-tests/iontestdata/bad/negativeIntZero.10n',
    'ion-tests/iontestdata/bad/negativeIntZeroLn.10n',
    'ion-tests/iontestdata/bad/nopPadWithAnnotations.10n',
    'ion-tests/iontestdata/bad/stringLenTooLarge.10n',
    'ion-tests/iontestdata/bad/structOrderedEmpty.10n',
    'ion-tests/iontestdata/bad/timestamp/timestampHourWithoutMinute.10n',
]);

let eventSkipList = toSkipList([
    'ion-tests/iontestdata/good/allNulls.ion',
    'ion-tests/iontestdata/good/clobWithNonAsciiCharacter.10n',
    'ion-tests/iontestdata/good/clobs.ion',
    'ion-tests/iontestdata/good/decimal64BitBoundary.ion',
    'ion-tests/iontestdata/good/decimal_e_values.ion',
    'ion-tests/iontestdata/good/decimal_values.ion',
    'ion-tests/iontestdata/good/decimalNegativeOneDotTwoEight.ion',
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
    'ion-tests/iontestdata/good/equivs/timestampFractions.10n',
    'ion-tests/iontestdata/good/equivs/timestampFractions.ion',
    'ion-tests/iontestdata/good/equivs/timestampSuperfluousOffset.10n',
    'ion-tests/iontestdata/good/equivs/timestamps.ion',
    'ion-tests/iontestdata/good/equivs/timestampsLargeFractionalPrecision.ion',
    'ion-tests/iontestdata/good/floatSpecials.ion',
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
    'ion-tests/iontestdata/good/item1.10n',
    'ion-tests/iontestdata/good/lists.ion',
    'ion-tests/iontestdata/good/non-equivs/floats.ion',
    'ion-tests/iontestdata/good/non-equivs/ints.ion',
    'ion-tests/iontestdata/good/non-equivs/nulls.ion',
    'ion-tests/iontestdata/good/non-equivs/timestamps.ion',
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
    'ion-tests/iontestdata/good/testfile13.ion',
    'ion-tests/iontestdata/good/testfile21.ion',
    'ion-tests/iontestdata/good/testfile22.ion',
    'ion-tests/iontestdata/good/testfile23.ion',
    'ion-tests/iontestdata/good/testfile25.ion',
    'ion-tests/iontestdata/good/testfile31.ion',
    'ion-tests/iontestdata/good/testfile33.ion',
    'ion-tests/iontestdata/good/testfile35.ion',
    'ion-tests/iontestdata/good/timestamp/equivTimeline/leapDayRollover.ion',
    'ion-tests/iontestdata/good/timestamp/equivTimeline/timestamps.ion',
    'ion-tests/iontestdata/good/timestamp/leapDay.ion',
    'ion-tests/iontestdata/good/timestamp/timestamp2011-02-20T19_30_59_100-08_00.10n',
    'ion-tests/iontestdata/good/timestamp/timestamp2011-02.10n',
    'ion-tests/iontestdata/good/timestamp/timestamp2011.10n',
    'ion-tests/iontestdata/good/timestamp/timestampWithTerminatingEof.ion',
    'ion-tests/iontestdata/good/timestamp/timestamps.ion',
    'ion-tests/iontestdata/good/utf16.ion',
    'ion-tests/iontestdata/good/utf32.ion',
    'ion-tests/iontestdata/good/decimalNegativeZeroDot.10n',
    'ion-tests/iontestdata/good/decimalNegativeZeroDotZero.10n',
    'ion-tests/iontestdata/good/decimal_zeros.ion',
    'ion-tests/iontestdata/good/equivs/zeroDecimals.ion',
    'ion-tests/iontestdata/good/non-equivs/decimals.ion',
    'ion-tests/iontestdata/good/non-equivs/floatsVsDecimals.ion',
    'ion-tests/iontestdata/good/non-equivs/nonNulls.ion',
    'ion-tests/iontestdata/good/nonNulls.ion',


]);

let readerCompareSkipList = toSkipList([
    'ion-tests/iontestdata/good/decimal_zeros.ion',
    'ion-tests/iontestdata/good/subfieldInt.ion',
    'ion-tests/iontestdata/good/subfieldUInt.ion',
    'ion-tests/iontestdata/good/subfieldVarInt.ion',
    'ion-tests/iontestdata/good/subfieldVarUInt.ion',
    'ion-tests/iontestdata/good/subfieldVarUInt15bit.ion',
    'ion-tests/iontestdata/good/subfieldVarUInt16bit.ion',
    'ion-tests/iontestdata/good/subfieldVarUInt32bit.ion',
]);

////// end of generated skiplists


/*
  notes from the previous skipList mechanism:
    'good/subfieldVarInt.ion', //passes, but takes too long to run every build due to longint rounding.
    'good/intBinary.ion', //binaryInts unsupported.
    'good/integer_values.ion', //binary ints unsupported.
    'good/intsWithUnderscores.ion', //binary ints unsupported.
    'good/intBigSize256.ion', //int maxsize limitation.
    'good/equivs/intsWithUnderscores.ion', //binary ints unsupported.
    'good/equivs/binaryInts.ion', //binary ints unsupported.
    'good/subfieldVarUInt32bit.ion', //passes, but takes too long to run every build.
    'good/subfieldVarUInt.ion', //passes, but takes too long to run every build.
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

