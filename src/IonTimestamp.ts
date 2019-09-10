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

import {Decimal} from "./IonDecimal";
import {isDigit} from "./IonText"
import {_hasValue, _sign} from "./util";

export enum TimestampPrecision {
    YEAR = 1,
    MONTH = 2,
    DAY = 3,
    HOUR_AND_MINUTE = 4,
    SECONDS = 5,
}

/**
 * This class provides the additional semantics necessary for Ion timestamp values.
 */
export class Timestamp {
    private static _MIN_SECONDS = Decimal.ZERO;
    private static _MAX_SECONDS = Decimal.parse('60');
    private static _MIN_MINUTE = 0;
    private static _MAX_MINUTE = 59;
    private static _MIN_HOUR = 0;
    private static _MAX_HOUR = 23;
    private static _MIN_DAY = 1;
    private static _MAX_DAY = 31;
    private static _MIN_MONTH = 1;
    private static _MAX_MONTH = 12;
    private static _MIN_YEAR = 1;
    private static _MAX_YEAR = 9999;
    private static _MIN_OFFSET = -23 * 60 - 59;
    private static _MAX_OFFSET =  23 * 60 + 59;

    /**
     * Parses a string and returns a corresponding Timestamp object.
     * The provided string must be a text-encoded Timestamp as specified
     * in the Ion specification.
     *
     * @see https://amzn.github.io/ion-docs/docs/spec.html#timestamp
     */
    static parse(str: string) : Timestamp {
        return _TimestampParser._parse(str);
    }

    private readonly _localOffset : number;
    private readonly _year : number;
    private readonly _month? : number;
    private readonly _day? : number;
    private readonly _hour? : number;
    private readonly _minutes? : number;

    private _precision: TimestampPrecision;
    private readonly _secondsDecimal: Decimal;

    /**
     * Creates a new Timestamp, with precision determined by which parameters
     * are provided.  If a parameter is not specified, it defaults to its lowest
     * valid value;  defaulted values are not used when determining the precision.
     *
     * Logically, an instance of this class represents an instant in time based on
     * an offset from UTC and the other provided parameters.
     *
     * @param localOffset Local offset from UTC (range: [-(23\*60+59):(23\*60+59)])
     * @param year the year (range: [1-9999])
     * @param month the month (range: [1-12])
     * @param day the day of the month (range: [1-31])
     * @param hour the hour of the day (range: [0-23])
     * @param minutes number of minutes (range: [0-59])
     * @param seconds number of seconds specified as a number (range: [0-59]),
     *                or a Decimal (range: [0.0-60.0)) in order to express whole seconds
     *                along with some fractional seconds
     */
    constructor(localOffset : number,
                year : number,
                month? : number,
                day? : number,
                hour? : number,
                minutes? : number,
                seconds? : number | Decimal) {

        this._localOffset = localOffset;
        this._year = year;

        this._precision = TimestampPrecision.YEAR;
        this._checkRequiredField('Offset', this._localOffset, Timestamp._MIN_OFFSET, Timestamp._MAX_OFFSET);
        this._checkRequiredField('Year', this._year, Timestamp._MIN_YEAR, Timestamp._MAX_YEAR);
        this._month = this._checkOptionalField('Month', month, Timestamp._MIN_MONTH, Timestamp._MAX_MONTH, 1, TimestampPrecision.MONTH);
        this._day = this._checkOptionalField('Day', day, Timestamp._MIN_DAY, Timestamp._MAX_DAY, 1, TimestampPrecision.DAY);
        this._hour = this._checkOptionalField('Hour', hour, Timestamp._MIN_HOUR, Timestamp._MAX_HOUR, 0, TimestampPrecision.HOUR_AND_MINUTE);
        this._minutes = this._checkOptionalField('Minutes', minutes, Timestamp._MIN_MINUTE, Timestamp._MAX_MINUTE, 0, TimestampPrecision.HOUR_AND_MINUTE);

        if (typeof seconds === 'number') {
            if (!Number.isInteger(seconds)) {
                throw new Error('The provided seconds number was not an integer (' + seconds + ')');
            }
            this._secondsDecimal = new Decimal(seconds, 0);
        } else {
            this._secondsDecimal = seconds;
        }
        if (this._secondsDecimal === null || this._secondsDecimal === undefined) {
            this._secondsDecimal = Decimal.ZERO;
        } else {
            this._checkFieldRange('Seconds', this._secondsDecimal, Timestamp._MIN_SECONDS, Timestamp._MAX_SECONDS);
            this._precision = TimestampPrecision.SECONDS;
        }

        if (this._precision <= TimestampPrecision.DAY) {
            this._localOffset = -0;    // force local offset to "unknown" for YEAR/MONTH/DAY precisions
        }

        if (this._precision > TimestampPrecision.MONTH) {
            // check the days per month - first the general case, basically index into the next month
            // (which doesnt need +1 because we index from 1 to 12 unlike Date) and look at the day before which is indexed with 0.
            let tempDate = new Date(this._year, this._month, 0);
            tempDate.setUTCFullYear(this._year);
            if (this._day > tempDate.getDate()) {
                throw new Error(`Month ${this._month} has less than ${this._day} days`);
            }

            // now the special case for feb 29th and leap year
            if (this._month === 2 && this._day === 29) {
                if (!this._isLeapYear(this._year)) {
                    throw new Error(`Given February 29th but year ${this._year} is not a leap year`);
                }
            }
        }

        // verify that year (compensated by offset) is within the valid range:
        let utcYear = this.getDate().getUTCFullYear();
        this._checkFieldRange('Year', utcYear, Timestamp._MIN_YEAR, Timestamp._MAX_YEAR);
    }

