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
        const util = require('dist/amd/es6/util');

        registerSuite({
            name: 'Timestamp',

            // boundary tests (for each field of a timestamp)
            '0001T': () => test('0001T', ion.Precision.YEAR, -0, 1),
            '9999T': () => test('9999T', ion.Precision.YEAR, -0, 9999),

            '2007-01T': () => test('2007-01T', ion.Precision.MONTH, -0, 2007, 1),
            '2007-12T': () => test('2007-12T', ion.Precision.MONTH, -0, 2007, 12),

            '2007-01-01' : () => test('2007-01-01T', ion.Precision.DAY, -0, 2007, 1, 1),
            '2007-01-31T': () => test('2007-01-31T', ion.Precision.DAY, -0, 2007, 1, 31),

            '2007-01-01T00:00Z': () => test('2007-01-01T00:00Z', ion.Precision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0, 0),
            '2007-01-01T23:59Z': () => test('2007-01-01T23:59Z', ion.Precision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 23, 59),

            '2007-01-01T00:00:00Z': () => test('2007-01-01T00:00:00Z', ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:59Z': () => test('2007-01-01T00:00:59Z', ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '59'),

            '2007-01-01T00:00:00.000Z': () => test('2007-01-01T00:00:00.000Z', ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.000'),
            '2007-01-01T00:00:00.999Z': () => test('2007-01-01T00:00:00.999Z', ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.999'),

            // local offset boundary tests
            '2007-01-01T00:00Z'        : () => test('2007-01-01T00:00Z',      ion.Precision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0),
            '2007-01-01T00:00+00:00'   : () => test('2007-01-01T00:00+00:00', ion.Precision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0),
            '2007-01-01T00:00-00:00'   : () => test('2007-01-01T00:00-00:00', ion.Precision.HOUR_AND_MINUTE, -0, 2007, 1, 1, 0),
            '2007-01-01T00:00-23:59'   : () => test('2007-01-01T00:00-23:59', ion.Precision.HOUR_AND_MINUTE, -(23 * 60 + 59), 2007, 1, 1, 0),
            '2007-01-01T00:00+23:59'   : () => test('2007-01-01T00:00+23:59', ion.Precision.HOUR_AND_MINUTE, 23 * 60 + 59, 2007, 1, 1, 0),
            '2007-01-01T00:00:00Z'     : () => test('2007-01-01T00:00:00Z',      ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00+00:00': () => test('2007-01-01T00:00:00+00:00', ion.Precision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00-00:00': () => test('2007-01-01T00:00:00-00:00', ion.Precision.SECONDS, -0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00-23:59': () => test('2007-01-01T00:00:00-23:59', ion.Precision.SECONDS, -(23 * 60 + 59), 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00+23:59': () => test('2007-01-01T00:00:00+23:59', ion.Precision.SECONDS, 23 * 60 + 59, 2007, 1, 1, 0, 0, '0'),

            '2008-01-01T00:00:00.000Z'     : () => test('2008-01-01T00:00:00.000Z',      ion.Precision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000+00:00': () => test('2008-01-01T00:00:00.000+00:00', ion.Precision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000-00:00': () => test('2008-01-01T00:00:00.000-00:00', ion.Precision.SECONDS, -0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000-23:59': () => test('2008-01-01T00:00:00.000-23:59', ion.Precision.SECONDS, -(23 * 60 + 59), 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000+23:59': () => test('2008-01-01T00:00:00.000+23:59', ion.Precision.SECONDS, 23 * 60 + 59, 2008, 1, 1, 0, 0, '0.000'),

            // / boundary tests


            '2007-02-23T20:14:33.079+00:00': () => test('2007-02-23T20:14:33.079+00:00', ion.Precision.SECONDS, 0, 2007, 2, 23, 20, 14, '33.079'),
            '2007-02-23T00:14:33.079+00:00': () => test('2007-02-23T00:14:33.079+00:00', ion.Precision.SECONDS, 0, 2007, 2, 23, 0, 14, '33.079'),
            '2007-02-23T20:14:33.079-00:00': () => test('2007-02-23T20:14:33.079-00:00', ion.Precision.SECONDS, -0, 2007, 2, 23, 20, 14, '33.079'),
            '2007-02-23T00:14:33.079-00:00': () => test('2007-02-23T00:14:33.079-00:00', ion.Precision.SECONDS, -0, 2007, 2, 23, 0, 14, '33.079'),
            '2007-02-23T12:14:33.079-08:00': () => test('2007-02-23T12:14:33.079-08:00', ion.Precision.SECONDS, -8*60, 2007, 2, 23, 12, 14, '33.079'),
            '2007-02-23T00:14:33.079-08:00': () => test('2007-02-23T00:14:33.079-08:00', ion.Precision.SECONDS, -8*60, 2007, 2, 23, 0, 14, '33.079'),
        });


        function test(str, precision, offset, year, month = null, day = null, hour = null, minute = null, seconds = null) {
            // verify Timestamp members are set as expected:
            let ts = ion.Timestamp.parse(str);
            assert.equal(ts.getPrecision(), precision, 'precision');
            assert.equal(ts.getLocalOffset(), offset, 'local offset');
            assert.equal(util._sign(ts._offset), util._sign(offset), 'offset sign');
            assert.equal(ts._year, year, 'year');
            assert.equal(ts._month, month !== null ? month : 1, 'month');
            assert.equal(ts._day, day !== null ? day : 1, 'day');
            assert.equal(ts._hour, hour !== null ? hour : 0, 'hour');
            assert.equal(ts._minute, minute !== null ? minute : 0, 'minute');
            assert.equal(ts.getSecondsInt(), parseInt(seconds !== null ? seconds : '0'), 'seconds');
            assert.deepEqual(ts.getSecondsDecimal(), ion.Decimal.parse(seconds !== null ? seconds : '0'), 'seconds decimal');

            // verify Timestamp.toString() matches original string (modulo '+00:00' to 'Z' translation)
            let expectedStr = str;
            let idx = str.indexOf('+00:00');
            if (idx >= 0) {
                expectedStr = str.substring(0, idx) + 'Z';
            }
            assert.equal(ts.toString(), expectedStr);

            // verify Timestamp constructor produces an equivalent object
            let ts2 = new ion.Timestamp(offset, year, month, day, hour, minute, seconds !== null ? ion.Decimal.parse(seconds) : null);
            assert.equal(ts2.compareTo(ts), 0);
            assert.equal(ts2.equals(ts), true);
            assert.deepEqual(ts2, ts);

            // verify Timestamp can be reconstituted via date, localOffset, and fractionalSeconds
            let date = ts.getDate();
            let localOffset = ts.getLocalOffset();
            let fractionalSeconds = ts._getFractionalSeconds();
            let ts3 = ion.Timestamp._valueOf(date, localOffset, fractionalSeconds);
            assert.equal(ts3.compareTo(ts), 0);
            //assert.equal(ts3.equals(ts), true);
            //assert.deepEqual(ts3, ts);
        }


        registerSuite({
            name: 'Timestamp (invalid)',

            // boundary tests
            '0000T': () => testInvalid('0000T'),
            '10000T': () => testInvalid('10000T'),

            '2007-00T': () => testInvalid('2007-00T'),
            '2007-13T': () => testInvalid('2007-13T'),

            '2007-01-00T': () => testInvalid('2007-01-00T'),
            '2007-01-32T': () => testInvalid('2007-01-32T'),
            // TBD invalid days per month
            // TBD invalid days for leap year

            '2007-01-01T24:00': () => testInvalid('2007-01-01T24:00'),
            '2007-01-01T00:60': () => testInvalid('2007-01-01T00:60'),

            '2007-01-01T00:00:60': () => testInvalid('2007-01-01T00:00:60'),

            '2007-01-01T00:00:60-24:00': () => testInvalid('2007-01-01T00:00:00-24:00'),
            '2007-01-01T00:00:60+24:00': () => testInvalid('2007-01-01T00:00:00+24:00'),
            '2007-01-01T00:00:60-00:60': () => testInvalid('2007-01-01T00:00:00-00:60'),
            '2007-01-01T00:00:60+00:60': () => testInvalid('2007-01-01T00:00:00-00:60'),

            // / boundary tests


            '2007-01-01T00:00': () => testInvalid('2007-01-01T00:00'),  // no offset specified
        });

        function testInvalid(str) {
            assert.throws(() => ion.Timestamp.parse(str));
        }
    }
);

