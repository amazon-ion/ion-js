/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  'intern!object',
  'intern/chai!assert',
  'dist/amd/es6/IonTests',
  ],
  function(registerSuite, assert, ion) {
      let suite = {
          name: 'Annotations'
      };

      function readerToBytes(reader) {
        let writer = ion.makeTextWriter();
        writer.writeValues(reader);
        writer.close();
        return writer.getBytes();        
      }

      function readerToString(reader) {
        return ion.decodeUtf8(readerToBytes(reader));
      }

      suite['Read annotations'] = function() {
        let data = "a::b::123";
        let reader = ion.makeReader(data);
        reader.next();
        assert.deepEqual(reader.annotations(), ['a', 'b']);
        assert.equal(reader.value(), '123');
        assert.equal(readerToString(reader), 'a::b::123');
      };

      suite['Create annotation'] = function() {
        let data = "123";
        let reader = ion.makeReader(data);
        reader.next();
        let writer = ion.makeTextWriter();
        writer.setAnnotations(['a']);
        writer.writeInt(reader.numberValue());
        reader.next();
        writer.writeValues(reader);
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::123');
      };

      suite['Add annotation'] = function() {
        let data = "a::b::123";
        let reader = ion.makeReader(data);
        reader.next();
        let writer = ion.makeTextWriter();
        writer.setAnnotations(reader.annotations());
        writer.addAnnotation('c');
        writer.writeInt(reader.numberValue());
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::b::c::123');
      };

      suite['Wrap annotation'] = function() {
        let data = "{ x: 1 }";
        let reader = ion.makeReader(data);
        let writer = ion.makeTextWriter();
        writer.setAnnotations(['a', 'b']);
        writer.stepIn(ion.IonTypes.STRUCT);

        reader.next();
        reader.stepIn();
        reader.next();

        writer._writeValues(reader, 1);

        reader.stepOut();

        writer.stepOut();
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::b::{x:1}');
      };

      registerSuite(suite);
  }
);
