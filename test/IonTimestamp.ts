/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {assert} from 'chai';
import * as ion from '../src/Ion';
import * as util from '../src/util';
import {TimestampPrecision} from "../src/Ion";

function testParsing(str: string,
                     precision: TimestampPrecision,
                     localOffset: number,
                     year: number,
                     month: number | null = null,
                     day: number | null = null,
                     hour: number | null = null,
                     minutes: number | null = null,
                     seconds: string | null = null): void {

    // verify Timestamp members are set as expected:
    let ts = ion.Timestamp.parse(str)!;
    assert.equal(ts.getPrecision(), precision, 'precision');
    assert.equal(ts.getLocalOffset(), localOffset, 'local offset');
    assert.equal(util._sign(ts.getLocalOffset()), util._sign(localOffset), 'local offset sign');
    // FIXME: This code uses the ts['_fieldName'] syntax to sidestep visibility restrictions on these fields.
    // We should expose accessors for these values and update this test to use public functionality.
    assert.equal(ts['_year'], year, 'year');
    assert.equal(ts['_month'], month !== null ? month : 1, 'month');
    assert.equal(ts['_day'], day !== null ? day : 1, 'day');
    assert.equal(ts['_hour'], hour !== null ? hour : 0, 'hour');
    assert.equal(ts['_minutes'], minutes !== null ? minutes : 0, 'minutes');
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

function testCompareTo(s1: string, s2: string, expected: number) {
    let ts1 = ion.Timestamp.parse(s1)!;
    let ts2 = ion.Timestamp.parse(s2)!;
    assert.equal(ts1.compareTo(ts2), expected);
    assert.equal(ts2.compareTo(ts1), -expected);
}

function testEquals(s1: string, s2: string, expected: boolean) {
    let ts1 = ion.Timestamp.parse(s1)!;
    let ts2 = ion.Timestamp.parse(s2)!;
    assert.equal(ts1.equals(ts2), expected);
}

let invalidTimestamps: Array<string> = [
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

let equivalentTimestamps = [
    '2001T',
    '2001-01T',
    '2001-01-01T',
    '2001-01-01T00:00Z',
    '2001-01-01T00:00:00Z',
    '2001-01-01T00:00:00.000Z',
    '2001-01-01T00:00:00.000000000Z',
    '2001-01-01T00:01+00:01',
    '2000-12-31T23:59-00:01',
].map(ion.Timestamp.parse);

let parsingTests = [
    // boundary tests (for each field of a timestamp)
    {text: '0001T', test: () => testParsing('0001T', ion.TimestampPrecision.YEAR, -0, 1)},
    {text: '9999T', test: () => testParsing('9999T', ion.TimestampPrecision.YEAR, -0, 9999)},
    {text: '2007-01T', test: () => testParsing('2007-01T', ion.TimestampPrecision.MONTH, -0, 2007, 1)},
    {text: '2007-12T', test: () => testParsing('2007-12T', ion.TimestampPrecision.MONTH, -0, 2007, 12)},
    {text: '2007-01-01', test: () => testParsing('2007-01-01T', ion.TimestampPrecision.DAY, -0, 2007, 1, 1)},
    {text: '2007-01-31T', test: () => testParsing('2007-01-31T', ion.TimestampPrecision.DAY, -0, 2007, 1, 31)},
    {text: '2007-01-01T00:00Z', test: () => testParsing('2007-01-01T00:00Z', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0, 0)},
    {text: '2007-01-01T23:59Z', test: () => testParsing('2007-01-01T23:59Z', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 23, 59)},
    {text: '2007-01-01T00:00:00Z', test: () => testParsing('2007-01-01T00:00:00Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0')},
    {text: '2007-01-01T00:00:59Z', test: () => testParsing('2007-01-01T00:00:59Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '59')},
    {text: '2007-01-01T00:00:00.000Z', test: () => testParsing('2007-01-01T00:00:00.000Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.000')},
    {text: '2007-01-01T00:00:00.999Z', test: () => testParsing('2007-01-01T00:00:00.999Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0.999')},

    // local offset boundary tests
    {text: '2007-01-01T00:00Z', test: () => testParsing('2007-01-01T00:00Z', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0)},
    {text: '2007-01-01T00:00+00:00', test: () => testParsing('2007-01-01T00:00+00:00', ion.TimestampPrecision.HOUR_AND_MINUTE, 0, 2007, 1, 1, 0)},
    {text: '2007-01-01T00:00-00:00', test: () => testParsing('2007-01-01T00:00-00:00', ion.TimestampPrecision.HOUR_AND_MINUTE, -0, 2007, 1, 1, 0)},
    {text: '2007-01-01T00:00-23:59', test: () => testParsing('2007-01-01T00:00-23:59', ion.TimestampPrecision.HOUR_AND_MINUTE, -(23 * 60 + 59), 2007, 1, 1, 0)},
    {text: '2007-01-01T00:00+23:59', test: () => testParsing('2007-01-01T00:00+23:59', ion.TimestampPrecision.HOUR_AND_MINUTE, 23 * 60 + 59, 2007, 1, 1, 0)},
    {text: '2007-01-01T00:00:00Z', test: () => testParsing('2007-01-01T00:00:00Z', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0')},
    {text: '2007-01-01T00:00:00+00:00', test: () => testParsing('2007-01-01T00:00:00+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 1, 1, 0, 0, '0')},
    {text: '2007-01-01T00:00:00-00:00', test: () => testParsing('2007-01-01T00:00:00-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 1, 1, 0, 0, '0')},
    {text: '2007-01-01T00:00:00-23:59', test: () => testParsing('2007-01-01T00:00:00-23:59', ion.TimestampPrecision.SECONDS, -(23 * 60 + 59), 2007, 1, 1, 0, 0, '0')},
    {text: '2007-01-01T00:00:00+23:59', test: () => testParsing('2007-01-01T00:00:00+23:59', ion.TimestampPrecision.SECONDS, 23 * 60 + 59, 2007, 1, 1, 0, 0, '0')},
    {text: '2008-01-01T00:00:00.000Z', test: () => testParsing('2008-01-01T00:00:00.000Z', ion.TimestampPrecision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000')},
    {text: '2008-01-01T00:00:00.000+00:00', test: () => testParsing('2008-01-01T00:00:00.000+00:00', ion.TimestampPrecision.SECONDS, 0, 2008, 1, 1, 0, 0, '0.000')},
    {text: '2008-01-01T00:00:00.000-00:00', test: () => testParsing('2008-01-01T00:00:00.000-00:00', ion.TimestampPrecision.SECONDS, -0, 2008, 1, 1, 0, 0, '0.000')},
    {text: '2008-01-01T00:00:00.000-23:59', test: () => testParsing('2008-01-01T00:00:00.000-23:59', ion.TimestampPrecision.SECONDS, -(23 * 60 + 59), 2008, 1, 1, 0, 0, '0.000')},
    {text: '2008-01-01T00:00:00.000+23:59', test: () => testParsing('2008-01-01T00:00:00.000+23:59', ion.TimestampPrecision.SECONDS, 23 * 60 + 59, 2008, 1, 1, 0, 0, '0.000')},
    // / boundary tests

    {text: '2007-02-23T20:14:33.079+00:00', test: () => testParsing('2007-02-23T20:14:33.079+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 2, 23, 20, 14, '33.079')},
    {text: '2007-02-23T00:14:33.079+00:00', test: () => testParsing('2007-02-23T00:14:33.079+00:00', ion.TimestampPrecision.SECONDS, 0, 2007, 2, 23, 0, 14, '33.079')},
    {text: '2007-02-23T20:14:33.079-00:00', test: () => testParsing('2007-02-23T20:14:33.079-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 2, 23, 20, 14, '33.079')},
    {text: '2007-02-23T00:14:33.079-00:00', test: () => testParsing('2007-02-23T00:14:33.079-00:00', ion.TimestampPrecision.SECONDS, -0, 2007, 2, 23, 0, 14, '33.079')},
    {text: '2007-02-23T12:14:33.079-08:00', test: () => testParsing('2007-02-23T12:14:33.079-08:00', ion.TimestampPrecision.SECONDS, -8 * 60, 2007, 2, 23, 12, 14, '33.079')},
    {text: '2007-02-23T00:14:33.079-08:00', test: () => testParsing('2007-02-23T00:14:33.079-08:00', ion.TimestampPrecision.SECONDS, -8 * 60, 2007, 2, 23, 0, 14, '33.079')},
    {text: '2001-02-03T04:05:06.123456789-07:53', test: () => testParsing('2001-02-03T04:05:06.123456789-07:53', ion.TimestampPrecision.SECONDS, -(7 * 60 + 53), 2001, 2, 3, 4, 5, '6.123456789')},
];

let compareToTests = [
    // same precision
    {text: 'compareToYear', test: () => testCompareTo('2001T', '2002T', -1)},
    {text: 'compareToMonth', test: () => testCompareTo('2001-01T', '2001-02T', -1)},
    {text: 'compareToDay', test: () => testCompareTo('2001-01-01T', '2001-01-02T', -1)},
    {text: 'compareToMinutes', test: () => testCompareTo('2001-01-01T00:00Z', '2001-01-01T00:01Z', -1)},
    {text: 'compareToSeconds', test: () => testCompareTo('2001-01-01T00:00:00Z', '2001-01-01T00:00:01Z', -1)},
    {text: 'compareToMs', test: () => testCompareTo('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001Z', -1)},
    {text: 'compareToNs', test: () => testCompareTo('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001Z', -1)},

    // different precision
    {text: 'compareToYear2', test: () => testCompareTo('2001T', '2002-01-01T00:00:00.000Z', -1)},
    {text: 'compareToMonth2', test: () => testCompareTo('2001-01T', '2001-02-01T00:00:00.000Z', -1)},
    {text: 'compareToDay2', test: () => testCompareTo('2001-01-01T', '2001-01-02T00:00:00.000Z', -1)},
    {text: 'compareToMinutes2', test: () => testCompareTo('2001-01-01T00:00Z', '2001-01-01T00:01:00.000Z', -1)},
    {text: 'compareToSeconds2', test: () => testCompareTo('2001-01-01T00:00:00Z', '2001-01-01T00:00:01.000Z', -1)},
    {text: 'compareToMs2', test: () => testCompareTo('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001000000Z', -1)},
    {text: 'compareToNs2', test: () => testCompareTo('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001000Z', -1)},
    {text: 'compareToWithOffset1', test: () => testCompareTo('2001-01-01T00:59-00:01', '2001-01-01T01:00Z', 0)},
    {text: 'compareToWithOffset2', test: () => testCompareTo('2001-01-01T01:01+00:01', '2001-01-01T01:00Z', 0)},
    {text: 'compareToWithOffset3', test: () => testCompareTo('2001-01-01T00:59-00:01', '2001-01-01T01:01+00:01', 0)},
    {text: 'compareToWithOffset4', test: () => testCompareTo('2001-01-01T01:01+00:02', '2001-01-01T01:00+00:00', -1)},
    {text: 'compareToWithOffset5', test: () => testCompareTo('2001-01-01T00:59-00:02', '2001-01-01T01:00+00:00', 1)},
];

let equalsTests = [
    {text: 'notEqualsYear', test: () => testEquals('2001T', '2002T', false)},

    // Date's default behavior converts 99 to 1999
    {text: 'notEqualsYear0099', test: () => testEquals('0099T', '1999T', false)},

    {text: 'notEqualsMonth', test: () => testEquals('2001-01T', '2001-02T', false)},
    {text: 'notEqualsDay', test: () => testEquals('2001-01-01T', '2001-01-02T', false)},
    {text: 'notEqualsMinutes', test: () => testEquals('2001-01-01T00:00Z', '2001-01-01T00:01Z', false)},
    {text: 'notEqualsSeconds', test: () => testEquals('2001-01-01T00:00:00Z', '2001-01-01T00:00:01Z', false)},
    {text: 'notEqualsMs', test: () => testEquals('2001-01-01T00:00:00.000Z', '2001-01-01T00:00:00.001Z', false)},
    {text: 'notEqualsNs', test: () => testEquals('2001-01-01T00:00:00.000000000Z', '2001-01-01T00:00:00.000000001Z', false)},

    // same instants, but different offsets, so not equal:
    {text: 'notEqualsWithOffset1', test: () => testEquals('2001-01-01T00:59-00:01', '2001-01-01T01:00Z', false)},
    {text: 'notEqualsWithOffset2', test: () => testEquals('2001-01-01T01:01+00:01', '2001-01-01T01:00Z', false)},
    {text: 'notEqualsWithOffset3', test: () => testEquals('2001-01-01T00:59-00:01', '2001-01-01T01:01+00:01', false)},
];

describe("Timestamp", () => {
    describe("Timestamp Parsing", () => {
        for (let parsingTest of parsingTests) {
            it(parsingTest.text, parsingTest.test);
        }
    });
    describe("Invalid timestamps", () => invalidTimestamps.forEach((timestampText) => {
        it(timestampText, () => assert.throws(() => ion.Timestamp.parse(timestampText)));
    }));
    describe("Equivalent Timestamps", () => {
        for (let timestamp1 of equivalentTimestamps) {
            for (let timestamp2 of equivalentTimestamps) {
                it(timestamp1 + " is equivalent to " + timestamp2, () => {
                    assert.equal(timestamp1!.compareTo(timestamp2!), 0);     // instant equivalence
                    assert.equal(timestamp1!.equals(timestamp2!), timestamp1 === timestamp2);  // data model equivalence
                });
            }
        }
    });
    describe("compareTo", () => {
        for (let compareToTest of compareToTests) {
            it(compareToTest.text, compareToTest.test);
        }
    });
    describe("equals", () => {
        for (let equalsTest of equalsTests) {
            it(equalsTest.text, equalsTest.test);
        }
    });
    it('construct with seconds as a number', () => {
        let ts = new ion.Timestamp(-7 * 60, 2000, 1, 1, 12, 30, 45);
        assert.equal(ts.getSecondsInt(), 45);
        assert.deepEqual(ts.getSecondsDecimal(), ion.Decimal.parse('45'));
        assert.deepEqual(ts._getFractionalSeconds(), ion.Decimal.ZERO);
    });
});