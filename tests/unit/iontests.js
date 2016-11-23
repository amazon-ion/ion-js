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
    const ion = require('dist/ion-node');

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
    console.log(accumulator.join('\n'));

    var suite = {
      name: 'Good tests',
    };

    function exhaust(reader) {
      var tries = 0;
      for (;;) {
        var next = reader.next();
        if (next === ION.EOF) {
          break;
        } else if (typeof(next) === 'undefined') {
          throw new Error("Reader returned undefined!");
        }

        tries++;
        if (tries > 1000) {
          throw new Error("Reader spinning forever!");
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
              var span = ION.makeSpan(buffer);
              var reader = ION.makeReader(span);
              console.log("Exhausting " + path);
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

    for (var file of accumulator) {
      suite[file] = makeTest(file);
    }

    registerSuite(suite);
  }
);
