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
import { LongInt } from "./IonLongInt";
import { Precision } from "./IonPrecision";

export class Timestamp {
  private static readonly MIN_SECONDS: number = 0;
  private static readonly MAX_SECONDS: number = 60;
  private static readonly MIN_MINUTE: number = 0;
  private static readonly MAX_MINUTE: number = 59;
  private static readonly MIN_HOUR: number = 1;
  private static readonly MAX_HOUR: number = 23;
  private static readonly MIN_DAY: number = 1;
  private static readonly MAX_DAY: number = 31;
  private static readonly MIN_MONTH: number = 1;
  private static readonly MAX_MONTH: number = 12;
  private static readonly MIN_YEAR: number = 0;
  private static readonly MAX_YEAR: number = 9999;
  private static readonly MIN_OFFSET: number = -14*60; // minutes in timezone offset - see W3C timezone definition
  private static readonly MAX_OFFSET: number = 14*60;
  private static readonly DAYS_PER_MONTH: number[] = [
    -1,          // months start at 1, so we fill the 0 slot
    31, 29, 31,  // jan, feb, mar
    30, 31, 30,  // apr, may, june
    31, 31, 30,  // jul, aug, sep
    31, 30, 31,  // oct, nov, dec
  ]

  private static readonly S_year        =  1;
  private static readonly S_month       =  2;
  private static readonly S_day         =  3;
  private static readonly S_hour        =  4;
  private static readonly S_minute      =  5;
  private static readonly S_seconds     =  6;
  private static readonly S_frac_secs   =  7;
  private static readonly S_offset      =  8;
  private static readonly S_offset_p    =  9;
  private static readonly S_offset_m    = 10;
  private static readonly S_offset_mins = 11;
  private static readonly S_zoffset     = 12;

  private _year: number = 0;
  private _month: number = 0;
  private _day: number = 0;
  private _hour: number = 0;
  private _minute: number = 0;
  private _seconds: number | Decimal = 0;
  private _offset: number = 0;
  private _p: Precision = Precision.NULL;

  constructor(precision: Precision = undefined, offset: number = undefined, year: number = undefined,
      month: number = undefined, day: number = undefined, hour: number = undefined, minute: number = undefined,
      seconds: number | Decimal = undefined) {

    if (precision === undefined) {
      // null
      this._p = Precision.NULL;
      return;
    }

    // otherwise the values should be as named
    if (year !== undefined) {
      this._year = year;
    }
    if (month !== undefined) {
      this._month = month;
    }
    if (day !== undefined) {
      this._day = day;
    }
    if (hour !== undefined) {
      this._hour = hour;
    }
    if (minute !== undefined) {
      this._minute = minute;
    }

    if (typeof seconds === "number" && Math.floor(seconds) === seconds) {
      // we allow whole number seconds to be specified as a number
      // in which case we convert it to a decimal value
      this._seconds = new Decimal(LongInt.fromNumber(seconds), 0);
    } else {
      // otherwise we use whatever is passed in and we'll check it in "is_valid"
      this._seconds = seconds;
    }

    this._p = precision;
    this._offset = offset;

    if (!this._is_valid()) {
      this._p = 0;
      throw { msg: "invalid timestamp initialization", where: "IonTimestamp.constructor" };
    }
  }

  private static _to_2_digits(v: number) : string {
      var s;
      s = v.toString();
      switch (s.length) {
        case 0:  return "??";
        case 1:  return "0"+s;
        case 2:  return s;
        default: return s.substr(s.length-2,2);
      }
    }

  private static to_4_digits(v: number) : string {
      var s;
      if (typeof v !== "number") return "??";   // TODO: what do we want to do about this? (including "don't care")
      s = v.toString();
      switch (s.length) {
        case 0:  return "??";
        case 1:  return "000"+s;
        case 2:  return "00"+s;
        case 3:  return "0"+s;
        case 4:  return s;
        default: return s.substr(s.length-4,4);
      }
    }

