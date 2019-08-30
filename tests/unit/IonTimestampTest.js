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

        registerSuite({
            name: 'Timestamp',

            // Parses year: Years precision, unknown local offset
            '2007T': () =>
                test('2007T'),

            // Parses month: The same instant, with months precision, unknown local offset
            '2007-02T': () =>
                test('2007-02T'),

            // Parses date: The same instant, with different syntax
            '2007-02-01T': () =>
                test('2007-02-01T'),

            // Parses date: The same instant, with days precision, unknown local offset
            '2007-02-01': () =>
                test('2007-02-01T'),

            // Parses date and time with only hour and minutes
            '2007-02-23T12:14Z': () =>
                test('2007-02-23T12:14Z'),

            // Parses date and time with only hour and minutes where hour is 0
            '2007-02-23T00:14Z': () =>
                test('2007-02-23T00:14Z'),

            '2007-05-01T01:00:00.000Z': () =>
                test('2007-05-01T01:00:00.000Z'),

            '2007-05-01T00:00:00.000Z': () =>
                test('2007-05-01T00:00:00.000Z'),

            // Parses timestamp: A timestamp with millisecond precision and PST local time
            '2007-02-23T12:14:33.079-08:00': () =>
                test('2007-02-23T12:14:33.079-08:00'),

            // Parses timestamp: A timestamp with millisecond precision and PST local time where hour is 0
            '2007-02-23T00:14:33.079-08:00': () =>
                test('2007-02-23T00:14:33.079-08:00'),

            // Parses timestamp: The same instant, with explicit local offset
            '2007-02-23T20:14:33.079+00:00': () =>
                test('2007-02-23T20:14:33.079+00:00'),

            // Parses timestamp: The same instant, with explicit local offset where hour is 0
            '2007-02-23T00:14:33.079+00:00': () =>
                test('2007-02-23T00:14:33.079+00:00'),

            // Parses timestamp: The same instant, with unknown local offset
            '2007-02-23T20:14:33.079-00:00': () =>
                test('2007-02-23T20:14:33.079-00:00'),

            // Parses timestamp: The same instant, with unknown local offset where hour is 0
            '2007-02-23T00:14:33.079-00:00': () =>
                test('2007-02-23T00:14:33.079-00:00'),

            // Parses timestamp: Happy New Year in UTC, unknown local offset
            '2007-01-01T00:00-00:00': () =>
                test('2007-01-01T00:00-00:00'),
        });

        function test(s, timestamp) {
            let ts = ion.Timestamp.parse(s);
            //assert.isTrue(ion.Timestamp.parse(val.toString()).equals(timestamp));
        }
    }
);

