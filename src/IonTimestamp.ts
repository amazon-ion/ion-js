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

// Ion Value Support class.  This class offers the
//       additional semantics necessary for
//       timestamp values.
//
//    ION._timestamp supports:
//        new ION._timestamp(precision, offset, year, month, day, hour, minute, seconds)
//        new ION._timestamp() - returns a new null timestamp
//        new ION._timestamp(string) - parses the string to construct the timestamp
//        getEpochMilliseconds() 
//        isNull()
//        toString()
//        ION._timestamp.parse(string)
//        ION._timestamp.NULL - constant null value (non-null reference)
//        
//    The parse function returns a newly minted timestamp. If the string is
//    undefined, empty or a null image it returns the timestamp NULL.

import { Decimal } from "./IonDecimal";
import { isNumber } from "./IonUtilities";
import { isString } from "./IonUtilities";
import { isUndefined } from "./IonUtilities";
import { LongInt } from "./IonLongInt";
import { Precision } from "./IonPrecision";

const MIN_SECONDS: number = 0;
const MAX_SECONDS: number = 60;
const MIN_MINUTE: number = 0;
const MAX_MINUTE: number = 59;
const MIN_HOUR: number = 0;
const MAX_HOUR: number = 23;
const MIN_DAY: number = 1;
const MAX_DAY: number = 31;
const MIN_MONTH: number = 1;
const MAX_MONTH: number = 12;
const MIN_YEAR: number = 0;
const MAX_YEAR: number = 9999;
const MIN_OFFSET: number = -14*60; // minutes in timezone offset - see W3C timezone definition
const MAX_OFFSET: number = 14*60;
const DAYS_PER_MONTH: number[] = [
  -1,          // months start at 1, so we fill the 0 slot
  31, 29, 31,  // jan, feb, mar
  30, 31, 30,  // apr, may, june
  31, 31, 30,  // jul, aug, sep
  31, 30, 31,  // oct, nov, dec
]

enum States {
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

interface TransitionMap {
  [index: string]: States;
}

class TimeParserState {
  constructor(
    private _f: States,
    private _p: Precision,
    private _len: number,
    private _t: TransitionMap
  ) {}

  get f() : States {
    return this._f;
  }

  get p() : Precision {
    return this._p;
  }

  get len() : number {
    return this._len;
  }