    private _checkRequiredField(fieldName: string, value: number, min: number, max: number) {
        if (!_hasValue(value)) {
            throw new Error(`${fieldName} cannot be ${value}`);
        }
        this._checkFieldRange(fieldName, value, min, max);
    }

    private _checkOptionalField(fieldName: string, value: number,
                                min: number, max: number, defaultValue: number,
                                precision: TimestampPrecision) : number {
        if (!_hasValue(value)) {
            return defaultValue;
        }
        this._checkFieldRange(fieldName, value, min, max);
        this._precision = precision;
        return value;
    }

    private _checkFieldRange(fieldName: string, value: number | Decimal, min: number | Decimal, max: number | Decimal) {
        if (value instanceof Decimal) {
            if (_hasValue(value)
                    && (value.compareTo(min as Decimal) < 0
                     || value.compareTo(max as Decimal) >= 0)) {
                throw new Error(`${fieldName} ${value} must be between ${min} inclusive, and ${max} exclusive`);
            }
        } else {
            if (!Number.isInteger(value)) {
                throw new Error(`${fieldName} ${value} must be an integer`);
            }
            if (value < min || value > max) {
                throw new Error(`${fieldName} ${value} must be between ${min} and ${max} inclusive`);
            }
        }
    }

    /**
     * For all years between 1 and 9999, inclusive, the result of this method agrees with
     * that produced by the following Java code:
     *
     *     new java.util.GregorianCalendar().isLeapYear(year)
     */
    private _isLeapYear(year: number) : boolean {
        if (year % 4 !== 0) {
            return false;
        }
        if (year % 400 === 0) {
            return true;
        }
        if (year % 100 === 0) {
            return year < 1600;
        }
        return true;
    }

    /**
     * Returns this Timestamp's local offset from UTC, in minutes.
     */
    getLocalOffset() : number {
        return this._localOffset;
    }

    /**
     * Returns the precision of this Timestamp.
     */
    getPrecision() : TimestampPrecision {
        return this._precision;
    }

