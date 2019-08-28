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
        let val = ion.Timestamp.parse(timestamp);
         //assert.isTrue(ion.Timestamp.parse(val.toString()).equals(timestamp));
      }
    };

    parseTest('Parses year: Years precision, unknown local offset', '2017T');
    parseTest('Parses month: The same instant, with months precision, unknown local offset', '2017-02T');
    parseTest('Parses date: The same instant, with different syntax', '2017-02-01T');
    parseTest('Parses date: The same instant, with days precision, unknown local offset', '2017-02-01');
    // Seconds are optional, but local offset is not.
    parseTest('Parses date and time with only hour and minutes', '2007-02-23T12:14Z');
    parseTest('Parses date and time with only hour and minutes where hour is 0', '2007-02-23T00:14Z');
    parseTest('Parses timestamp: The same instant in UTC ("zero" or "zulu")', '2017-05-01T01:00:00.000Z');
    parseTest('Parses timestamp: The same instant in UTC ("zero" or "zulu") and `0` hour', '2017-05-01T00:00:00.000Z');
    parseTest('Parses timestamp: A timestamp with millisecond precision and PST local time', '2007-02-23T12:14:33.079-08:00');
    parseTest('Parses timestamp: A timestamp with millisecond precision and PST local time where hour is 0', '2007-02-23T00:14:33.079-08:00');
    parseTest('Parses timestamp: The same instant, with explicit local offset', '2007-02-23T20:14:33.079+00:00');
    parseTest('Parses timestamp: The same instant, with explicit local offset where hour is 0', '2007-02-23T00:14:33.079+00:00');
    parseTest('Parses timestamp: The same instant, with unknown local offset', '2007-02-23T20:14:33.079-00:00');
    parseTest('Parses timestamp: The same instant, with unknown local offset where hour is 0', '2007-02-23T00:14:33.079-00:00');
    parseTest('Parses timestamp: Happy New Year in UTC, unknown local offset', '2007-01-01T00:00-00:00');
    registerSuite(suite);
  }
);
