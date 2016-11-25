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
    const assert = require('intern/chai!assert');
    const ion = require('dist/ion-node');

    var suite = {
      name: 'Text nulls'
    };

    suite['null'] = function() {
      var span = ION.makeSpan("null");
      var reader = ION.makeReader(span);
      assert.equal(reader.next(), ION.IonTypes.NULL);
      assert.equal(reader.next(), undefined);
    };

    registerSuite(suite);
  }
);
