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
    'intern/dojo/node!fs',
    'intern/dojo/node!path',
    'dist/amd/es6/IonTests',
  ],
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
    var ionTestsPath = paths.join(cwd, 'ion-tests', 'iontestdata', 'good');
    var accumulator = [];
    findFiles(ionTestsPath, accumulator);
    //console.log(accumulator.join('\n'));

    var skipList = [
      'good/decimalsWithUnderscores.ion',
      'good/equivs/binaryInts.ion',
      'good/equivs/decimalsWithUnderscores.ion',
      'good/equivs/intsWithUnderscores.ion',
      'good/intBinary.ion',
      'good/intsWithUnderscores.ion',
      'good/utf16.ion',
      'good/utf32.ion',
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
              var reader = ion.makeReader(buffer);
              console.log("Exhausting " + path);
              if (path.endsWith('clobsWithWhitespace.ion')) {
              }
              exhaust(reader);
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
