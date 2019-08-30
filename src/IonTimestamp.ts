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
    FRACTION = 6,  // TBD remove
}

/**
 * This class provides the additional semantics necessary for timestamp values.
 */
export class Timestamp {
    private static _MIN_SECONDS = 0;
    private static _MAX_SECONDS = 59;
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
     * @param precision
     * @param offset
     * @param year
     * @param month
     * @param day
     * @param hour
     * @param minute
     * @param seconds
     * @param fraction
     */
    constructor(private readonly precision: number,         // TBD remove precision?
                private readonly offset : number,
                private readonly year : number,
                private readonly month : number,
                private readonly day : number,
                private readonly hour : number,
                private readonly minute : number,
                /*private*/ readonly seconds : number,      // TBD combine seconds/fraction into a single param
                /*private*/ readonly fraction : Decimal) {

        this._checkBounds('Offset', Timestamp._MIN_OFFSET, Timestamp._MAX_OFFSET, this.offset);

        switch (this.precision) {
            case Precision.FRACTION:
                if (this.fraction === undefined || this.fraction === null) {
                    throw new Error("Expected fractional second as input based off of the provided precision.");
                }
                if (this.fraction.compareTo(Decimal.ONE) >= 0 && this.fraction.compareTo(Decimal.ZERO) < 0) {
                    throw new Error("Timestamp fractional seconds must a Decimal between 0.0 and less than 1.0")
                }
            case Precision.SECONDS:
                if (this.seconds === undefined || this.seconds === null) {
                    throw new Error("Seconds and precision in illegal state.");
                }
                this._checkBounds('Seconds', Timestamp._MIN_SECONDS, Timestamp._MAX_SECONDS, this.seconds);
            case Precision.HOUR_AND_MINUTE:
                this._checkBounds('Minute', Timestamp._MIN_MINUTE, Timestamp._MAX_MINUTE, this.minute);
                this._checkBounds('Hour', Timestamp._MIN_HOUR, Timestamp._MAX_HOUR, this.hour);
            case Precision.DAY:
                this._checkBounds('Day', Timestamp._MIN_DAY, Timestamp._MAX_DAY, this.day);
            case Precision.MONTH:
                this._checkBounds('Month', Timestamp._MIN_MONTH, Timestamp._MAX_MONTH, this.month);
            case Precision.YEAR:
                this._checkBounds('Year', Timestamp._MIN_YEAR, Timestamp._MAX_YEAR, this.year);
                break;
            default: throw new Error(`Unknown precision ${this.precision}`);
        }

        if (this.precision > Precision.MONTH) {
            // check the days per month - first the general case, basically index into the next month
            // (which doesnt need +1 because we index from 1 to 12 unlike Date) and look at the day before which is indexed with 0.
            let tempDate : Date = new Date(this.year, this.month, 0);
            tempDate.setUTCFullYear(this.year);
            if (this.day > tempDate.getDate()) {
                throw new Error(`Month ${this.month} has less than ${this.day} days`);
            }

            // now the special case for feb 29th and leap year
            if (this.month === 2 && this.day === 29) {
                if (!this._isLeapYear(this.year)) {
                    throw new Error(`Given February 29th but year ${this.year} is not a leap year`);
                }
            }
        }
    }