    /**
     * Returns a Date representing the value of this Timestamp.  Note that this may be a lossy
     * operation, as a Date cannot fully represent all Timestamp values.  Specifically:
     * - fractional seconds of a Timestamp beyond millisecond precision are rounded
     *   to the nearest millisecond in the returned Date
     * - if the precision of this Timestamp is YEAR or MONTH, the returned Date's month and day
     *   are set to January 1
     * - the returned Date object is not aware of this Timestamp's local offset property
     *
     * With the exception of the discrepancies noted above, the returned Date will represent the
     * same instant in time as this Timestamp.  However, most methods of the Date API will return
     * properties in the _local date and time_ of the instant, which may differ from the local
     * offset of the Timestamp.  The Date class also provides methods for retrieving the properties
     * of the instant in UTC.
     */
    getDate() : Date {
        let ms = null;
        if (this._precision === TimestampPrecision.SECONDS) {
            ms = Math.round((this._secondsDecimal.numberValue() - this.getSecondsInt()) * 1000);
        }

        let msSinceEpoch = Date.UTC(
                this._year, (this._precision === TimestampPrecision.YEAR ? 0 : this._month - 1), this._day,
                this._hour, this._minutes, this.getSecondsInt(), ms);

        msSinceEpoch = Timestamp._adjustMsSinceEpochIfNeeded(this._year, msSinceEpoch);

        let offsetShiftMs = this._localOffset * 60 * 1000;
        return new Date(msSinceEpoch - offsetShiftMs);
    }

    /**
     * For a year < 100, JavaScript Date's default behavior automatically adds 1900;
     * this method compensates for that behavior
     */
    static _adjustMsSinceEpochIfNeeded(year: number, msSinceEpoch: number) : number {
        if (year >= 100) {
            return msSinceEpoch;
        }

        let date = new Date(msSinceEpoch);
        date.setUTCFullYear(year);     // yes, we really do mean some year < 100
        return date.getTime();
    }

    /**
     * Returns the number of seconds as an integer value; any fractional seconds are truncated.
     */
    getSecondsInt() : number {
        return this._secondsDecimal.intValue();
    }

    /**
     * Returns a decimal representing the number of seconds (including fractional seconds).
     */
    getSecondsDecimal() : Decimal {
        return this._secondsDecimal;
    }

    /**
     * Returns a decimal representing only the fractional seconds.
     * @hidden
     */
    _getFractionalSeconds() : Decimal {
        let [_, fractionStr] = Timestamp._splitSecondsDecimal(this._secondsDecimal);
        if (fractionStr === '') {
            return Decimal.ZERO;
        }
        return Decimal.parse(fractionStr + 'd-' + fractionStr.length);
    }

    /**
     * Compares this Timestamp with another and returns true if they represent the same instant
     * and have the same precision.  Note that this differs from compareTo(), which doesn't require
     * precision to match when returning 0.
     */
    equals(that : Timestamp) : boolean {
        return this.getPrecision() === that.getPrecision()
            && this.getLocalOffset() === that.getLocalOffset()
            && _sign(this.getLocalOffset()) === _sign(that.getLocalOffset())
            && this.compareTo(that) === 0
            && this._secondsDecimal.equals(that._secondsDecimal);
    }

    /**
     * Compares this Timestamp with another and returns -1, 0, or 1 if the instant represented
     * by this Timestamp occurs before, at the same time, or after the other Timestamp.
     *
     * Note that a return value of 0 from this method doesn't guarantee that equals() will return true,
     * as compareTo() doesn't require the values to have the same precision and local offset to be
     * considered the same instant, whereas equals() does.  The following table illustrates this behavior:
     *
     *   | Timestamp 1              | Timestamp 2              | compareTo | equals |
     *   | ------------------------ | ------------------------ | --------- | ------ |
     *   | 2001T                    | 2001T                    |     0     | true   |
     *   | 2001-01-01T              | 2001-01-01T              |     0     | true   |
     *   | 2001-01-01T00:00:00.000Z | 2001-01-01T00:00:00.000Z |     0     | true   |
     *   | 2001T                    | 2001-01-01T              |     0     | false  |
     *   | 2001T                    | 2001-01-01T00:00:00.000Z |     0     | false  |
     *   | 2001-01-01T00:00Z        | 2000-12-31T23:59-00:01   |     0     | false  |
     */
    compareTo(that : Timestamp) : number {
        let thisMs = this.getDate().getTime();
        let thatMs = that.getDate().getTime();
        if (thisMs === thatMs) {
            return this.getSecondsDecimal().compareTo(that.getSecondsDecimal());
        }
        return thisMs < thatMs ? -1 : 1;
    }

