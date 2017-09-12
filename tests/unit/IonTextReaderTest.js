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
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
  ],
  function(intern, registerSuite, assert, ion) {

    var suite = {
      name: 'Text reader'
    };

    suite['skipOverStruct'] = function() {
      var reader = ion.makeReader("{key1:value1} {key2:value2} 123");
      assert.equal(reader.next(), ion.IonTypes.STRUCT);
      assert.equal(reader.next(), ion.IonTypes.STRUCT);
      assert.equal(reader.next(), ion.IonTypes.INT);
    };

    suite['skipOverNestedStruct'] = function() {
      var reader = ion.makeReader("{nested:{foo:bar}, number:123}");
      reader.next();
      reader.stepIn();
      assert.equal(reader.next(), ion.IonTypes.STRUCT);
      assert.equal(reader.next(), ion.IonTypes.INT);
      reader.stepOut();
    };

    suite['skipOverListAndSexp'] = function() {
      var reader = ion.makeReader("[a, b, c] (d e f) 123");
      assert.equal(reader.next(), ion.IonTypes.LIST);
      assert.equal(reader.next(), ion.IonTypes.SEXP);
      assert.equal(reader.next(), ion.IonTypes.INT);
    };

    registerSuite(suite);
  }
);