    private _checkBounds(fieldName: string, min: number, max: number, value: number) {
        if (value < min || value > max) {
            throw new Error(`${fieldName} ${value} must be between ${min} and ${max}, inclusive`);
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
        return this.offset;
    }

    /**
     * Returns the precision of this Timestamp.
     */
    getPrecision() : Precision {
        return this.precision;
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
        let offsetShift = this.offset*60000;
        let ms = null;
        if (this.precision === Precision.FRACTION) {
            ms = this.fraction.numberValue()
        }

        // TBD fractional seconds are currently truncated after 3 digits;  better to round

        let msSinceEpoch = Date.UTC(
                this.year, (this.precision === Precision.YEAR ? 0 : this.month - 1), this.day,
                this.hour, this.minute, this.seconds, ms);
        if (this.year < 100) {
            // for a year < 100, JavaScript Date's default behavior automatically adds 1900;
            // this block compensates for that
            let date = new Date(msSinceEpoch);
            date.setUTCFullYear(this.year);     // yes, we really do mean some year < 100
            msSinceEpoch = date.getTime();
        }
        return new Date(msSinceEpoch - offsetShift);
    }

    getSeconds() : Decimal {
        throw new Error("not implemented yet");
    }

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
        switch (this.precision) {
            default: throw new Error("invalid value for timestamp precision");
            case Precision.FRACTION:
                let digits = this.fraction._getCoefficient().toString();
                //exp always negative because we are a magnitude.
                let tempExp = this.fraction._getExponent();
                if(digits === '0') tempExp++;
                let zeros = ".";
                while(tempExp < 0) {        // TBD use _lpadZeros()?
                    zeros = zeros + '0';
                    tempExp++;
                }
                strVal = zeros + digits;
            case Precision.SECONDS:
                strVal = this._lpadZeros(this.seconds, 2) + strVal;
                if(strVal.charAt(1)  === '.') strVal = "0" + strVal;
                if(strVal.charAt(strVal.length - 1) === '.') strVal = strVal.slice(0, strVal.length - 1);
            case Precision.HOUR_AND_MINUTE:
                strVal = this._lpadZeros(this.minute, 2) + (strVal ? ":" + strVal : "");
                strVal = this._lpadZeros(this.hour, 2) + (strVal ? ":" + strVal : "");
            case Precision.DAY:
                strVal = this._lpadZeros(this.day, 2) + (strVal ? "T" + strVal : "T");
            case Precision.MONTH:
                strVal = this._lpadZeros(this.month, 2) + (strVal ? "-" + strVal : "");
            case Precision.YEAR:
                if (this.precision === Precision.YEAR) {
                    strVal = this._lpadZeros(this.year, 4) + "T";
                } else if (this.precision === Precision.MONTH) {
                    strVal = this._lpadZeros(this.year, 4) + "-" + strVal + "T";
                } else {
                    strVal = this._lpadZeros(this.year, 4) + "-" + strVal;
                }
        }

        // hours : minute (for offset)
        let o: number = this.offset;
        if (this.precision > Precision.DAY || o === undefined) {  // TODO: is this right?
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
        public readonly p: Precision,
        public readonly len: number,
        public readonly t: _TransitionMap
    ) {}
}

class _TimestampParser {
    private static _timeParserStates: _StateMap = (() => {
        let stateMap = {};
        stateMap[_States.YEAR] = new _TimeParserState(_States.YEAR, Precision.YEAR, 4, {"T": _States.OFFSET, "-": _States.MONTH});
        stateMap[_States.MONTH] = new _TimeParserState(_States.MONTH, Precision.MONTH, 2, {"T": _States.OFFSET, "-": _States.DAY});
        stateMap[_States.DAY] = new _TimeParserState(_States.DAY, Precision.DAY, 2, {"T": _States.HOUR});
        stateMap[_States.HOUR] = new _TimeParserState(_States.HOUR, undefined, 2, {":": _States.MINUTE});
        stateMap[_States.MINUTE] = new _TimeParserState(_States.MINUTE, Precision.HOUR_AND_MINUTE, 2, {":": _States.SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.SECONDS] = new _TimeParserState(_States.SECONDS, Precision.SECONDS, 2, {".": _States.FRACTIONAL_SECONDS, "+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.FRACTIONAL_SECONDS] = new _TimeParserState(_States.FRACTIONAL_SECONDS, Precision.FRACTION, undefined, {"+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.OFFSET] = new _TimeParserState(_States.OFFSET, undefined, 0, {"+": _States.OFFSET_POSITIVE, "-": _States.OFFSET_NEGATIVE, "Z": _States.OFFSET_ZULU});
        stateMap[_States.OFFSET_POSITIVE] = new _TimeParserState(_States.OFFSET_POSITIVE, undefined, 2, {":": _States.OFFSET_MINUTES});
        stateMap[_States.OFFSET_NEGATIVE] = new _TimeParserState(_States.OFFSET_NEGATIVE, undefined, 2, {":": _States.OFFSET_MINUTES});
        stateMap[_States.OFFSET_MINUTES] = new _TimeParserState(_States.OFFSET_MINUTES, undefined, 2, undefined);
        stateMap[_States.OFFSET_ZULU] = new _TimeParserState(_States.OFFSET_ZULU, undefined, 0, undefined);
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

        let precision;
        let offset: number = -0.0;
        let year: number = 0;
        let month: number = 1;
        let day: number = 1;
        let hour: number = 0;
        let minute: number = 0;
        let seconds: number = 0;
        let fraction : Decimal = null;

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
                    seconds = v;
                    break;
                case _States.FRACTIONAL_SECONDS:
                    fraction = Decimal.parse(str.substring(19, pos));
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
            if (state.p !== undefined) {
                precision = state.p;
                if (pos >= limit) {
                    break;
                }
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
        return new Timestamp(precision, offset, year, month, day, hour, minute, seconds, fraction);
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

