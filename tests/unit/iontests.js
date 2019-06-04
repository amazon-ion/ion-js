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
        //const { spawn } = require('child_process');
        //We really want this to be a script that clones and builds iontestharness
        //

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
            for(let i = 0; i < accumulator.length; i++){
                tempstr = fs.readFileSync(accumulator[i]);
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



        ];

        // For debugging, put single files in this list to have the test run only
        // that file.   (But don't forget to clean this up on checkin!)
        let debugList = [
            //'good/sexps.ion'
        ];

        function filesToRead(accumulator, skiplist) {
            unskipped = [];
            for (let path of accumulator) {
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
                    unskipped.push(path);
                }
            }
            return unskipped;
        }

        let goodUnskipped = filesToRead(goodAccumulator, skipList);
        let badUnskipped = filesToRead(badAccumulator, skipList);

        let goodSuite = {
            name: 'Good tests'
        };
        let badSuite = {
            name: 'Bad tests'
        };

        let eventStreamSuite = {
            name: 'EventStream tests'
        };

        function exhaust(reader) {
            for (;;) {
                let next = reader.next();
                if (typeof(next) === 'undefined') {//should this be null?
                    if (reader.depth() > 0) {
                        // End of container
                        reader.stepOut();
                    } else {
                        // End of data
                        break;
                    }
                } else if (next.container && !reader.isNull()) {
                    reader.stepIn();
                } else {
                    reader.value();
                }
            }
        }

        function getInput(path){
            let options = path.endsWith(".10n") ? null : "utf8";
            return fs.readFileSync(path, options);
        }

        function makeGoodTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    exhaust(ion.makeReader(getInput(path)));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function makeBadTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    try {
                        exhaust(ion.makeReader(getInput(path)));
                    }catch(e){
                        resolve();
                    }
                    throw new Error("Bad test should have failed!");
                };

                return new Promise(executor);
            }
        }

        function makeEventStreamTest(path) {
            return function() {
                let executor = function(resolve, reject) {
                    console.log(path);
                    roundTripEventStreams(ion.makeReader(getInput(path)));
                    resolve();
                };

                return new Promise(executor);
            }
        }

        function getStreams(reader) {
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
            return streams;
        }

        function roundTripEventStreams(reader) {
            let streams = getStreams(reader);
            //streams.push()
            for(let i = 0;  i < streams.length - 1; i++){
                for(let j = i; j < streams.length; j++){
                    if(!streams[i].equals(streams[(j + i) % streams.length])) throw new Error("Streams unequal.");
                }
            }
        }

        for (let file of goodUnskipped) {
                    goodSuite[file] = makeGoodTest(file);
                    eventStreamSuite[file] = makeEventStreamTest(file);
        }
        for (let file of badUnskipped) {
                badSuite[file] = makeBadTest(file);
        }

        registerSuite(goodSuite);
        registerSuite(badSuite);
        registerSuite(eventStreamSuite);
    }
);


