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
define(
  function(require) {
    const registerSuite = require('intern!object');
    const fs = require('intern/dojo/node!fs');
    const paths = require('intern/dojo/node!path');
    const ion = require('dist/Ion');

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
    var ionTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'good');
    var accumulator = [];
    findFiles(ionTestsPath, accumulator);
    //console.log(accumulator.join('\n'));

    var skipList = [
      'equivs/annotatedIvms.ion',
      'localSymbolTables.ion',
      'localSymbolTableImportZeroMaxId.ion',
      'message2.ion',
      'non-equivs/annotatedIvms.ion',
      'non-equivs/annotations.ion',
      'non-equivs/blobs.ion',
      'non-equivs/bools.ion',
      'non-equivs/clobs.ion',
      'non-equivs/decimals.ion',
      'non-equivs/documents.ion',
      'non-equivs/floats.ion',
      'non-equivs/floatsVsDecimals.ion',
      'non-equivs/ints.ion',
      'non-equivs/lists.ion',
      'non-equivs/strings.ion',
      'non-equivs/structs.ion',
      'non-equivs/symbolTables.ion',
      'non-equivs/symbols.ion',
      'non-equivs/timestamps.ion',
      'nonNulls.ion',
      'nulls.ion',
      'operators.ion',
      'sexpAnnotationQuotedOperator.ion',
      'sexps.ion',
      'subfieldVarUInt.ion',
      'subfieldVarUInt15bit.ion',
      'subfieldVarUInt16bit.ion',
      'testfile0.ion',
      'testfile1.ion',
      'testfile3.ion',
      'testfile4.ion',
      'testfile5.ion',
      'testfile6.ion',
      'testfile7.ion',
      'testfile8.ion',
      'testfile9.ion',
      'testfile10.ion',
      'testfile11.ion',
      'testfile12.ion',
      'testfile13.ion',
      'testfile14.ion',
      'testfile15.ion',
      'testfile16.ion',
      'testfile19.ion',
      'testfile20.ion',
      'testfile21.ion',
      'testfile22.ion',
      'testfile23.ion',
      'testfile24.ion',
      'testfile25.ion',
      'testfile26.ion',
      'testfile28.ion',
      'testfile29.ion',
      'testfile30.ion',
      'testfile31.ion',
      'testfile33.ion',
      'testfile34.ion',
      'testfile35.ion',
      'testfile37.ion',
      'timestamp/equivTimeline/leapDayRollover.ion',
      'timestamp/equivTimeline/timestamps.ion',
      'utf16.ion',
      'utf32.ion',
    ];

    var unskipped = [];
    for (var path of accumulator) {
      var shouldSkip = false;
      for (var skip of skipList) {
        if (path.endsWith(skip)) {
          shouldSkip = true;
          break;
        }
      }
      if (!shouldSkip) {
        unskipped.push(path);
      }
    }

    var suite = {
      name: 'Good tests',
    };

    function exhaust(reader) {
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

    function makeTest(path) {
      return function() {
        var executor = function(resolve, reject) {
          var stream = fs.createReadStream(path);
          var chunks = [];

          stream.on('end', function(chunk) {
            try {
              if (typeof(chunk) !== 'undefined') {
                chunks.push(chunk);
              }
              var buffer = Buffer.concat(chunks);
              var span = ion.makeSpan(buffer);
              var reader = ion.makeReader(span);
              console.log("Exhausting " + path);
              if (path.endsWith('nulls.ion')) {
                debugger;
              }
              exhaust(reader);
              console.log("Exhausted!\n");
              resolve();
            } catch (e) {
              reject(e);
            }
          });

          stream.on('data', function(chunk) {
            chunks.push(chunk);
          });
        };

        return new Promise(executor);
      }
    }

    for (var file of unskipped) {
      suite[file] = makeTest(file);
    }

    registerSuite(suite);
  }
);
