import { Value } from "./Value";
import * as ion from "../Ion";
import { Decimal, IonTypes } from "../Ion";
import {
  FromJsConstructor,
  FromJsConstructorBuilder,
} from "./FromJsConstructor";
import { Writer } from "../Ion";

const _fromJsConstructor: FromJsConstructor = new FromJsConstructorBuilder()
  .withClasses(Date, ion.Timestamp)
  .build();

/**
 * Represents a timestamp[1] value in an Ion stream.
 *
 * [1] http://amzn.github.io/ion-docs/docs/spec.html#timestamp
 */
export class Timestamp extends Value(
  Date,
  IonTypes.TIMESTAMP,
  _fromJsConstructor
) {
  protected _timestamp: ion.Timestamp;
  protected _date: Date;

  /**
   * Constructor.
   * @param dateOrTimestamp   A `Date` or `Timestamp` to represent as a timestamp.
   * @param annotations       An optional array of strings to associate with this timestamp.
   */
  constructor(
    dateOrTimestamp: Date | ion.Timestamp,
    annotations: string[] = []
  ) {
    let date: Date;
    let timestamp: ion.Timestamp;
    if (dateOrTimestamp instanceof Date) {
      date = dateOrTimestamp;
      timestamp = Timestamp._timestampFromDate(date);
    } else {
      timestamp = dateOrTimestamp;
      date = timestamp.getDate();
    }
    super(date);
    this._date = date;
    this._timestamp = timestamp;
    this._setAnnotations(annotations);
  }

  private static _timestampFromDate(date: Date): ion.Timestamp {
    let milliseconds = date.getUTCSeconds() * 1000 + date.getUTCMilliseconds();
    let fractionalSeconds = new Decimal(milliseconds, -3);

    // `Date` objects do not store a timezone offset. If the offset is requested
    // via `.getTimezoneOffset()`, the configured offset of the host computer
    // is returned instead of the timezone that was specified when the Date was
    // constructed. Since the timezone of the host may or may not be meaningful
    // to the user, we store the time in UTC instead. Users wishing to store a
    // specific timezone offset on their dom.Timestamp can pass in an ion.Timestamp
    // instead of a Date.
    return new ion.Timestamp(
      0,
      date.getUTCFullYear(),
      date.getUTCMonth() + 1, // Timestamp expects a range of 1-12
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      fractionalSeconds
    );
  }

  timestampValue(): ion.Timestamp {
    return this._timestamp;
  }

  dateValue(): Date {
    return this._date;
  }

  writeTo(writer: Writer): void {
    writer.setAnnotations(this.getAnnotations());
    writer.writeTimestamp(this.timestampValue());
  }
}