  private static read_digits(str: string, pos: number, len: number) {
    var ii, c, v = 0;
    for (ii=pos; ii<pos+len; ii++) {
      c = str.charCodeAt(ii) - 48;
      if (c < 0 && c > 9) return -1;
      v = (v * 10) + c;
    }
    return v;
  }

  private static readonly time_parser_states = {
  // state {f: field,         p: precision, len,    t: transitions { char : state, ... } }
    year:  {f: Timestamp.S_year,        p: Precision.YEAR,    len: 4, t: { "T": "off", "-": "month" } },
    month: {f: Timestamp.S_month,       p: Precision.MONTH,   len: 2, t: { "T": "off", "-": "day" } } ,
    day:   {f: Timestamp.S_day,         p: Precision.DAY,     len: 2, t: { "T": "hour" } } ,
    hour:  {f: Timestamp.S_hour,        p: -1,        len: 2, t: { ":": "min" } },
    min:   {f: Timestamp.S_minute,      p: Precision.MINUTE,  len: 2, t: { ":": "secs", "+": "poff", "-": "moff", "Z": "zulu" } },
    secs:  {f: Timestamp.S_seconds,     p: Precision.SECONDS, len: 2, t: { ".": "frac", "+": "pofft", "-": "moff", "Z": "zulu" } },
    frac:  {f: Timestamp.S_frac_secs,   p: Precision.SECONDS, len: 2, t: { "+": "poff", "-": "moff", "Z": "zulu" } },
    off:   {f: Timestamp.S_offset,      p: -1,        len: 0, t: { "+": "poff", "-": "moff", "Z": "zulu" } },
    poff:  {f: Timestamp.S_offset_p,    p: -1,        len: 2, t: { ":": "omins" } },
    moff:  {f: Timestamp.S_offset_m,    p: -1,        len: 2, t: { ":": "omins" } },
    omins: {f: Timestamp.S_offset_mins, p: -1,        len: 2, t: { } },
    zulu:  {f: Timestamp.S_zoffset,     p: -1,        len: 0, t: { } },
  }

  private static readonly SECS_PER_MIN    = 60;
  private static readonly SECS_PER_HOUR   = 60 * 60;
  private static readonly SECS_PER_DAY    = 24 * 60 * 60;
  private static readonly DAYS_TO_MONTH   = (function() {
    let d: number = 0;
    let a: number[] = [];
    for (let m: number = 1; m < 13; m++) {
      a.shift();
      d += Timestamp.DAYS_PER_MONTH[m];
    }
    return a;
  })();

  private static is_leapyear(year: number) : boolean {
    if ((year % 4) > 0) return false; // not divisible by 4, it's not
    if ((year % 100) > 0) return true; // not divisible by 100, (but div by 4), it IS
    return (year % 1000) === 0; // 100's also divisible by 1000 ARE otherwise they're not
  }

  private static days_to_start_of_month(month: number, year: number) : number {
    var d = Timestamp.DAYS_TO_MONTH[month];
    if (month > 2 && !Timestamp.is_leapyear(year)) d -= 1; // subtract out feb 29th
    return d;
  }

  private static days_to_start_of_year(year: number) : number {
    var d = year * 365;
    d += Math.floor(year/4);    // all divisible by 4's are leap years
    d -= Math.floor(year/100);  // all 100's are not - take them out
    d += Math.floor(year/1000); // all 1000' are leap years - put them back in
    return d;
  }

  private static readonly SECONDS_AT_EPOCH_START = (function() {
    // unix epoch 1970-01-01T00:00z
    var d = Timestamp.days_to_start_of_year(1970) * Timestamp.SECS_PER_DAY;
    return d;
  })();

  private static is_decimal(v: any) : boolean {
    if (typeof v === 'object' && typeof v.getExponent === 'function') {
      return true;
    }
    return false;
  }

  private static bad_timestamp(m: any) : never {
    if (typeof m === "number") {
      m = "invalid format for timestamp at offset" + m;
    }
    throw { msg: m, where: "IonValueSupport.timestamp.parse" };
  }

