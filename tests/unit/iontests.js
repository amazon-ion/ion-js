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
            var files = fs.readdirSync(folder);
            while (files.length > 0) {
                var file = files.pop();
                var path = paths.join(folder, file);
                var stats = fs.lstatSync(path);
                if (stats.isDirectory()) {
                    findFiles(path, accumulator);
                } else if (stats.isFile()) {
                    accumulator.push(path);
                }
            }
        }

        var cwd = process.cwd();
        var ionGoodTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'good');
        var ionBadTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'bad');

        var goodAccumulator = [];
        findFiles(ionGoodTestsPath, goodAccumulator);
        var badAccumulator = [];
        findFiles(ionBadTestsPath, badAccumulator);


        //need to mark why these tests are being skipped.
        var skipList = [
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

        ];

        // For debugging, put single files in this list to have the test run only
        // that file.   (But don't forget to clean this up on checkin!)
        var debugList = [
            //'good/sexps.ion'
        ];

        var goodUnskipped = [];
        for (var path of goodAccumulator) {
            var spath = path.replace(/\\/g, "/");
            var shouldSkip = false;
            for (var skip of skipList) {
                if (spath.endsWith(skip)) {
                    shouldSkip = true;
                    break;
                }
            }
            if (debugList.length > 0) {
                shouldSkip = true;
                for (var debug of debugList) {
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

        var badUnskipped = [];
        for (var path of badAccumulator) {
            var spath = path.replace(/\\/g, "/");
            var shouldSkip = false;
            for (var skip of skipList) {
                if (spath.endsWith(skip)) {
                    shouldSkip = true;
                    break;
                }
            }
            if (debugList.length > 0) {
                shouldSkip = true;
                for (var debug of debugList) {
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

        var goodSuite = {
            name: 'Good tests'
        };
        var badSuite = {
            name: 'Bad tests'
        };

        var eventStreamSuite = {
            name: 'EventStream tests'
        };
        var badEventStreamSuite = {
            name: 'Bad EventStream tests'
        };

        function goodExhaust(reader) {
            var tries = 0;
            for (;;) {
                // Safety valve
                tries++;
                if (tries > 1000) {
                    throw new Error("Reader spinning forever!");
                }

                var next = reader.next();
                if (typeof(next) === 'undefined') {
                    if (reader.depth() > 0) {
                        // End of container
                        //console.log("Stepping out");
                        reader.stepOut();
                    } else {
                        // End of data
                        break;
                    }
                } else if (next.container && !reader.isNull()) {
                    //console.log("Stepping in");
                    reader.stepIn();
                }
            }
        }

        function badExhaust(reader) {
            var tries = 0;
            try {
                for (; ;) {
                    // Safety valve
                    tries++;
                    if (tries > 1000) {
                        throw new Error("Reader spinning forever!");
                    }

                    var next = reader.next();
                    if (typeof(next) === 'undefined') {
                        if (reader.depth() > 0) {
                            // End of container
                            //console.log("Stepping out");
                            reader.stepOut();
                        } else {
                            // End of data
                            break;
                        }
                    } else if (next.container && !reader.isNull()) {
                        //console.log("Stepping in");
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
                var executor = function(resolve, reject) {
                    var options = path.endsWith(".10n") ? null : "utf8";
                    var input = fs.readFileSync(path, options);
                    goodExhaust(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeBadTest(path) {
            return function() {
                var executor = function(resolve, reject) {
                    var options = path.endsWith(".10n") ? null : "utf8";
                    var input = fs.readFileSync(path, options);
                    badExhaust(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeEventStreamTest(path) {
            return function() {
                var executor = function(resolve, reject) {
                    var options = path.endsWith(".10n") ? null : "utf8";
                    var input = fs.readFileSync(path, options);
                    roundTripEventStreams(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeBadEventStreamTest(path) {
            return function() {
                var executor = function(resolve, reject) {
                    var options = path.endsWith(".10n") ? null : "utf8";
                    var input = fs.readFileSync(path, options);
                    roundTripBadEventStreams(ion.makeReader(input));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function roundTripEventStreams(reader){
            var eventStream = new ion.IonEventStream(reader);
            var writer = ion.makeTextWriter();
            eventStream.writeEventStream(writer);
            writer.close();
            var buf = writer.getBytes();
            var tempString = '';
            for(var i = 0; i < buf.length; i++){
                tempString = tempString + String.fromCharCode(buf[i]);
            }
            var tempReader = new ion.makeReader(tempString);
            var tempStream = new ion.IonEventStream(tempReader);
            if(!eventStream.equals(tempStream)) {
                var tempWriter = ion.makeTextWriter();
                tempStream.write(tempWriter);
                tempWriter.close();
                var tempBuf = tempWriter.getBytes();
                var unequalString = "";
                for(var i = 0; i < buf.length; i++){
                    unequalString = unequalString + String.fromCharCode(buf[i]);
                }
                throw new Error('Round tripped stream was unequal: ' + tempString + '\n vs: ' + unequalString);
            }
            //console.log(tempString);


        }

        function roundTripBadEventStreams(reader){
            try {
                var eventStream = new ion.IonEventStream(reader);
                var writer = ion.makeTextWriter();
                eventStream.writeEventStream(writer);
                var buf = writer.getBytes();
                var tempString = "";
                for(var i = 0; i < buf.length; i++){
                    tempString = tempString + String.fromCharCode(buf[i]);
                }
                //console.log(tempString);
            }catch(e){
                return;
            }
            throw new Error("Bad test should have failed!");


        }

        for (var file of goodUnskipped) {
            goodSuite[file] = makeGoodTest(file);
            eventStreamSuite[file] = makeEventStreamTest(file);
        }
        for (var file of badUnskipped) {
            badSuite[file] = makeBadTest(file);
            badEventStreamSuite[file] = makeBadEventStreamTest(file);
        }

        //registerSuite(goodSuite);
        //registerSuite(badSuite);
        registerSuite(eventStreamSuite);
        //registerSuite(badEventStreamSuite);
    }
);
