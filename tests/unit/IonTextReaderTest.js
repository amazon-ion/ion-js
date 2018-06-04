/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
    const ion = require('dist/amd/es6/Ion');

    var suite = {
      name: 'Text Reader'
    };

    suite['Read string value'] = function() {
      var ionToRead = "\"string\"";
      var ionReader = ion.makeReader(ionToRead);
      ionReader.next()

      assert.equal(ionReader.value(), "string");
    };

    suite['Parse through struct'] = function() {
      var ionToRead = "{ key : \"string\" }";
      var ionReader = ion.makeReader(ionToRead);
      ionReader.next()

      assert.equal(ion.IonTypes.STRUCT, ionReader.valueType());

      ionReader.stepIn(); // Step into the base struct.
      ionReader.next();

      assert.equal(ionReader.fieldName(), "key");
      assert.equal(ionReader.value(), "string");
    };

    suite['Parse through struct can skip over container'] = function() {
      var ionToRead = "{ a: { key1 : \"string1\" }, b: { key2 : \"string2\" } }";
      var ionReader = ion.makeReader(ionToRead);
      ionReader.next();

      assert.equal(ion.IonTypes.STRUCT, ionReader.valueType());

      ionReader.stepIn(); // Step into the base struct.
      ionReader.next();

      assert.equal(ionReader.fieldName(), "a");

      ionReader.next();

      assert.equal(ionReader.fieldName(), "b");

      ionReader.stepIn(); // Step into the "b" struct.
      ionReader.next();

      assert.equal(ionReader.fieldName(), "key2");
      assert.equal(ionReader.value(), "string2");
    };

    registerSuite(suite);
  }
);
