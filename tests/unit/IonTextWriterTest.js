/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
    const assert = require('intern/chai!assert');
    const ion = require('dist/Ion');

    var suite = {
      name: 'Text Writer'
    };

    var writerTest = function(name, instructions, expected) {
      suite[name] = function() {
        var writeable = new ion.Writeable();
        var writer = new ion.TextWriter(writeable);
        instructions(writer);
        writer.close();
        var actual = writeable.getBytes();
        assert.deepEqual(actual, ion.encodeUtf8(expected));
      }
    }

    var badWriterTest = function(name, instructions) {
      var test = function() {
        var writeable = new ion.Writeable();
        var writer = new ion.TextWriter(writeable);
        instructions(writer);
        writer.close();
      };
      suite[name] = function() {
        assert.throws(test, Error);
      }
    }

    // Blobs

    writerTest('Writes blob',
      writer => writer.writeBlob([1, 2, 3]),
      '{{AQID}}');
    writerTest('Writes null blob using null',
      writer => writer.writeBlob(null),
      'null.blob');
    writerTest('Writes null blob using undefined',
      writer => writer.writeBlob(),
      'null.blob');
    writerTest('Writes null blob using type',
      writer => writer.writeNull(ion.TypeCodes.BLOB),
      'null.blob');
    writerTest('Writes blob with identifier annotations',
      writer => writer.writeBlob([1, 2, 3], ['foo', 'bar']),
      'foo::bar::{{AQID}}');
    writerTest('Writes blob with non-identifier annotations',
      writer => writer.writeBlob([1, 2, 3], ['123abc', '{}']),
      "'123abc'::'{}'::{{AQID}}");

    // Booleans

    writerTest('Writes boolean true',
      writer => writer.writeBoolean(true),
      'true');
    writerTest('Writes boolean false',
      writer => writer.writeBoolean(false),
      'false');
    writerTest('Writes null boolean using null',
      writer => writer.writeBoolean(null),
      'null.bool');
    writerTest('Writes null boolean using undefined',
      writer => writer.writeBoolean(),
      'null.bool');
    writerTest('Writes null boolean using type',
      writer => writer.writeNull(ion.TypeCodes.BOOL),
      'null.bool');
    writerTest('Writes boolean with annotations',
      writer => writer.writeBoolean(true, ['abc', '123']),
      "abc::'123'::true");

    // Clobs

    writerTest('Writes clob',
      writer => writer.writeClob(['A'.charCodeAt(0)]),
      '{{"A"}}');
    writerTest('Writes null clob using null',
      writer => writer.writeClob(null),
      'null.clob'); 
    writerTest('Writes null clob using undefined',
      writer => writer.writeClob(),
      'null.clob'); 
    writerTest('Writes null clob using type',
      writer => writer.writeNull(ion.TypeCodes.CLOB),
      'null.clob'); 
    writerTest('Writes clob with annotations',
      writer => writer.writeClob(['A'.charCodeAt(0)], ['baz', 'qux']),
      'baz::qux::{{"A"}}');
    writerTest('Writes clob escapes',
      writer => writer.writeClob([0x00, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x22, 0x27, 0x2f, 0x3f, 0x5c]),
      '{{"\\0\\a\\b\\t\\n\\v\\f\\r\\"\\\'\\/\\?\\\\"}}');
    badWriterTest('Rejects clob with non-ASCII character',
      writer => writer.writeClob([128]));

    registerSuite(suite);
  }
);
