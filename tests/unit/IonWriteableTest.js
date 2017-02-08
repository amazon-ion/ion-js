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
    'dist/amd/es5/IonTests',
    'dist/amd/es6/IonTests',
  ],
  function(intern, registerSuite, assert, ionEs5, ionEs6) {
    var ionVersions = {
      es5: ionEs5,
      es6: ionEs6,
    };
    var ion = ionVersions[intern.args.ionVersion];

    var suite = {
      name: 'Writeable'
    };

    suite['writePartialArray'] = function() {
      var writeable = new ion.Writeable();
      writeable.writeBytes([1,2,3,4,5,6,7,8], 4, 4);
      assert.deepEqual(writeable.getBytes(), [5,6,7,8]);
    };

    registerSuite(suite);
  }
);