  private _is_valid() : boolean {
    let t = this;
    var s;
    if (t._p === Precision.NULL) return true; // null

    if_false:for(;;) {
      if (typeof t._offset !== "number" || t._offset < Timestamp.MIN_OFFSET || t._offset > Timestamp.MAX_OFFSET) break if_false;
      switch (t._p) {
      default:
        break if_false;

      case Precision.SECONDS:
      case Precision.FRACTIONAL_SECONDS:
        if (typeof t._seconds === 'number') {
          s = t._seconds;
        }
        else if (Timestamp.is_decimal(t._seconds)) {
          s = t._seconds.numberValue();
        }
        else {
          break if_false;
        }
        if (s < Timestamp.MIN_SECONDS || s >= Timestamp.MAX_SECONDS) break if_false;
        if (t._p ===  Precision.SECONDS && s !== Math.floor(s)) break if_false; // precision says no fraction, but there's fraction here
      case Precision.MINUTE:
        if (typeof t._minute !== "number" || t._minute < Timestamp.MIN_MINUTE || t._minute > Timestamp.MAX_MINUTE) break if_false;
      case Precision.HOUR:
        if (typeof t._hour !== "number" || t._hour < Timestamp.MIN_HOUR || t._hour > Timestamp.MAX_HOUR) break if_false;
      case Precision.DAY:
        if (typeof t._day !== "number" || t._day < Timestamp.MIN_DAY || t._day > Timestamp.MAX_DAY) break if_false;
      case Precision.MONTH:
        if (typeof t._month !== "number" || t._month < Timestamp.MIN_MONTH || t._month > Timestamp.MAX_MONTH) break if_false;
      case Precision.YEAR:
        if (typeof t._year !== "number" || t._year < Timestamp.MIN_YEAR || t._year > Timestamp.MAX_YEAR) break if_false;
      }

      if (t._p > Precision.MONTH) {
        // check the days per month - first the general case
        if (t._day > Timestamp.DAYS_PER_MONTH[t._month]) break if_false;

        // now the special case for feb 29th and leap year
        if (t._month === 2 && t._day === 29) {
          if (!Timestamp.is_leapyear(t._year)) break if_false; // not a leap year and they say feb 29th, nope
        }
      }
      return true;
    }
    return false; // we end up here when we "break if_false"
  }

  getEpochMilliseconds() : number {
    var n, p;
    let t: Timestamp = this;
    p = t._p;

    switch(p) {
      case Precision.NULL:
        return undefined;
      case Precision.FRACTIONAL_SECONDS:
        n = (<Decimal>t._seconds).getNumber(); 
        break;
      case Precision.SECONDS:
        n = t._seconds;
        break;
      default:
        n = 0;
        break;
    }
    switch(p) {
      case Precision.FRACTIONAL_SECONDS:
      case Precision.SECONDS:
      case Precision.MINUTE:
        n += t._minute * Timestamp.SECS_PER_MIN;
      case Precision.HOUR:
        n += t._hour * Timestamp.SECS_PER_HOUR;
      case Precision.DAY:
        n += (t._day - 1) * Timestamp.SECS_PER_DAY;
      case Precision.MONTH:
        n += Timestamp.days_to_start_of_month(t._month, t._year) * Timestamp.SECS_PER_DAY;
      case Precision.YEAR:
        n += Timestamp.days_to_start_of_year(t._year) * Timestamp.SECS_PER_DAY;
        break;
    }
    n = n = (t._offset * 60);         // adjust back the offset to get GMT
    n = n - Timestamp.SECONDS_AT_EPOCH_START;   // back up for the epoch
    n = n / 1000;                     // we did say milliseconds
    return n;
  }