    /**
     * Splits secondsDecimal into two strings representing the whole and fractional portions of the decimal.
     * @hidden
     */
    static _splitSecondsDecimal(secondsDecimal: Decimal) : [string, string] {
        let coefStr = secondsDecimal._getCoefficient().toString();
        let exp = secondsDecimal._getExponent();
        let secondsStr = '';
        let fractionStr = '';
        if (exp < 0) {
            let idx = Math.max(coefStr.length + exp, 0);
            secondsStr = coefStr.substr(0, idx);
            fractionStr = coefStr.substr(idx);
            if (-secondsDecimal._getExponent() - coefStr.length > 0) {
                fractionStr = '0'.repeat(-exp - coefStr.length) + fractionStr;
            }
        } else if (exp > 0) {
            secondsStr = coefStr + '0'.repeat(exp);
        } else {
            secondsStr = coefStr;
        }
        return [secondsStr, fractionStr];
    }

    /**
     * Returns a string representation of this Timestamp.
     */
    toString() : string {
        let strVal: string = "";
        switch (this._precision) {
            default: throw new Error("unrecognized timestamp precision " + this._precision);
            case TimestampPrecision.SECONDS:
                let [secondsStr, fractionStr] = Timestamp._splitSecondsDecimal(this._secondsDecimal);
                strVal = this._lpadZeros(secondsStr, 2);
                if (fractionStr.length > 0) {
                    strVal += '.' + fractionStr;
                }
            case TimestampPrecision.HOUR_AND_MINUTE:
                strVal = this._lpadZeros(this._minutes, 2) + (strVal ? ":" + strVal : "");
                strVal = this._lpadZeros(this._hour, 2) + (strVal ? ":" + strVal : "");
            case TimestampPrecision.DAY:
                strVal = this._lpadZeros(this._day, 2) + (strVal ? "T" + strVal : "T");
            case TimestampPrecision.MONTH:
                strVal = this._lpadZeros(this._month, 2) + (strVal ? "-" + strVal : "");
            case TimestampPrecision.YEAR:
                if (this._precision === TimestampPrecision.YEAR) {
                    strVal = this._lpadZeros(this._year, 4) + "T";
                } else if (this._precision === TimestampPrecision.MONTH) {
                    strVal = this._lpadZeros(this._year, 4) + "-" + strVal + "T";
                } else {
                    strVal = this._lpadZeros(this._year, 4) + "-" + strVal;
                }
        }

        // hours : minute (for offset)
        let o: number = this._localOffset;
        if (this._precision > TimestampPrecision.DAY) {
            if (o === 0 && _sign(o) === 1) {
                strVal = strVal + "Z";
            } else {
                strVal += (_sign(o) === -1 ? '-' : '+')
                    + this._lpadZeros(Math.floor(Math.abs(o) / 60), 2)
                    + ':'
                    + this._lpadZeros(Math.abs(o) % 60, 2);
            }
        }
        return strVal;
    }

    private _lpadZeros(v: number | string, size: number) : string {
        let s = v.toString();
        if (s.length <= size) {
            return '0'.repeat(size - s.length) + s;
        }
        throw new Error("Unable to fit '" + s + "' into " + size + " characters");
    }

