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
    const ion = require('dist/amd/es6/Ion');

    let suite = {
      name: 'Timestamp'
    };

    const parseTest = function(name, timestamp) {
      suite[name] = function() {
        ion.Timestamp.parse(timestamp);
      }
    };

    parseTest('Parses year', '2017T');
    parseTest('Parses month', '2017-02T');
    // Seconds are optional, but local offset is not.
    parseTest('Parses date and time with only hour and minutes', '2007-02-23T12:14Z');
    parseTest('Parses timestamp: The same instant in UTC ("zero" or "zulu")', '2017-05-01T01:00:00.000Z');

    registerSuite(suite);
  }
);
