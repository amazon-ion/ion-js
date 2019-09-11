/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
    'dist/amd/es6/util',
  ],
  function(intern, registerSuite, assert, ion, util) {
    registerSuite({
      name: 'util',

      '_hasValue()'         : () => assert.equal(util._hasValue(), false),
      '_hasValue(undefined)': () => assert.equal(util._hasValue(undefined), false),
      '_hasValue(null)'     : () => assert.equal(util._hasValue(null), false),
      '_hasValue(0)'        : () => assert.equal(util._hasValue(0), true),
      '_hasValue(1)'        : () => assert.equal(util._hasValue(1), true),

      '_sign(-1)': () => assert.equal(util._sign(-1), -1),
      '_sign(-0)': () => assert.equal(util._sign(-0), -1),
      '_sign(0)' : () => assert.equal(util._sign(0), 1),
      '_sign(1)' : () => assert.equal(util._sign(1), 1),
    });
  }
);

