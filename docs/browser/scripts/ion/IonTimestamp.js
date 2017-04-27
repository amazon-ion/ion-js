define(["require", "exports", "./IonDecimal", "./IonUtilities", "./IonUtilities", "./IonUtilities", "./IonLongInt", "./IonPrecision"], function (require, exports, IonDecimal_1, IonUtilities_1, IonUtilities_2, IonUtilities_3, IonLongInt_1, IonPrecision_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const MIN_SECONDS = 0;
    const MAX_SECONDS = 60;
    const MIN_MINUTE = 0;
    const MAX_MINUTE = 59;
    const MIN_HOUR = 1;
    const MAX_HOUR = 23;
    const MIN_DAY = 1;
    const MAX_DAY = 31;
    const MIN_MONTH = 1;
    const MAX_MONTH = 12;
    const MIN_YEAR = 0;
    const MAX_YEAR = 9999;
    const MIN_OFFSET = -14 * 60;
    const MAX_OFFSET = 14 * 60;
    const DAYS_PER_MONTH = [
        -1,
        31, 29, 31,
        30, 31, 30,
        31, 31, 30,
        31, 30, 31,
    ];
    var States;
    (function (States) {
        States[States["YEAR"] = 0] = "YEAR";
        States[States["MONTH"] = 1] = "MONTH";
        States[States["DAY"] = 2] = "DAY";
        States[States["HOUR"] = 3] = "HOUR";
        States[States["MINUTE"] = 4] = "MINUTE";
        States[States["SECONDS"] = 5] = "SECONDS";
        States[States["FRACTIONAL_SECONDS"] = 6] = "FRACTIONAL_SECONDS";
        States[States["OFFSET"] = 7] = "OFFSET";
        States[States["OFFSET_POSITIVE"] = 8] = "OFFSET_POSITIVE";
        States[States["OFFSET_NEGATIVE"] = 9] = "OFFSET_NEGATIVE";
        States[States["OFFSET_MINUTES"] = 10] = "OFFSET_MINUTES";
        States[States["OFFSET_ZULU"] = 11] = "OFFSET_ZULU";
    })(States || (States = {}));
    class TimeParserState {
        constructor(_f, _p, _len, _t) {
            this._f = _f;
            this._p = _p;
            this._len = _len;
            this._t = _t;
        }
        get f() {
            return this._f;
        }
        get p() {
            return this._p;
        }
        get len() {
            return this._len;
        }
        get t() {
            return this._t;
        }
    }
    const timeParserStates = {};
    timeParserStates[States.YEAR] = new TimeParserState(States.YEAR, IonPrecision_1.Precision.YEAR, 4, {
        "T": States.OFFSET,
        "-": States.MONTH
    });
    timeParserStates[States.MONTH] = new TimeParserState(States.MONTH, IonPrecision_1.Precision.MONTH, 2, {
        "T": States.OFFSET,
        "-": States.DAY
    });
    timeParserStates[States.DAY] = new TimeParserState(States.DAY, IonPrecision_1.Precision.DAY, 2, {
        "T": States.HOUR
    });
    timeParserStates[States.HOUR] = new TimeParserState(States.HOUR, undefined, 2, {
        ":": States.MINUTE
    });
    timeParserStates[States.MINUTE] = new TimeParserState(States.MINUTE, IonPrecision_1.Precision.HOUR_AND_MINUTE, 2, {
        ":": States.SECONDS,
        "+": States.OFFSET_POSITIVE,
        "-": States.OFFSET_NEGATIVE,
        "Z": States.OFFSET_ZULU
    });
    timeParserStates[States.SECONDS] = new TimeParserState(States.SECONDS, IonPrecision_1.Precision.SECONDS, 2, {
        ".": States.FRACTIONAL_SECONDS,
        "+": States.OFFSET_POSITIVE,
        "-": States.OFFSET_NEGATIVE,
        "Z": States.OFFSET_ZULU
    });
    timeParserStates[States.FRACTIONAL_SECONDS] = new TimeParserState(States.FRACTIONAL_SECONDS, IonPrecision_1.Precision.SECONDS, undefined, {
        "+": States.OFFSET_POSITIVE,
        "-": States.OFFSET_NEGATIVE,
        "Z": States.OFFSET_ZULU
    });
    timeParserStates[States.OFFSET] = new TimeParserState(States.OFFSET, undefined, 0, {
        "+": States.OFFSET_POSITIVE,
        "-": States.OFFSET_NEGATIVE,
        "Z": States.OFFSET_ZULU
    });
    timeParserStates[States.OFFSET_POSITIVE] = new TimeParserState(States.OFFSET_POSITIVE, undefined, 2, {
        ":": States.OFFSET_MINUTES
    });
    timeParserStates[States.OFFSET_NEGATIVE] = new TimeParserState(States.OFFSET_NEGATIVE, undefined, 2, {
        ":": States.OFFSET_MINUTES
    });
    timeParserStates[States.OFFSET_MINUTES] = new TimeParserState(States.OFFSET_MINUTES, undefined, 2, undefined);
    timeParserStates[States.OFFSET_ZULU] = new TimeParserState(States.OFFSET_ZULU, undefined, 0, undefined);
    function _to_2_digits(v) {
        let s = v.toString();
        switch (s.length) {
            case 0:
                return "??";
            case 1:
                return "0" + s;
            case 2:
                return s;
            default:
                return s.substr(s.length - 2, 2);
        }
    }
    function to_4_digits(v) {
        let s = v.toString();
        switch (s.length) {
            case 0:
                return "??";
            case 1:
                return "000" + s;
            case 2:
                return "00" + s;
            case 3:
                return "0" + s;
            case 4:
                return s;
            default:
                return s.substr(s.length - 4, 4);
        }
    }
    function read_unknown_digits(str, pos) {
        let i = pos;
        for (; i < str.length; i++) {
            if (!IonUtilities_1.isNumber(str.charCodeAt(i))) {
                break;
            }
        }
        return str.substring(pos, i);
    }
    function read_digits(str, pos, len) {
        let v = 0;
        for (let i = pos; i < pos + len; i++) {
            let c = str.charCodeAt(i) - 48;
            if (c < 0 && c > 9) {
                return -1;
            }
            v = (v * 10) + c;
        }
        return v;
    }
    const SECS_PER_MIN = 60;
    const SECS_PER_HOUR = 60 * 60;
    const SECS_PER_DAY = 24 * 60 * 60;
    const DAYS_TO_MONTH = (function () {
        let d = 0;
        let a = [];
        for (let m = 1; m < 13; m++) {
            a.shift();
            d += DAYS_PER_MONTH[m];
        }
        return a;
    })();
    function is_leapyear(year) {
        if ((year % 4) > 0)
            return false;
        if ((year % 100) > 0)
            return true;
        return (year % 1000) === 0;
    }
    function days_to_start_of_month(month, year) {
        var d = DAYS_TO_MONTH[month];
        if (month > 2 && !is_leapyear(year))
            d -= 1;
        return d;
    }
    function days_to_start_of_year(year) {
        let d = year * 365;
        d += Math.floor(year / 4);
        d -= Math.floor(year / 100);
        d += Math.floor(year / 1000);
        return d;
    }
    const SECONDS_AT_EPOCH_START = (function () {
        var d = days_to_start_of_year(1970) * SECS_PER_DAY;
        return d;
    })();
    function bad_timestamp(m) {
        if (IonUtilities_1.isNumber(m)) {
            m = "invalid format for timestamp at offset " + m;
        }
        throw new Error(m);
    }
    class Timestamp {
        constructor(precision = IonPrecision_1.Precision.NULL, offset = 0, year = 0, month = 0, day = 0, hour = 0, minute = 0, seconds = 0) {
            this.precision = precision;
            this.offset = offset;
            this.year = year;
            this.month = month;
            this.day = day;
            this.hour = hour;
            this.minute = minute;
            if (IonUtilities_1.isNumber(seconds) && Math.floor(seconds) === seconds) {
                this.seconds = new IonDecimal_1.Decimal(IonLongInt_1.LongInt.fromNumber(seconds), 0);
            }
            else if (IonUtilities_2.isString(seconds)) {
                this.seconds = IonDecimal_1.Decimal.parse(seconds);
            }
            else {
                this.seconds = seconds;
            }
            this.checkValid();
        }
        checkValid() {
            if (this.precision === IonPrecision_1.Precision.NULL) {
                return;
            }
            if (this.offset < MIN_OFFSET || this.offset > MAX_OFFSET) {
                throw new Error(`Offset ${this.offset} must be between ${MIN_OFFSET} and ${MAX_OFFSET} inclusive`);
            }
            switch (this.precision) {
                default:
                    throw new Error(`Unknown precision ${this.precision}`);
                case IonPrecision_1.Precision.SECONDS:
                    let seconds = this.seconds.numberValue();
                    if (seconds < MIN_SECONDS || seconds >= MAX_SECONDS) {
                        throw new Error(`Seconds ${seconds} must be between ${MIN_SECONDS} inclusive and ${MAX_SECONDS} exclusive`);
                    }
                case IonPrecision_1.Precision.HOUR_AND_MINUTE:
                    if (this.minute < MIN_MINUTE || this.minute > MAX_MINUTE) {
                        throw new Error(`Minute ${this.minute} must be between ${MIN_MINUTE} and ${MAX_MINUTE} inclusive`);
                    }
                    if (this.hour < MIN_HOUR || this.hour > MAX_HOUR) {
                        throw new Error(`Hour ${this.hour} must be between ${MIN_HOUR} and ${MAX_HOUR} inclusive`);
                    }
                case IonPrecision_1.Precision.DAY:
                    if (this.day < MIN_DAY || this.day > MAX_DAY) {
                        throw new Error(`Day ${this.day} must be between ${MIN_DAY} and ${MAX_DAY} inclusive`);
                    }
                case IonPrecision_1.Precision.MONTH:
                    if (this.month < MIN_MONTH || this.month > MAX_MONTH) {
                        throw new Error(`Month ${this.month} must be between ${MIN_MONTH} and ${MAX_MONTH} inclusive`);
                    }
                case IonPrecision_1.Precision.YEAR:
                    if (this.year < MIN_YEAR || this.year > MAX_YEAR) {
                        throw new Error(`Year ${this.year} must be between ${MIN_YEAR} and ${MAX_YEAR} inclusive`);
                    }
            }
            if (this.precision > IonPrecision_1.Precision.MONTH) {
                if (this.day > DAYS_PER_MONTH[this.month]) {
                    throw new Error(`Month ${this.month} has less than ${this.day} days`);
                }
                if (this.month === 2 && this.day === 29) {
                    if (!is_leapyear(this.year)) {
                        throw new Error(`Given February 29th but year ${this.year} is not a leap year`);
                    }
                }
            }
        }
        getEpochMilliseconds() {
            let n = 0;
            switch (this.precision) {
                case IonPrecision_1.Precision.NULL:
                    return undefined;
                case IonPrecision_1.Precision.SECONDS:
                    n += this.seconds.getNumber();
                case IonPrecision_1.Precision.HOUR_AND_MINUTE:
                    n += this.minute * SECS_PER_MIN;
                    n += this.hour * SECS_PER_HOUR;
                case IonPrecision_1.Precision.DAY:
                    n += (this.day - 1) * SECS_PER_DAY;
                case IonPrecision_1.Precision.MONTH:
                    n += days_to_start_of_month(this.month, this.year) * SECS_PER_DAY;
                case IonPrecision_1.Precision.YEAR:
                    n += days_to_start_of_year(this.year) * SECS_PER_DAY;
            }
            n -= this.offset * 60;
            n -= SECONDS_AT_EPOCH_START;
            n *= 1000;
            return n;
        }
        stringValue() {
            let image;
            let t = this;
            switch (t.precision) {
                default: throw { msg: "invalid value for timestamp precision", where: "IonValueSupport.timestamp.toString" };
                case IonPrecision_1.Precision.NULL:
                    return "null.timestamp";
                case IonPrecision_1.Precision.SECONDS:
                    image = t.seconds.toString();
                case IonPrecision_1.Precision.HOUR_AND_MINUTE:
                    image = _to_2_digits(t.minute) + (image ? ":" + image : "");
                    image = _to_2_digits(t.hour) + (image ? ":" + image : "");
                case IonPrecision_1.Precision.DAY:
                    image = _to_2_digits(t.day) + (image ? "T" + image : "");
                case IonPrecision_1.Precision.MONTH:
                    image = _to_2_digits(t.month) + (image ? "-" + image : "");
                case IonPrecision_1.Precision.YEAR:
                    if (t.precision === IonPrecision_1.Precision.YEAR) {
                        image = to_4_digits(t.year) + "T";
                    }
                    else if (t.precision === IonPrecision_1.Precision.MONTH) {
                        image = to_4_digits(t.year) + "-" + image + "T";
                    }
                    else {
                        image = to_4_digits(t.year) + "-" + image;
                    }
            }
            let o = t.offset;
            if (t.precision > IonPrecision_1.Precision.DAY || IonUtilities_3.isUndefined(o)) {
                if (IonUtilities_3.isUndefined(o) || (o === -0.0)) {
                    image = image + "Z";
                }
                else {
                    if (o < 0) {
                        o = -o;
                        image = image + "-";
                    }
                    else {
                        image = image + "+";
                    }
                    image = image + _to_2_digits(Math.floor(o / 60));
                    image = image + ":" + _to_2_digits(o % 60);
                }
            }
            return image;
        }
        numberValue() {
            return this.getEpochMilliseconds();
        }
        toString() {
            return this.stringValue();
        }
        isNull() {
            return (this.precision === IonPrecision_1.Precision.NULL);
        }
        getZuluYear() {
            return (this.precision >= IonPrecision_1.Precision.YEAR) ? this.year : undefined;
        }
        getZuluMonth() {
            return (this.precision >= IonPrecision_1.Precision.MONTH) ? this.month : undefined;
        }
        getZuluDay() {
            return (this.precision >= IonPrecision_1.Precision.DAY) ? this.day : undefined;
        }
        getZuluHour() {
            return (this.precision >= IonPrecision_1.Precision.HOUR_AND_MINUTE) ? this.hour : undefined;
        }
        getZuluMinute() {
            return (this.precision >= IonPrecision_1.Precision.HOUR_AND_MINUTE) ? this.minute : undefined;
        }
        getZuluSeconds() {
            return (this.precision >= IonPrecision_1.Precision.SECONDS) ? this.seconds : undefined;
        }
        getOffset() {
            return (this.precision > IonPrecision_1.Precision.NULL) ? this.offset : undefined;
        }
        getPrecision() {
            return this.precision;
        }
        static parse(str) {
            var precision;
            if (str.length < 1)
                return Timestamp.NULL;
            if (str.charCodeAt(0) === 110) {
                if (str === "null")
                    return Timestamp.NULL;
                if (str === "null.timestamp")
                    return Timestamp.NULL;
                bad_timestamp(0);
            }
            let offset;
            let year;
            let month;
            let day;
            let hour;
            let minute;
            let seconds;
            let pos = 0;
            let state = timeParserStates[States.YEAR];
            let limit = str.length;
            let v;
            while (pos < limit) {
                if (IonUtilities_3.isUndefined(state.len)) {
                    let digits = read_unknown_digits(str, pos);
                    if (digits.length === 0) {
                        bad_timestamp(pos);
                    }
                    v = parseInt(digits, 10);
                    pos += digits.length;
                }
                else if (state.len > 0) {
                    v = read_digits(str, pos, state.len);
                    if (v < 0) {
                        bad_timestamp(pos);
                    }
                    pos = pos + state.len;
                }
                switch (state.f) {
                    case States.YEAR:
                        year = v;
                        break;
                    case States.MONTH:
                        month = v;
                        break;
                    case States.DAY:
                        day = v;
                        break;
                    case States.HOUR:
                        hour = v;
                        break;
                    case States.MINUTE:
                        minute = v;
                        break;
                    case States.SECONDS:
                        seconds = v;
                        break;
                    case States.FRACTIONAL_SECONDS:
                        seconds = IonDecimal_1.Decimal.parse(str.substr(17, pos - 17));
                        break;
                    case States.OFFSET:
                        break;
                    case States.OFFSET_POSITIVE:
                        offset = v * 60;
                        break;
                    case States.OFFSET_NEGATIVE:
                        offset = -v * 60;
                        break;
                    case States.OFFSET_MINUTES:
                        offset += (offset < -0) ? -v : v;
                        break;
                    case States.OFFSET_ZULU:
                        offset = -0.0;
                        break;
                    default:
                        bad_timestamp("invalid internal state");
                }
                if (!IonUtilities_3.isUndefined(state.p)) {
                    precision = state.p;
                    if (pos >= limit) {
                        break;
                    }
                }
                if (!IonUtilities_3.isUndefined(state.t)) {
                    let c = String.fromCharCode(str.charCodeAt(pos));
                    state = timeParserStates[state.t[c]];
                    if (IonUtilities_3.isUndefined(state)) {
                        debugger;
                        bad_timestamp(pos);
                    }
                }
                pos++;
            }
            let t = new Timestamp(precision, offset, year, month, day, hour, minute, seconds);
            return t;
        }
    }
    Timestamp.NULL = new Timestamp(IonPrecision_1.Precision.NULL);
    exports.Timestamp = Timestamp;
});
//# sourceMappingURL=IonTimestamp.js.map