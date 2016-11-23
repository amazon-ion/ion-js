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
