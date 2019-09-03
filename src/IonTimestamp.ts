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

export enum Precision {
    YEAR = 1,
    MONTH = 2,
    DAY = 3,
    HOUR_AND_MINUTE = 4,
    SECONDS = 5,
}

/**
 * This class provides the additional semantics necessary for timestamp values.
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
    private static _MIN_OFFSET = (-23 * 60) - 59;
    private static _MAX_OFFSET = (23 * 60) + 59;

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

    private _precision: Precision;

    /*
    constructor(date: Date, seconds: Decimal) {
        this(null, date.getYear(), date.getMonth() + 1, date.getDay(),
            date.getHours(), date.getMinutes(), date.getSeconds());
    }

    constructor(millis: number | Decimal);  // precision?
    constructor(date: Date, seconds: Decimal);   // precision?
     */

    /**
     *
     * @param offset
     * @param year
     * @param month
     * @param day
     * @param hour
     * @param minute
     * @param seconds
     */
    constructor(private readonly _offset : number,
                private readonly _year : number,
                private readonly _month? : number,
                private readonly _day? : number,
                private readonly _hour? : number,
                private readonly _minute? : number,
                private readonly _secondsDecimal? : Decimal) {

        this._precision = Precision.YEAR;
        this._checkRequiredField('Offset', this._offset, Timestamp._MIN_OFFSET, Timestamp._MAX_OFFSET);
        this._checkRequiredField('Year', this._year, Timestamp._MIN_YEAR, Timestamp._MAX_YEAR);
        this._month = this._checkOptionalField('Month', this._month, Timestamp._MIN_MONTH, Timestamp._MAX_MONTH, 0, Precision.MONTH);
        this._day = this._checkOptionalField('Day', this._day, Timestamp._MIN_DAY, Timestamp._MAX_DAY, 1, Precision.DAY);
        this._hour = this._checkOptionalField('Hour', this._hour, Timestamp._MIN_HOUR, Timestamp._MAX_HOUR, 0, Precision.HOUR_AND_MINUTE);
        this._minute = this._checkOptionalField('Minute', this._minute, Timestamp._MIN_MINUTE, Timestamp._MAX_MINUTE, 0, Precision.HOUR_AND_MINUTE);
        if (this._secondsDecimal === null || this._secondsDecimal === undefined) {
            this._secondsDecimal = Decimal.ZERO;
        } else {
            this._checkFieldRange('Seconds', this._secondsDecimal, Timestamp._MIN_SECONDS, Timestamp._MAX_SECONDS);
            this._precision = Precision.SECONDS;
        }

        if (this._precision > Precision.MONTH) {
            // check the days per month - first the general case, basically index into the next month
            // (which doesnt need +1 because we index from 1 to 12 unlike Date) and look at the day before which is indexed with 0.
            let tempDate : Date = new Date(this._year, this._month, 0);
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
    }

    private _checkRequiredField(fieldName: string, value: number, min: number, max: number) {
        if (value === null || value === undefined) {
            throw new Error(`${fieldName} cannot be ${value}`);
        }
        this._checkFieldRange(fieldName, value, min, max);
    }

    private _checkOptionalField(fieldName: string, value: number,
                                min: number, max: number, defaultValue: number,
                                precision: Precision) : number {
        if (value === null || value === undefined) {
            return defaultValue;
        }
        this._checkFieldRange(fieldName, value, min, max);
        this._precision = precision;
        return value;
    }

    private _checkFieldRange(fieldName: string, value: number | Decimal, min: number | Decimal, max: number | Decimal) {
        if (value instanceof Decimal) {
            if (value !== undefined && value !== null
                    && (value.compareTo(min as Decimal) < 0
                     || value.compareTo(max as Decimal) >= 0)) {
                throw new Error(`${fieldName} ${value} must be between ${min} inclusive, and ${max} exclusive`);
            }
        } else {
            if (value < min || value > max) {
                throw new Error(`${fieldName} ${value} must be between ${min} and ${max} inclusive`);
            }
        }
    }

    private _isLeapYear(year: number) : boolean {
        if (year % 4 > 0) {
            return false;
        } // not divisible by 4, it's not
        if (year % 100 > 0) {
            return true;
        } // not divisible by 100, (but div by 4), it IS
        return year % 1000 === 0; // 100's also divisible by 1000 ARE otherwise they're not
    }

    /**
     * Returns this Timestamp's local offset from UTC, in minutes.
     */
    getLocalOffset() : number {
        return this._offset;
    }

    /**
     * Returns the precision of this Timestamp.
     */
    getPrecision() : Precision {
        return this._precision;
    }

    /**
     * Returns a Date representing the value of this Timestamp.  Note that a Date cannot fully
     * represent all Timestamp values.  Specifically:
     * - fractional seconds of a Timestamp beyond millisecond precision are rounded
     *   to the nearest millisecond in the returned Date
     * - if the precision of this Timestamp is YEAR or MONTH, the returned Date's month and day
     *   are set to January 1
     */
    getDate() : Date {
        let offsetShift = this._offset*60000;
        let ms = null;
        if (this._precision === Precision.SECONDS) {
            ms = this._secondsDecimal.numberValue() - this.getSeconds();
        }

        // TBD fractional seconds are currently truncated after 3 digits;  better to round

        let msSinceEpoch = Date.UTC(
                this._year, (this._precision === Precision.YEAR ? 0 : this._month - 1), this._day,
                this._hour, this._minute, this.getSeconds(), ms);
        if (this._year < 100) {
            // for a year < 100, JavaScript Date's default behavior automatically adds 1900;
            // this block compensates for that
            let date = new Date(msSinceEpoch);
            date.setUTCFullYear(this._year);     // yes, we really do mean some year < 100
            msSinceEpoch = date.getTime();
        }
        return new Date(msSinceEpoch - offsetShift);
    }

    getSeconds() : number {
        return this._secondsDecimal.intValue();
    }

    getSecondsDecimal() : Decimal {
        return this._secondsDecimal;
    }

    /*
    getFractionalSeconds() : Decimal {
        return this._secondsDecimal;
    }
     */

    /**
     * Compares this Timestamp with another and returns true if they
     * represent the same instant and have the same precision.
     * Note that this differs from compareTo(), which doesn't require
     * precision to match when returning 0.
     */
    equals(that : Timestamp) : boolean {
        return this.getPrecision() === that.getPrecision()
            && this.compareTo(that) === 0;
    }

    /**
     * Compares this Timestamp with anoter and returns -1, 0, or 1 if the
     * instant represented by this Timestamp occurs before, at the same time,
     * or after the other Timestamp.
     *
     * Note that a return value of 0 doesn't guarantee that equals() would
     * return true, as compareTo() doesn't require the values to have the
     * same precision to be considered equal, whereas equals() does.
     */
    compareTo(that : Timestamp) : number {
        let thisMs = this.getDate().getMilliseconds();
        let thatMs = that.getDate().getMilliseconds();
        if (thisMs === thatMs) {
            return 0;
        }
        return thisMs < thatMs ? -1 : 1;
    }

    /**
     * Returns a string representation of this Timestamp.
     */
    toString() : string {
        let strVal: string = "";
        switch (this._precision) {
            default: throw new Error("invalid value for timestamp precision");
            /*
            case Precision.FRACTION:
                let digits = this._secondsDecimal._getCoefficient().toString();
                //exp always negative because we are a magnitude.
                let tempExp = this._secondsDecimal._getExponent();
                if(digits === '0') tempExp++;
                let zeros = ".";
                while(tempExp < 0) {        // TBD use _lpadZeros()?
                    zeros = zeros + '0';
                    tempExp++;
                }
                strVal = zeros + digits;
             */
            case Precision.SECONDS:
                strVal = this._lpadZeros(this.getSeconds(), 2) + strVal;
                if(strVal.charAt(1)  === '.') strVal = "0" + strVal;
                if(strVal.charAt(strVal.length - 1) === '.') strVal = strVal.slice(0, strVal.length - 1);
            case Precision.HOUR_AND_MINUTE:
                strVal = this._lpadZeros(this._minute, 2) + (strVal ? ":" + strVal : "");
                strVal = this._lpadZeros(this._hour, 2) + (strVal ? ":" + strVal : "");
            case Precision.DAY:
                strVal = this._lpadZeros(this._day, 2) + (strVal ? "T" + strVal : "T");
            case Precision.MONTH:
                strVal = this._lpadZeros(this._month, 2) + (strVal ? "-" + strVal : "");
            case Precision.YEAR:
                if (this._precision === Precision.YEAR) {
                    strVal = this._lpadZeros(this._year, 4) + "T";
                } else if (this._precision === Precision.MONTH) {
                    strVal = this._lpadZeros(this._year, 4) + "-" + strVal + "T";
                } else {
                    strVal = this._lpadZeros(this._year, 4) + "-" + strVal;
                }
        }

        // hours : minute (for offset)
        let o: number = this._offset;
        if (this._precision > Precision.DAY || o === undefined) {  // TODO: is this right?
            if (o === undefined || o === -0.0) {
                strVal = strVal + "Z";
            } else {
                if (o < 0) {
                    o = -o;
                    strVal = strVal + "-";
                } else {
                    strVal = strVal + "+";
                }
                strVal = strVal + this._lpadZeros(Math.floor(o / 60), 2);
                strVal = strVal + ":" + this._lpadZeros(o % 60, 2);
            }
        }
        return strVal;
    }

    private _lpadZeros(v: number, size: number) : string {
        let s = v.toString();
        if (s.length <= size) {
            return '0'.repeat(size - s.length) + s;
        }
        return s.substr(s.length - size, size);    // TBD perhaps this should this throw?
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
    OFFSET,
    OFFSET_POSITIVE,
    OFFSET_NEGATIVE,
    OFFSET_MINUTES,
    OFFSET_ZULU
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
    private static _timeParserStates: _StateMap = (() => {
        let stateMap = {};
        stateMap[_States.YEAR] = new _TimeParserState(_States.YEAR, 4, {"T": _States.OFFSET, "-": _States.MONTH});
        stateMap[_States.MONTH] = new _TimeParserState(_States.MONTH, 2, {"T": _States.OFFSET, "-": _States.DAY});
        stateMap[_States.DAY] = new _TimeParserState(_States.DAY, 2, {"T": _States.HOUR});
        stateMap[_States.HOUR] = new _TimeParserState(_States.HOUR, 2, {":": _States.MINUTE});
        stateMap[_States.MINUTE] = new _TimeParserState(_States.MINUTE, 2, {":": _States.SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.SECONDS] = new _TimeParserState(_States.SECONDS, 2, {".": _States.FRACTIONAL_SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.FRACTIONAL_SECONDS] = new _TimeParserState(_States.FRACTIONAL_SECONDS, undefined, {"+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.OFFSET] = new _TimeParserState(_States.OFFSET, 0, {"+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.OFFSET_POSITIVE] = new _TimeParserState(_States.OFFSET_POSITIVE, 2, {":": _States.OFFSET_MINUTES});
        stateMap[_States.OFFSET_NEGATIVE] = new _TimeParserState(_States.OFFSET_NEGATIVE, 2, {":": _States.OFFSET_MINUTES});
        stateMap[_States.OFFSET_MINUTES] = new _TimeParserState(_States.OFFSET_MINUTES, 2, undefined);
        stateMap[_States.OFFSET_ZULU] = new _TimeParserState(_States.OFFSET_ZULU, 0, undefined);
        return stateMap;
    })();

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

        let offset: number = -0.0;
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
                case _States.OFFSET:
                    break;
                case _States.OFFSET_POSITIVE:
                    offset = v * 60;
                    break;
                case _States.OFFSET_NEGATIVE:
                    offset = -v * 60;
                    break;
                case _States.OFFSET_MINUTES:
                    offset += (offset < -0) ? -v : v;
                    if(v >= 60) throw new Error("Minute offset " + String(v) + " above maximum or equal to : 60");
                    break;
                case _States.OFFSET_ZULU:
                    offset = 0.0;
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
                if (state === undefined) throw new Error("State was not set pos:" + pos );
                if (state.f === _States.OFFSET_ZULU) {
                    offset = 0.0;
                }
            }
            pos++;
        }

        let seconds: Decimal;
        if (secondsInt || fractionStr) {
            seconds = Decimal.parse(secondsInt + '.' + fractionStr);
        }
        return new Timestamp(offset, year, month, day, hour, minute, seconds);
    }

    private static _readUnknownDigits(str: string, pos: number) : string {//TODO this seems incorrect
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

