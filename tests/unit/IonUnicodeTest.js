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
    const ion = require('dist/Ion');

    var suite = {
      name: 'Unicode'
    };

    suite['Encode dollar sign'] = function() {
      assert.deepEqual(ion.encodeUtf8('$'), [0x24]);
    }

    suite['Encode cent sign'] = function() {
      assert.deepEqual(ion.encodeUtf8('¢'), [0xc2, 0xa2]);
    }

    suite['Encode euro sign'] = function() {
      assert.deepEqual(ion.encodeUtf8('€'), [0xe2, 0x82, 0xac]);
    };

    suite['Encode Gothic letter hwair'] = function() {
      assert.deepEqual(ion.encodeUtf8(String.fromCodePoint(0x10348)), [0xf0, 0x90, 0x8d, 0x88]);
    };

    registerSuite(suite);
  }
);
