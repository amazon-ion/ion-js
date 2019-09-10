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
            '0001T': () => test('0001T', ion.TimestampPrecision.YEAR, -0, 1),
            '9999T': () => test('9999T', ion.TimestampPrecision.YEAR, -0, 9999),

            '2007-01T': () => test('2007-01T', ion.TimestampPrecision.MONTH, -0, 2007, 1),
            '2007-12T': () => test('2007-12T', ion.TimestampPrecision.MONTH, -0, 2007, 12),

            '2007-01-01' : () => test('2007-01-01T', ion.TimestampPrecision.DAY, -0, 2007, 1, 1),
            '2007-01-31T': () => test('2007-01-31T', ion.TimestampPrecision.DAY, -0, 2007, 1, 31),

            '2007-01-01T00:00Z': () => test('2007-01-01T00:00Z', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0, 0),
            '2007-01-01T23:59Z': () => test('2007-01-01T23:59Z', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 23, 59),

            '2007-01-01T00:00:00Z': () => test('2007-01-01T00:00:00Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:59Z': () => test('2007-01-01T00:00:59Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '59'),

            '2007-01-01T00:00:00.000Z': () => test('2007-01-01T00:00:00.000Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.000'),
            '2007-01-01T00:00:00.999Z': () => test('2007-01-01T00:00:00.999Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.999'),

            // local offset boundary tests
            '2007-01-01T00:00Z'        : () => test('2007-01-01T00:00Z',      ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0),
            '2007-01-01T00:00+00:00'   : () => test('2007-01-01T00:00+00:00', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0),
            '2007-01-01T00:00-00:00'   : () => test('2007-01-01T00:00-00:00', ion.TimestampPrecision.HOUR_AND_MINUTE, -0, 2007, 1, 1, 0),
            '2007-01-01T00:00-23:59'   : () => test('2007-01-01T00:00-23:59', ion.TimestampPrecision.HOUR_AND_MINUTE, -(23 * 60 + 59), 2007, 1, 1, 0),
            '2007-01-01T00:00+23:59'   : () => test('2007-01-01T00:00+23:59', ion.TimestampPrecision.HOUR_AND_MINUTE, 23 * 60 + 59, 2007, 1, 1, 0),
            '2007-01-01T00:00:00Z'     : () => test('2007-01-01T00:00:00Z',      ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00+00:00': () => test('2007-01-01T00:00:00+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00-00:00': () => test('2007-01-01T00:00:00-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00-23:59': () => test('2007-01-01T00:00:00-23:59', ion.TimestampPrecision.SECONDS, -(23 * 60 + 59), 2007, 1, 1, 0, 0, '0'),
            '2007-01-01T00:00:00+23:59': () => test('2007-01-01T00:00:00+23:59', ion.TimestampPrecision.SECONDS, 23 * 60 + 59, 2007, 1, 1, 0, 0, '0'),

            '2008-01-01T00:00:00.000Z'     : () => test('2008-01-01T00:00:00.000Z',      ion.TimestampPrecision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000+00:00': () => test('2008-01-01T00:00:00.000+00:00', ion.TimestampPrecision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000-00:00': () => test('2008-01-01T00:00:00.000-00:00', ion.TimestampPrecision.SECONDS, -0, 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000-23:59': () => test('2008-01-01T00:00:00.000-23:59', ion.TimestampPrecision.SECONDS, -(23 * 60 + 59), 2008, 1, 1, 0, 0, '0.000'),
            '2008-01-01T00:00:00.000+23:59': () => test('2008-01-01T00:00:00.000+23:59', ion.TimestampPrecision.SECONDS, 23 * 60 + 59, 2008, 1, 1, 0, 0, '0.000'),
            // / boundary tests


            '2007-02-23T20:14:33.079+00:00': () =>
                test('2007-02-23T20:14:33.079+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 2, 23, 20, 14, '33.079'),
            '2007-02-23T00:14:33.079+00:00': () =>
                test('2007-02-23T00:14:33.079+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 2, 23, 0, 14, '33.079'),
            '2007-02-23T20:14:33.079-00:00': () =>
                test('2007-02-23T20:14:33.079-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 2, 23, 20, 14, '33.079'),
            '2007-02-23T00:14:33.079-00:00': () =>
                test('2007-02-23T00:14:33.079-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 2, 23, 0, 14, '33.079'),
            '2007-02-23T12:14:33.079-08:00': () =>
                test('2007-02-23T12:14:33.079-08:00', ion.TimestampPrecision.SECONDS, -8*60, 2007, 2, 23, 12, 14, '33.079'),
            '2007-02-23T00:14:33.079-08:00': () =>
                test('2007-02-23T00:14:33.079-08:00', ion.TimestampPrecision.SECONDS, -8*60, 2007, 2, 23, 0, 14, '33.079'),

            '2001-02-03T04:05:06.123456789-07:53': () =>
                test('2001-02-03T04:05:06.123456789-07:53', ion.TimestampPrecision.SECONDS, -(7*60 + 53), 2001, 2, 3, 4, 5, '6.123456789'),

            'construct with seconds as a number': () => {
                let ts = new ion.Timestamp(-7 * 60, 2000, 1, 1, 12, 30, 45);
                assert.equal(ts.getSecondsInt(), 45);
                assert.deepEqual(ts.getSecondsDecimal(), ion.Decimal.parse('45'));
                assert.deepEqual(ts._getFractionalSeconds(), ion.Decimal.ZERO);
            },

            // same precision
            'compareToYear'    : () => testCompareTo('2001T', '2002T', -1),
            'compareToMonth'   : () => testCompareTo('2001-01T', '2001-02T', -1),
            'compareToDay'     : () => testCompareTo('2001-01-01T', '2001-01-02T', -1),
            'compareToMinutes' : () => testCompareTo('2001-01-01T00:00Z', '2001-01-01T00:01Z', -1),
            'compareToSeconds' : () => testCompareTo('2001-01-01T00:00:00Z', '2001-01-01T00:00:01Z', -1),
            'compareToMs'      : () => testCompareTo('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001Z', -1),
            'compareToNs'      : () => testCompareTo('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001Z', -1),

            // different precision
            'compareToYear2'   : () => testCompareTo('2001T', '2002-01-01T00:00:00.000Z', -1),
            'compareToMonth2'  : () => testCompareTo('2001-01T', '2001-02-01T00:00:00.000Z', -1),
            'compareToDay2'    : () => testCompareTo('2001-01-01T', '2001-01-02T00:00:00.000Z', -1),
            'compareToMinutes2': () => testCompareTo('2001-01-01T00:00Z', '2001-01-01T00:01:00.000Z', -1),
            'compareToSeconds2': () => testCompareTo('2001-01-01T00:00:00Z', '2001-01-01T00:00:01.000Z', -1),
            'compareToMs2'     : () => testCompareTo('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001000000Z', -1),
            'compareToNs2'     : () => testCompareTo('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001000Z', -1),

            'compareToWithOffset1': () => testCompareTo('2001-01-01T00:59-00:01', '2001-01-01T01:00Z', 0),
            'compareToWithOffset2': () => testCompareTo('2001-01-01T01:01+00:01', '2001-01-01T01:00Z', 0),
            'compareToWithOffset3': () => testCompareTo('2001-01-01T00:59-00:01', '2001-01-01T01:01+00:01', 0),
            'compareToWithOffset4': () => testCompareTo('2001-01-01T01:01+00:02', '2001-01-01T01:00+00:00', -1),
            'compareToWithOffset5': () => testCompareTo('2001-01-01T00:59-00:02', '2001-01-01T01:00+00:00', 1),


            'notEqualsYear'    : () => testEquals('2001T', '2002T', false),
            'notEqualsYear0099': () => testEquals('0099T', '1999T', false),    // Date's default behavior converts 99 to 1999
            'notEqualsMonth'   : () => testEquals('2001-01T', '2001-02T', false),
            'notEqualsDay'     : () => testEquals('2001-01-01T', '2001-01-02T', false),
            'notEqualsMinutes' : () => testEquals('2001-01-01T00:00Z', '2001-01-01T00:01Z', false),
            'notEqualsSeconds' : () => testEquals('2001-01-01T00:00:00Z', '2001-01-01T00:00:01Z', false),
            'notEqualsMs'      : () => testEquals('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001Z', false),
            'notEqualsNs'      : () => testEquals('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001Z', false),

            // same instants, but different offsets, so not equal:
            'notEqualsWithOffset1': () => testEquals('2001-01-01T00:59-00:01', '2001-01-01T01:00Z', false),
            'notEqualsWithOffset2': () => testEquals('2001-01-01T01:01+00:01', '2001-01-01T01:00Z', false),
            'notEqualsWithOffset3': () => testEquals('2001-01-01T00:59-00:01', '2001-01-01T01:01+00:01', false),


            'equivalence': () => {
                let timestamps = [
                    ion.Timestamp.parse('2001T'),
                    ion.Timestamp.parse('2001-01T'),
                    ion.Timestamp.parse('2001-01-01T'),
                    ion.Timestamp.parse('2001-01-01T00:00Z'),
                    ion.Timestamp.parse('2001-01-01T00:00:00Z'),
                    ion.Timestamp.parse('2001-01-01T00:00:00.000Z'),
                    ion.Timestamp.parse('2001-01-01T00:00:00.000000000Z'),
                    ion.Timestamp.parse('2001-01-01T00:01+00:01'),
                    ion.Timestamp.parse('2000-12-31T23:59-00:01'),
                ];
                for (let i = 0; i < timestamps.length; i++) {
                    for (let j = 0; j < timestamps.length; j++) {
                        assert.equal(timestamps[i].compareTo(timestamps[j]), 0);     // instant equivalence
                        assert.equal(timestamps[i].equals(timestamps[j]), i === j);  // data model equivalence
                    }
                }
            },
        });

        function testCompareTo(s1, s2, expected) {
            let ts1 = ion.Timestamp.parse(s1);
            let ts2 = ion.Timestamp.parse(s2);
            assert.equal(ts1.compareTo(ts2),  expected);
            assert.equal(ts2.compareTo(ts1), -expected);
        }

        function testEquals(s1, s2, expected) {
            let ts1 = ion.Timestamp.parse(s1);
            let ts2 = ion.Timestamp.parse(s2);
            assert.equal(ts1.equals(ts2), expected);
        }

        function test(str, precision, localOffset, year, month = null, day = null, hour = null, minutes = null, seconds = null) {
            // verify Timestamp members are set as expected:
            let ts = ion.Timestamp.parse(str);
            assert.equal(ts.getPrecision(), precision, 'precision');
            assert.equal(ts.getLocalOffset(), localOffset, 'local offset');
            assert.equal(util._sign(ts.getLocalOffset()), util._sign(localOffset), 'local offset sign');
            assert.equal(ts._year, year, 'year');
            assert.equal(ts._month, month !== null ? month : 1, 'month');
            assert.equal(ts._day, day !== null ? day : 1, 'day');
            assert.equal(ts._hour, hour !== null ? hour : 0, 'hour');
            assert.equal(ts._minutes, minutes !== null ? minutes : 0, 'minutes');
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
            let ts2 = new ion.Timestamp(localOffset, year, month, day, hour, minutes, seconds !== null ? ion.Decimal.parse(seconds) : null);
            assert.equal(ts2.compareTo(ts), 0);
            assert.equal(ts2.equals(ts), true);
            assert.deepEqual(ts2, ts);

            // verify Timestamp can be fully reconstituted via date, localOffset, fractionalSeconds, and precision
            let ts3 = ion.Timestamp._valueOf(ts.getDate(), ts.getLocalOffset(), ts._getFractionalSeconds(), ts.getPrecision());
            assert.equal(ts3.compareTo(ts), 0);
            assert.equal(ts3.equals(ts), true);
            assert.deepEqual(ts3, ts);
        }


        let invalidTimestamps = [
            // boundary tests
            '0000T',
            '10000T',

            '2007-00T',
            '2007-13T',

            '2007-01-00T',
            '2007-01-32T',
            // TBD invalid days per month
            // TBD invalid days for leap year

            '2007-01-01T24:00',
            '2007-01-01T00:60',

            '2007-01-01T00:00:60',

            '2007-01-01T00:00:60-24:00',
            '2007-01-01T00:00:60+24:00',
            '2007-01-01T00:00:60-00:60',
            '2007-01-01T00:00:60+00:60',
            // / boundary tests


            // offset rollover tests
            '0001-01-01T00:00+00:01',  // rolls back to year 0
            '9999-12-31T23:59-00:01',  // rolls forward to year 10000
            // /offset rollover tests


            '2007-01-01T00:00',  // no offset specified
        ];
        let invalidSuite = { name: 'Timestamp (invalid)' };
        invalidTimestamps.forEach(str => {
            invalidSuite[str] = () => assert.throws(() => ion.Timestamp.parse(str));
        });

        registerSuite(invalidSuite);
    }
);

