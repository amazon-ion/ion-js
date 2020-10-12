import { IonEvent } from "../Ion";

export class EventStreamError extends Error {
  type: string;
  index: number;
  eventstream: IonEvent[];

  constructor(
    type: string,
    message: string,
    index: number,
    eventstream: IonEvent[]
  ) {
    super();
    this.type = type;
    this.index = index;
    this.message = message;
    this.eventstream = eventstream;
  }
}
