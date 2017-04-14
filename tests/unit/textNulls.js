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
      name: 'Text nulls'
    };

    suite['null'] = function() {
      var reader = ion.makeReader("null");
      assert.equal(reader.next(), ion.IonTypes.NULL);
      assert.equal(reader.next(), undefined);
    };

    suite['stepIntoNullContainer'] = function() {
      var reader = ion.makeReader("null.list");
      assert.equal(reader.next(), ion.IonTypes.LIST);
      assert.isTrue(reader.isNull());

      var fail = true;
      try {
        reader.stepIn();
      } catch(e) {
        fail = false;
      }
      assert.isFalse(fail, "Stepped into null container");
    }

    registerSuite(suite);
  }
);
