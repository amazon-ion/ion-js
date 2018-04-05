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
define(['intern', 'intern!object', 'intern/dojo/node!fs', 'intern/dojo/node!path', 'dist/amd/es6/IonTests'],
    function(intern, registerSuite, fs, paths, ion) {

        function findFiles(folder, accumulator) {
            let files = fs.readdirSync(folder);
            while (files.length > 0) {
                let file = files.pop();
                let path = paths.join(folder, file);
                let stats = fs.lstatSync(path);
                if (stats.isDirectory()) {
                    findFiles(path, accumulator);
                } else if (stats.isFile()) {
                    accumulator.push(path);
                }
            }
        }

        let cwd = process.cwd();
        let ionGoodTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'good');
        let ionBadTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'bad');

        let goodAccumulator = [];
        findFiles(ionGoodTestsPath, goodAccumulator);
        let badAccumulator = [];
        findFiles(ionBadTestsPath, badAccumulator);

        let skipList = [
            'bad/timestamp/timestampLenTooLarge.10n',
            'bad/decimalLenTooLarge.10n',
            'bad/decimalLenCauses64BitOverflow.10n',
            'bad/decimalExpTooLarge.10n',
            'good/clobWithDel.10n',
            'good/clobWithNonAsciiCharacter.10n',
            'good/clobWithNullCharacter.10n',
            'good/decimalNegativeOneDotZero.10n',
            'good/decimalNegativeZeroDot.10n',
            'good/decimalNegativeZeroDotZero.10n',
            'good/decimalOneDotZero.10n',
            'good/equivs/timestampFractions.10n',
            'good/intBigSize1201.10n',
            'good/intBigSize256.10n',
            'good/item1.10n',
            'good/non-equivs/blobs.ion',
            'good/symbolExplicitZero.10n',
            'good/symbolImplicitZero.10n',
            'good/testfile28.10n',
            'good/equivs/utf8/stringU0001D11E.ion', //outside of javascripts supported range 0xffff
            'good/equivs/utf8/stringUtf8.ion', //outside of javascripts supported range 0xffff
            'good/utf32.ion', //js is unable to handle values outside of usc2
            'good/utf16.ion', //js is unable to handle values outside of usc2
            'good/subfieldVarInt.ion', //IVM bug
            'good/subfieldInt.ion', //IVM bug
            'good/nonNulls.ion', //blobs bug
            'good/non-equivs/nonNulls.ion', //blobs bug
            'good/lists.ion', //blobs bug
            'good/intBinary.ion', //binaryInts unsupported
            'good/intsWithUnderscores.ion', //binary ints unsupported
            'good/intBigSize256.ion', //IVM bug
            'good/equivs/intsWithUnderscores.ion', //binary ints unsupported
            'good/equivs/blobs.ion', //blobs unsupported
            'good/equivs/binaryInts.ion', //binary ints unsupported
            'good/blobs.ion', //blobs unsupported
            'good/timestamp/equivTimeline/timestamps.ion', //timestamps are not spec compliant
            'good/testfile35.ion', //symbol table imports unsupported
            'good/testfile29.ion', //IVM unsupported
            'good/testfile26.ion', //IVM unsupported
            'good/innerVersionIdentifiers.ion',//even though these are not IVM values on roundtrip the marshalling behavior treats text values as if they are top level and the IVM corrupts the reader.
            'good/subfieldVarUInt32bit.ion', //IVM and imports unsupported
            'good/subfieldVarUInt16bit.ion', //IVM and imports unsupported
            'good/subfieldVarUInt15bit.ion', //IVM and imports unsupported
            'good/subfieldVarUInt.ion', //IVM and imports unsupported
            'good/localSymbolTableImportZeroMaxId.ion', //IVM and imports unsupported
            'good/floatsWithUnderscores.ion', //numbers with underscores unsupported
            'good/equivs/floatsWithUnderscores.ion', //numbers with underscores unsupported
            'good/equivs/decimalsWithUnderscores.ion', //numbers with underscores unsupported
            'good/decimalsWithUnderscores.ion', //numbers with underscores unsupported
            'good/equivs/bigInts.ion', //numbers unsupported by js's int or float are unsupported
            'good/equivs/strings.ion', //triplequote interaction with span and whitespace corrupts the state of the parser.
            'good/timestamp/timestamps.ion', //timestamp is not spec compliant.
            'good/decimalZeroDot.10n', //binary',
            'good/equivs/paddedInts.10n', //binary
            'good/equivs/nopPadNonEmptyStruct.10n',
            'good/equivs/paddedInts.10n',
            'good/equivs/timestampSuperfluousOffset.10n',
            'good/intBigSize13.10n',
            'good/intBigSize14.10n',
            'good/intBigSize16.10n',
            'good/intLongMaxValuePlusOne.10n',
            'good/intLongMinValue.10n',
            'good/nopPadInsideStructWithNopPadThenValueNonZeroSymbolId.10n',
            'good/nopPadInsideStructWithNopPadThenValueZeroSymbolId.10n',
            'good/nopPadInsideStructWithValueThenNopPad.10n',
            'good/structAnnotatedOrdered.10n',
            'good/structOrdered.10n',
            'good/structUnordered.10n',
            'good/timestamp/timestamp2011-02-20.10n',
            'good/timestamp/timestamp2011-02-20T19_30_59_100-08_00.10n',
            'good/timestamp/timestamp2011-02.10n',
            'good/timestamp/timestamp2011.10n',
            'good/equivs/systemSymbols.ion',//IVM
            'bad/boolWithInvalidLength_2.10n',
            'bad/boolWithInvalidLength_1.10n',
            'bad/emptyAnnotatedInt.10n',
            'bad/listWithValueLargerThanSize.10n',
            'bad/localSymbolTableWithMultipleSymbolsFields.10n',
            'bad/minLongWithLenTooLarge.10n',
            'bad/minLongWithLenTooSmall.10n',
            'bad/negativeIntZero.10n',
            'bad/negativeIntZeroLn.10n',
            'bad/nopPadTooShort.10n',
            'bad/nopPadWithAnnotations.10n',
            'bad/stringLenTooLarge.10n',
            'bad/stringWithLatinEncoding.10n',
            'bad/structOrderedEmpty.10n',
            'bad/annotationLengthTooShortScalar.10n',
            'bad/annotationLengthTooShortContainer.10n',
            'bad/annotationNested.10n',
            'bad/timestamp/timestampHourWithoutMinute.10n',



        ];

        // For debugging, put single files in this list to have the test run only
        // that file.   (But don't forget to clean this up on checkin!)
        let debugList = [
            //'good/sexps.ion'
        ];

        let goodUnskipped = [];
        for (let path of goodAccumulator) {
            let spath = path.replace(/\\/g, "/");
            let shouldSkip = false;
            for (let skip of skipList) {
                if (spath.endsWith(skip)) {
                    shouldSkip = true;
                    break;
                }
            }
            if (debugList.length > 0) {
                shouldSkip = true;
                for (let debug of debugList) {
                    if (spath.endsWith(debug)) {
                        shouldSkip = false;
                        break;
                    }
                }
            }
            if (!shouldSkip) {
                goodUnskipped.push(path);
            }
        }

        let badUnskipped = [];
        for (let path of badAccumulator) {
            let spath = path.replace(/\\/g, "/");
            let shouldSkip = false;
            for (let skip of skipList) {
                if (spath.endsWith(skip)) {
                    shouldSkip = true;
                    break;
                }
            }
            if (debugList.length > 0) {
                shouldSkip = true;
                for (let debug of debugList) {
                    if (spath.endsWith(debug)) {
                        shouldSkip = false;
                        break;
                    }
                }
            }
            if (!shouldSkip) {
                badUnskipped.push(path);
            }
        }

        let goodSuite = {
            name: 'Good tests'
        };
        let badSuite = {
            name: 'Bad tests'
        };

        let eventStreamSuite = {
            name: 'EventStream tests'
        };
        let badEventStreamSuite = {
            name: 'Bad EventStream tests'
        };

        function goodExhaust(reader) {
            let tries = 0;
            for (;;) {
                tries++;
                if (tries > 1000) {
                    throw new Error("Reader spinning forever!");
                }

                let next = reader.next();
                if (typeof(next) === 'undefined') {
                    if (reader.depth() > 0) {
                        // End of container
                        reader.stepOut();
                    } else {
                        // End of data
                        break;
                    }
                } else if (next.container && !reader.isNull()) {
                    reader.stepIn();
                }
            }
        }

        function badExhaust(reader) {
            let tries = 0;
            try {
                for (; ;) {
                    // Safety valve
                    tries++;
                    if (tries > 1000) {
                        throw new Error("Reader spinning forever!");
                    }

                    let next = reader.next();
                    if (typeof(next) === 'undefined') {
                        if (reader.depth() > 0) {
                            // End of container
                            reader.stepOut();
                        } else {
                            // End of data
                            break;
                        }
                    } else if (next.container && !reader.isNull()) {
                        reader.stepIn();
                    }
                }
            }catch(e){
                return;
            }
            throw new Error("Bad test should have failed!");
        }


        function makeGoodTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    let options = path.endsWith(".10n") ? null : "utf8";
                    let input = fs.readFileSync(path, options);
                    goodExhaust(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeBadTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    let options = path.endsWith(".10n") ? null : "utf8";
                    let input = fs.readFileSync(path, options);
                    badExhaust(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeEventStreamTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    let options = path.endsWith(".10n") ? null : "utf8";
                    let input = fs.readFileSync(path, options);
                    roundTripEventStreams(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeBadEventStreamTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    let options = path.endsWith(".10n") ? null : "utf8";
                    let input = fs.readFileSync(path, options);
                    roundTripBadEventStreams(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function roundTripEventStreams(reader){
            let eventStream = new ion.IonEventStream(reader);
            let writer = ion.makeTextWriter();
            eventStream.writeEventStream(writer);
            writer.close();
            let buf = writer.getBytes();
            let tempString = '';
            for(let i = 0; i < buf.length; i++){
                tempString = tempString + String.fromCharCode(buf[i]);
            }
            let tempReader = new ion.makeReader(tempString);
            let tempStream = new ion.IonEventStream(tempReader);
            if(!eventStream.equals(tempStream)) {
                let tempWriter = ion.makeTextWriter();
                tempStream.write(tempWriter);
                tempWriter.close();
                let tempBuf = tempWriter.getBytes();
                let unequalString = "";
                for(let i = 0; i < buf.length; i++){
                    unequalString = unequalString + String.fromCharCode(buf[i]);
                }
                throw new Error('Round tripped stream was unequal: ' + tempString + '\n vs: ' + unequalString);
            }


        }

        function roundTripBadEventStreams(reader){
            try {
                let eventStream = new ion.IonEventStream(reader);
                let writer = ion.makeTextWriter();
                eventStream.writeEventStream(writer);
                let buf = writer.getBytes();
                let tempString = "";
                for(let i = 0; i < buf.length; i++){
                    tempString = tempString + String.fromCharCode(buf[i]);
                }
            }catch(e){
                return;
            }
            throw new Error("Bad test should have failed!");


        }

        function uintToString(uintArray) {
            let encodedString = String.fromCharCode.apply(null, uintArray),
                decodedString = decodeURIComponent(escape(encodedString));
            return decodedString;
        }

        for (let file of goodUnskipped) {
            goodSuite[file] = makeGoodTest(file);
            eventStreamSuite[file] = makeEventStreamTest(file);
        }
        for (let file of badUnskipped) {
            badSuite[file] = makeBadTest(file);
            badEventStreamSuite[file] = makeBadEventStreamTest(file);
        }

        registerSuite(goodSuite);
        //registerSuite(badSuite);
        registerSuite(eventStreamSuite);
        //registerSuite(badEventStreamSuite);
    }
);