    /**
     * Enables construction of a Timestamp based on a Date.  If the correct parameters are provided,
     * a Timestamp can be fully reconstituted as follows:
     *
     * ```typescript
     * let ts = Timestamp.parse('2001-02-03T04:05:06.123456789-07:00');
     * let date = ts.getDate();
     * ...
     * let ts2 = Timestamp._valueOf(date, ts.getLocalOffset(), ts._getFractionalSeconds(), ts.getPrecision());
     * assert.deepEqual(ts2, ts);
     * ```
     * @hidden
     */
    static _valueOf(date: Date, localOffset: number, fractionalSeconds?: Decimal, precision?: TimestampPrecision) : Timestamp {
        let msSinceEpoch = date.getTime() + localOffset * 60 * 1000;
        date = new Date(msSinceEpoch);

        let secondsDecimal: Decimal;
        if (fractionalSeconds != null) {
            let [_, fractionStr] = Timestamp._splitSecondsDecimal(fractionalSeconds);
            secondsDecimal = Decimal.parse(date.getUTCSeconds() + '.' + fractionStr);
        } else {
            secondsDecimal = Decimal.parse(date.getUTCSeconds() + '.' + date.getUTCMilliseconds());
        }

        switch (precision) {
            case TimestampPrecision.YEAR:
                return new Timestamp(localOffset, date.getUTCFullYear());
            case TimestampPrecision.MONTH:
                return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1);
            case TimestampPrecision.DAY:
                return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
            case TimestampPrecision.HOUR_AND_MINUTE:
                return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
                    date.getUTCHours(), date.getUTCMinutes());
            case TimestampPrecision.SECONDS:
            default:
                return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
                    date.getUTCHours(), date.getUTCMinutes(), secondsDecimal);
        }
    }
}

enum _States {
    YEAR,
    MONTH,
    DAY,
    HOUR,
    MINUTE,
    SECONDS,
    FRACTIONAL_SECONDS,
    OFFSET_POSITIVE,
    OFFSET_NEGATIVE,
    OFFSET_MINUTES,
    OFFSET_ZULU,
    OFFSET_UNKNOWN,
}

interface _TransitionMap {
    [index: string]: _States;
}

interface _StateMap {
    [index: number]: _TimeParserState;
}

class _TimeParserState {
    constructor(
        public readonly f: _States,
        public readonly len: number,
        public readonly t: _TransitionMap
    ) {}
}