  get t() : TransitionMap {
    return this._t;
  }
}

interface StateMap {
  [index: number]: TimeParserState;
}

const timeParserStates: StateMap = {};
timeParserStates[States.YEAR] = new TimeParserState(States.YEAR, Precision.YEAR, 4, {
  "T": States.OFFSET,
  "-": States.MONTH});
timeParserStates[States.MONTH] = new TimeParserState(States.MONTH, Precision.MONTH, 2, {
  "T": States.OFFSET,
  "-": States.DAY});
timeParserStates[States.DAY] = new TimeParserState(States.DAY, Precision.DAY, 2, {
  "T": States.HOUR});
timeParserStates[States.HOUR] = new TimeParserState(States.HOUR, undefined, 2, {
  ":": States.MINUTE});
timeParserStates[States.MINUTE] = new TimeParserState(States.MINUTE, Precision.HOUR_AND_MINUTE, 2, {
  ":": States.SECONDS,
  "+": States.OFFSET_POSITIVE,
  "-": States.OFFSET_NEGATIVE,
  "Z": States.OFFSET_ZULU});
timeParserStates[States.SECONDS] = new TimeParserState(States.SECONDS, Precision.SECONDS, 2, {
  ".": States.FRACTIONAL_SECONDS,
  "+": States.OFFSET_POSITIVE,
  "-": States.OFFSET_NEGATIVE,
  "Z": States.OFFSET_ZULU});
timeParserStates[States.FRACTIONAL_SECONDS] = new TimeParserState(States.FRACTIONAL_SECONDS, Precision.SECONDS, undefined, {
  "+": States.OFFSET_POSITIVE,
  "-": States.OFFSET_NEGATIVE,
  "Z": States.OFFSET_ZULU});
timeParserStates[States.OFFSET] = new TimeParserState(States.OFFSET, undefined, 0, {
  "+": States.OFFSET_POSITIVE,
  "-": States.OFFSET_NEGATIVE,
  "Z": States.OFFSET_ZULU});
timeParserStates[States.OFFSET_POSITIVE] = new TimeParserState(States.OFFSET_POSITIVE, undefined, 2, {
  ":": States.OFFSET_MINUTES});
timeParserStates[States.OFFSET_NEGATIVE] = new TimeParserState(States.OFFSET_NEGATIVE, undefined, 2, {
  ":": States.OFFSET_MINUTES});
timeParserStates[States.OFFSET_MINUTES] = new TimeParserState(States.OFFSET_MINUTES, undefined, 2, undefined);
timeParserStates[States.OFFSET_ZULU] = new TimeParserState(States.OFFSET_ZULU, undefined, 0, undefined);

function _to_2_digits(v: number) : string {
  let s: string = v.toString();
  switch (s.length) {
    case 0:
      return "??";
    case 1:
      return "0"+s;
    case 2:
      return s;
    default:
      return s.substr(s.length - 2, 2);
  }
}

function to_4_digits(v: number) : string {
  let s: string = v.toString();
  switch (s.length) {
    case 0:
      return "??";
    case 1:
      return "000"+s;
    case 2:
      return "00"+s;
    case 3:
      return "0"+s;
    case 4:
      return s;
    default:
      return s.substr(s.length - 4, 4);
  }
}

function read_unknown_digits(str: string, pos: number) : string {
  let i: number = pos;
  for (; i < str.length; i++) {
    if (!isNumber(parseInt(str[i], 10))) {
      break;
    }
  }
  return str.substring(pos, i);
}

function read_digits(str: string, pos: number, len: number) : number {
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

const SECS_PER_MIN    = 60;
const SECS_PER_HOUR   = 60 * 60;
const SECS_PER_DAY    = 24 * 60 * 60;
const DAYS_TO_MONTH   = (function() {
  let d: number = 0;
  let a: number[] = [];
  for (let m: number = 1; m < 13; m++) {
    a.shift();
    d += DAYS_PER_MONTH[m];
  }
  return a;
})();

function is_leapyear(year: number) : boolean {
  if ((year % 4) > 0) return false; // not divisible by 4, it's not
  if ((year % 100) > 0) return true; // not divisible by 100, (but div by 4), it IS
  return (year % 1000) === 0; // 100's also divisible by 1000 ARE otherwise they're not
}

function days_to_start_of_month(month: number, year: number) : number {
  var d = DAYS_TO_MONTH[month];
  if (month > 2 && !is_leapyear(year)) d -= 1; // subtract out feb 29th
  return d;
}

function days_to_start_of_year(year: number) : number {
  let d: number = year * 365;
  d += Math.floor(year/4);    // all divisible by 4's are leap years
  d -= Math.floor(year/100);  // all 100's are not - take them out
  d += Math.floor(year/1000); // all 1000' are leap years - put them back in
  return d;
}

const SECONDS_AT_EPOCH_START: number = (function() {
  // unix epoch 1970-01-01T00:00z
  var d = days_to_start_of_year(1970) * SECS_PER_DAY;
  return d;
})();

function bad_timestamp(m: any) : never {
  if (isNumber(m)) {
    m = "invalid format for timestamp at offset " + m;
  }
  throw new Error(m);
}

export class Timestamp {
  private seconds: Decimal;

  constructor(
    private precision: Precision = Precision.NULL,
    private offset: number = 0,
    private year: number = 0,
    private month: number = 0,
    private day: number = 0,
    private hour: number = 0,
    private minute: number = 0,
    seconds: number | string | Decimal = 0
  ) {
    if (isNumber(seconds) && Math.floor(seconds) === seconds) {
      // we allow whole number seconds to be specified as a number
      // in which case we convert it to a decimal value
      this.seconds = new Decimal(LongInt.fromNumber(seconds), 0);
    } else if (isString(seconds)) {
      this.seconds = Decimal.parse(seconds);
    } else {
      this.seconds = <Decimal>seconds;
    }

    this.checkValid();
  }

  private checkValid() : void {
    if (this.precision === Precision.NULL) {
      return;
    }

    if (this.offset < MIN_OFFSET || this.offset > MAX_OFFSET) {
      throw new Error(`Offset ${this.offset} must be between ${MIN_OFFSET} and ${MAX_OFFSET} inclusive`);
    }

    switch (this.precision) {
      default:
        throw new Error(`Unknown precision ${this.precision}`);
      case Precision.SECONDS:
        let seconds: number = this.seconds.numberValue();
        if (seconds < MIN_SECONDS || seconds >= MAX_SECONDS) {
          throw new Error(`Seconds ${seconds} must be between ${MIN_SECONDS} inclusive and ${MAX_SECONDS} exclusive`);
        }
      case Precision.HOUR_AND_MINUTE:
        if (this.minute < MIN_MINUTE || this.minute > MAX_MINUTE) {
          throw new Error(`Minute ${this.minute} must be between ${MIN_MINUTE} and ${MAX_MINUTE} inclusive`);
        }
        if (this.hour < MIN_HOUR || this.hour > MAX_HOUR) {
          throw new Error(`Hour ${this.hour} must be between ${MIN_HOUR} and ${MAX_HOUR} inclusive`);
        }
      case Precision.DAY:
        if (this.day < MIN_DAY || this.day > MAX_DAY) {
          throw new Error(`Day ${this.day} must be between ${MIN_DAY} and ${MAX_DAY} inclusive`);
        }
      case Precision.MONTH:
        if (this.month < MIN_MONTH || this.month > MAX_MONTH) {
          throw new Error(`Month ${this.month} must be between ${MIN_MONTH} and ${MAX_MONTH} inclusive`);
        }
      case Precision.YEAR:
        if (this.year < MIN_YEAR || this.year > MAX_YEAR) {
          throw new Error(`Year ${this.year} must be between ${MIN_YEAR} and ${MAX_YEAR} inclusive`);
        }
    }

    if (this.precision > Precision.MONTH) {
      // check the days per month - first the general case
      if (this.day > DAYS_PER_MONTH[this.month]) {
        throw new Error(`Month ${this.month} has less than ${this.day} days`);
      }

      // now the special case for feb 29th and leap year
      if (this.month === 2 && this.day === 29) {
        if (!is_leapyear(this.year)) {
          throw new Error(`Given February 29th but year ${this.year} is not a leap year`);
        }
      }
    }
  }

  getEpochMilliseconds() : number {
    let n: number = 0;
    switch (this.precision) {
      case Precision.NULL:
        return undefined;
      case Precision.SECONDS:
        n += this.seconds.getNumber(); 
      case Precision.HOUR_AND_MINUTE:
        n += this.minute * SECS_PER_MIN;
        n += this.hour * SECS_PER_HOUR;
      case Precision.DAY:
        n += (this.day - 1) * SECS_PER_DAY;
      case Precision.MONTH:
        n += days_to_start_of_month(this.month, this.year) * SECS_PER_DAY;
      case Precision.YEAR:
        n += days_to_start_of_year(this.year) * SECS_PER_DAY;
    }

    // adjust back the offset to get GMT
    n -= this.offset * 60;
    // back up for the epoch
    n -= SECONDS_AT_EPOCH_START;
    // we did say milliseconds
    n *= 1000;
    return n;
  }

  equals(expected : Timestamp) : boolean {
    return this.getPrecision() === expected.getPrecision() && this.offset === expected.offset && this.instantEquals(expected);
  }
  instantEquals(expected : Timestamp) : boolean {
      switch (this.precision) {
          case Precision.NULL:
              return expected.precision === Precision.NULL;
          case Precision.SECONDS:
              if(!this.seconds.equals(expected.seconds)) return false;
          case Precision.HOUR_AND_MINUTE:
              if(this.minute !== expected.minute || this.hour !== expected.hour) return false;
          case Precision.DAY:
              if(this.day !== expected.day) return false;
          case Precision.MONTH:
              if(this.month !== expected.month) return false;
          case Precision.YEAR:
              if(this.year !== expected.year) return false;
      }
      return true;
  }

  stringValue() : string {
    let image: string;
    let t: Timestamp = this;

    switch (t.precision) {
      default: throw { msg: "invalid value for timestamp precision", where: "IonValueSupport.timestamp.toString" };
      case Precision.NULL:
        return "null.timestamp";
        case Precision.SECONDS:
          //formats decimal to timestamp second, adds a leading 0 and/or cuts off the trailing period
        image = t.seconds.toString();
        if(image.charAt(1)  === '.') image = "0" + image;
        if(image.charAt(image.length - 1) === '.') image = image.slice(0, image.length - 1);
      case Precision.HOUR_AND_MINUTE:
        image = _to_2_digits(t.minute) + (image ? ":" + image : "");
        image = _to_2_digits(t.hour) + (image ? ":" + image : "");
      case Precision.DAY:
        image = _to_2_digits(t.day) + (image ? "T" + image : "");
      case Precision.MONTH:
        image = _to_2_digits(t.month) + (image ? "-" + image : "");
      case Precision.YEAR:
        if (t.precision === Precision.YEAR) {
          image = to_4_digits(t.year) + "T";
        } else if (t.precision === Precision.MONTH) {
          image = to_4_digits(t.year) + "-" + image + "T";
        } else {
          image = to_4_digits(t.year) + "-" + image;
        }
    }

    // hours : minute (for offset)
    let o: number = t.offset;
    if (t.precision > Precision.DAY || isUndefined(o)) {  // TODO: is this right?
      if (isUndefined(o) || (o === -0.0)) {
        image = image + "Z";
      } else {
        if (o < 0) {
          o = -o;
          image = image + "-";
        } else {
          image = image + "+";
        }
        image = image + _to_2_digits(Math.floor(o / 60));
        image = image + ":" + _to_2_digits(o % 60);
      }
    }
    return image;
  }

  numberValue() : number {
    return this.getEpochMilliseconds();
  }

  toString() : string {
    return this.stringValue();
  }

  isNull() : boolean {
    return (this.precision === Precision.NULL);
  }

  getZuluYear() : number {
    return (this.precision >= Precision.YEAR) ? this.year : undefined;
  }

  getZuluMonth() : number {
    return (this.precision >= Precision.MONTH) ? this.month : undefined;
  }

  getZuluDay() : number {
    return (this.precision >= Precision.DAY) ? this.day : undefined;
  }

  getZuluHour() : number {
    return (this.precision >= Precision.HOUR_AND_MINUTE) ? this.hour : undefined;
  }

  getZuluMinute() : number {
    return (this.precision >= Precision.HOUR_AND_MINUTE) ? this.minute : undefined;
  }

  getZuluSeconds() : Decimal {
    return (this.precision >= Precision.SECONDS) ? this.seconds : undefined;
  }

  getOffset() : number {
    return (this.precision > Precision.NULL) ? this.offset : undefined;
  }

  getPrecision() : Precision {
    return this.precision;
  }

  static readonly NULL: Timestamp = new Timestamp(Precision.NULL);

  static parse(str: string) : Timestamp {
    var precision;

    if (str.length < 1) return Timestamp.NULL;
    if (str.charCodeAt(0) === 110) {  // "n"
      if (str === "null") return Timestamp.NULL;
      if (str === "null.timestamp") return Timestamp.NULL;
      bad_timestamp(0);
    }

    let offset: number;
    let year: number;
    let month: number;
    let day: number;
    let hour: number;
    let minute: number;
    let seconds: number | Decimal;

    let pos: number = 0;
    let state: TimeParserState = timeParserStates[States.YEAR];
    let limit: number = str.length;

    let v: number;

    while (pos < limit) {
      if (isUndefined(state.len)) {
        let digits: string = read_unknown_digits(str, pos);
        if (digits.length === 0) {
          bad_timestamp(pos);
        }
        v = parseInt(digits, 10);
        pos += digits.length;
      } else if (state.len > 0) {
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
        // 1234-67-89T12:45:78.dddd
        case States.FRACTIONAL_SECONDS:
          const START_POSITION_OF_SECONDS = 17;

          seconds = Decimal.parse(str.substring(START_POSITION_OF_SECONDS, pos), true);
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
      if (!isUndefined(state.p)) {
        precision = state.p;
        if (pos >= limit) {
          break;
        }
      }
      if (!isUndefined(state.t)) {
        let c: string = String.fromCharCode(str.charCodeAt(pos));
        state = timeParserStates[state.t[c]];
        if (isUndefined(state)) {
          debugger;
          bad_timestamp(pos)
        }
      }
      pos++;
    }
    let t: Timestamp = new Timestamp(precision, offset, year, month, day, hour, minute, seconds);
    return t;
  }
}