  stringValue() : string {
    var o;
    let image: string = undefined;
    let t: Timestamp = this;

    switch(t._p) {
      default: throw { msg: "invalid value for timestamp precision", where: "IonValueSupport.timestamp.toString" };
      case Precision.NULL:
        return "null.timestamp";
      case Precision.SECONDS:
      case Precision.FRACTIONAL_SECONDS:
        image = t._seconds.toString();
      case Precision.MINUTE:
        image = Timestamp._to_2_digits(t._minute) + (image ? ":" + image : "");
      case Precision.HOUR:
        image = Timestamp._to_2_digits(t._hour) + (image ? ":" + image : "");
      case Precision.DAY:
        image = Timestamp._to_2_digits(t._day) + (image ? "T" + image : "");
      case Precision.MONTH:
        image = Timestamp._to_2_digits(t._month) + (image ? "-" + image : "");
      case Precision.YEAR:
        if (t._p === Precision.YEAR) {
          image = Timestamp.to_4_digits(t._year) + "T";
        } else if (t._p === Precision.MONTH) {
          image = Timestamp.to_4_digits(t._year) + "-" + image + "T";
        } else {
          image = Timestamp.to_4_digits(t._year) + "-" + image;
        }
    }

    // hours : minute (for offset)
    o = t._offset;
    if (t._p > Precision.DAY || o === undefined) {  // TODO: is this right?
      if (o === undefined) {
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
        image = image + Timestamp._to_2_digits(Math.floor(o / 60));
        image = image + ":" + Timestamp._to_2_digits(o - Math.floor(o / 60));
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
    return (this._p === Precision.NULL);
  }

  getZuluYear() : number {
    return (this._p >= Precision.YEAR) ? this._year : undefined;
  }

  getZuluMonth() : number {
    return (this._p >= Precision.MONTH) ? this._month : undefined;
  }

  getZuluDay() : number {
    return (this._p >= Precision.DAY) ? this._day : undefined;
  }

  getZuluHour() : number {
    return (this._p >= Precision.HOUR) ? this._hour : undefined;
  }

  getZuluMinute() : number {
    return (this._p >= Precision.MINUTE) ? this._minute : undefined;
  }

  getZuluSeconds() : number {
    return (this._p >= Precision.SECONDS) ? (<number>this._seconds) : undefined;
  }

  getOffset() : number {
    return (this._p > Precision.NULL) ? this._offset : undefined;
  }

  getPrecision() : number {
    return this._p;
  }

  static readonly NULL: Timestamp = new Timestamp(Precision.NULL);

  static parse(str: string) : Timestamp {
    var t, v, c, state, pos, limit, 
        precision, offset, 
        year, month, day, hour, minute, seconds;

    if (str.length < 1) return Timestamp.NULL;
    if (str.charCodeAt(0) === 110) {  // "n"
      if (str === "null") return Timestamp.NULL;
      if (str === "null.timestamp") return Timestamp.NULL;
      Timestamp.bad_timestamp(0);
    }

    pos = 0;
    state = Timestamp.time_parser_states.year;
    limit = str.length;

    while (pos < limit) {
      if (state.len > 0) {
        v = Timestamp.read_digits(str, pos, state.len);
        if (v < 0) Timestamp.bad_timestamp(pos);
        pos = pos + state.len;
      }
      switch(state.f) {
        case Timestamp.S_year:        year = v;                                 break;
        case Timestamp.S_month:       month = v;                                break;
        case Timestamp.S_day:         day = v;                                  break;
        case Timestamp.S_hour:        hour = v;                                 break;
        case Timestamp.S_minute:      minute = v;                               break;
        case Timestamp.S_seconds:     seconds = v;                              break;
                                         // 1234-67-89T12:45:78.dddd
        case Timestamp.S_frac_secs:   seconds = Decimal.parse(str.substr(17, pos - 17)); break;
        case Timestamp.S_offset:                                                break;
        case Timestamp.S_offset_p:    offset = v * 60;                          break;
        case Timestamp.S_offset_m:    offset = -v * 60;                         break;
        case Timestamp.S_offset_mins: offset += (offset < -0) ? -v : v;         break;
        case Timestamp.S_zoffset:     offset = -0.0;                            break;
        default:
          Timestamp.bad_timestamp("invalid internal state");
      }
      if (state.p != -1) {
        precision = state.p;
        if (!(pos < limit)) break;
      }
      c = str.charCodeAt(pos);
      state = state.t[c];
      if (state === undefined) Timestamp.bad_timestamp(pos);
      pos++;
    }
    t = new Timestamp(precision, offset, year, month, day, hour, minute, seconds);
    return t;
  }
}