class _TimestampParser {
    private static _timeParserStates: _StateMap = {
        [_States.YEAR]:
            new _TimeParserState(_States.YEAR, 4, {"T": _States.OFFSET_UNKNOWN, "-": _States.MONTH}),
        [_States.MONTH]:
            new _TimeParserState(_States.MONTH, 2, {"T": _States.OFFSET_UNKNOWN, "-": _States.DAY}),
        [_States.DAY]:
            new _TimeParserState(_States.DAY, 2, {"T": _States.HOUR}),
        [_States.HOUR]:
            new _TimeParserState(_States.HOUR, 2, {":": _States.MINUTE}),
        [_States.MINUTE]:
            new _TimeParserState(_States.MINUTE, 2, {":": _States.SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU}),
        [_States.SECONDS]:
            new _TimeParserState(_States.SECONDS, 2, {".": _States.FRACTIONAL_SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU}),
        [_States.FRACTIONAL_SECONDS]:
            new _TimeParserState(_States.FRACTIONAL_SECONDS, undefined, {"+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU}),
        [_States.OFFSET_POSITIVE]:
            new _TimeParserState(_States.OFFSET_POSITIVE, 2, {":": _States.OFFSET_MINUTES}),
        [_States.OFFSET_NEGATIVE]:
            new _TimeParserState(_States.OFFSET_NEGATIVE, 2, {":": _States.OFFSET_MINUTES}),
        [_States.OFFSET_MINUTES]:
            new _TimeParserState(_States.OFFSET_MINUTES, 2, undefined),
        [_States.OFFSET_ZULU]:
            new _TimeParserState(_States.OFFSET_ZULU, 0, undefined),
        [_States.OFFSET_UNKNOWN]:
            new _TimeParserState(_States.OFFSET_UNKNOWN, 0, undefined),
    };

    static _parse(str: string) : Timestamp {
        if (str.length < 1) {
            return null;
        }
        if (str.charCodeAt(0) === 110) {  // "n"
            if (str === "null" || str === "null.timestamp") {
                return null;
            }
            throw new Error("Illegal timestamp: " + str);
        }

        let offsetSign: number;
        let offset: number;
        let year: number = 0;
        let month: number;
        let day: number;
        let hour: number;
        let minute: number;
        let secondsInt: number;
        let fractionStr = '';

        let pos: number = 0;
        let state: _TimeParserState = _TimestampParser._timeParserStates[_States.YEAR];
        let limit: number = str.length;

        let v: number;

        while (pos < limit) {
            if (state.len === undefined) {
                let digits: string = _TimestampParser._readUnknownDigits(str, pos);
                if (digits.length === 0) throw new Error("No digits found at pos: " + pos);
                v = parseInt(digits, 10);
                pos += digits.length;
            } else if (state.len > 0) {
                v = _TimestampParser._readDigits(str, pos, state.len);
                if (v < 0) throw new Error("Non digit value found at pos " + pos);
                pos = pos + state.len;
            }
            switch (state.f) {
                case _States.YEAR:
                    year = v;
                    break;
                case _States.MONTH:
                    month = v;
                    break;
                case _States.DAY:
                    day = v;
                    break;
                case _States.HOUR:
                    hour = v;
                    break;
                case _States.MINUTE:
                    minute = v;
                    break;
                case _States.SECONDS:
                    secondsInt = v;
                    break;
                case _States.FRACTIONAL_SECONDS:
                    fractionStr = str.substring(20, pos);
                    break;
                case _States.OFFSET_POSITIVE:
                    offsetSign = 1;
                    offset = v * 60;
                    break;
                case _States.OFFSET_NEGATIVE:
                    offsetSign = -1;
                    offset = v * 60;
                    break;
                case _States.OFFSET_MINUTES:
                    offset += v;
                    if(v >= 60) throw new Error("Minute offset " + String(v) + " above maximum or equal to : 60");
                    break;
                case _States.OFFSET_ZULU:
                    offsetSign = 1;
                    offset = 0;
                    break;
                case _States.OFFSET_UNKNOWN:
                    offset = -0;
                    break;
                default:
                    throw new Error("invalid internal state");
            }
            if (pos >= limit) {
                break;
            }
            if (state.t !== undefined) {
                let c: string = String.fromCharCode(str.charCodeAt(pos));
                state = _TimestampParser._timeParserStates[state.t[c]];
                if (state === undefined) throw new Error("State was not set pos:" + pos);
                if (state.f === _States.OFFSET_ZULU) {     // TBD why is this a special case here?
                    offsetSign = 1;
                    offset = 0;
                }
            }
            pos++;
        }

        if (offset === undefined) {
            if (minute !== undefined) {
                throw new Error('invalid timestamp, missing local offset: "' + str + '"');
            }
            offset = -0;
        } else {
            offset = offsetSign * offset;
        }

        let seconds: Decimal;
        if ((secondsInt !== undefined && secondsInt !== null) || fractionStr) {
            seconds = Decimal.parse(secondsInt + '.' + (fractionStr ? fractionStr : ''));
        }
        return new Timestamp(offset, year, month, day, hour, minute, seconds);
    }

    private static _readUnknownDigits(str: string, pos: number) : string {
        let i: number = pos;
        for (; i < str.length; i++) {
            if (!isDigit(str.charCodeAt(i))) {
                break;
            }
        }
        return str.substring(pos, i);
    }

    private static _readDigits(str: string, pos: number, len: number) : number {
        let v: number = 0;
        for (let i: number = pos; i < pos + len; i++) {
            let c: number = str.charCodeAt(i) - 48;
            if (c < 0 && c > 9) {
                return -1;
            }
            v = (v * 10) + c;
        }
        return v;
    }
}

