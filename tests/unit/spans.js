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
      name: 'Spans'
    };

    suite['null valueAt'] = function() {
      var span = ion.makeSpan("null");
      assert.equal('n'.charCodeAt(0), span.valueAt(0));
      assert.equal('u'.charCodeAt(0), span.valueAt(1));
      assert.equal('l'.charCodeAt(0), span.valueAt(2));
      assert.equal('l'.charCodeAt(0), span.valueAt(3));
      assert.equal(-1, span.valueAt(4));
    };

    suite['null next'] = function() {
      var span = ion.makeSpan("null");
      assert.equal('n'.charCodeAt(0), span.next());
      assert.equal('u'.charCodeAt(0), span.next());
      assert.equal('l'.charCodeAt(0), span.next());
      assert.equal('l'.charCodeAt(0), span.next());
      assert.equal(-1, span.next());
    }

    suite['Buffer initial position'] = function() {
      var buffer = Buffer.from("null");
      var span = ion.makeSpan(buffer);
      assert.equal(0, span.position());
    }

    registerSuite(suite);
  }
);
