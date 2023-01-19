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

import {IonEventStream} from "ion-js";
import {Reader} from "ion-js";
import {IonTypes, makeReader, Writer} from "ion-js";
import fs from "fs";
import {IonCompareArgs} from "./CliCompareArgs";
import {ErrorType, IonCliError} from "./CliError";
import {IonEvent, IonEventFactory, IonEventType} from "ion-js";

/**
 * ComparisonContext to create a structure for lhs and rhs streams
 * for more information: https://github.com/amazon-ion/ion-test-driver#comparisonreport
 */
export class ComparisonContext {
    location: string;
    eventStream: IonEventStream;

    constructor(path: string, args: IonCompareArgs){
        this.location = path;
        let ionReader = this.createReadersForComparison(args);
        this.setEventStream(ionReader, path, args);
    }

    createReadersForComparison(args: IonCompareArgs): Reader {
        let ionReader;
        try {
            ionReader = makeReader(this.getInput(this.getLocation()));
        } catch (Error) {
            new IonCliError(ErrorType.READ, this.getLocation(), Error.message, args.getErrorReportFile()).writeErrorReport();
        }
        return ionReader;
    }

    getInput(path: string): string | Buffer {
        let options = path.endsWith(".10n") ? null : "utf8";
        return fs.readFileSync(path, options);
    }

    setEventStream(ionReader: Reader, path: string, args: IonCompareArgs) {
        let events: IonEvent[] = [];
        try{
            let eventStream = new IonEventStream(ionReader);

            if(!eventStream.isEventStream) {
                // processes input stream(text or binary) into event stream
                events = this.collectInputStreamEvents(events, eventStream);
                eventStream.events = events;
            }
            this.eventStream = eventStream;
        } catch (EventStreamError) {
            if(EventStreamError.eventstream) {
                events.push(...EventStreamError.eventstream);
            }
            if(EventStreamError.type === "READ") {
                new IonCliError(ErrorType.READ, path, EventStreamError.message, args.getErrorReportFile(), events.length).writeErrorReport();
            }
            else if(EventStreamError.type === "WRITE") {
                new IonCliError(ErrorType.WRITE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
            else {
                new IonCliError(ErrorType.STATE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
        }
    }

    collectInputStreamEvents(events: IonEvent[], eventStream: IonEventStream): IonEvent[] {
        for(let i = 0; i < eventStream.events.length; i++) {
            let event = eventStream.events[i];
            events.push(event);
            if (eventStream.isEmbedded(event)) {
                let tempEvents: IonEvent[] = [];
                for (let j = 0; j < event.ionValue.length - 1; j++) {
                    tempEvents.push(...new IonEventStream(makeReader(event.ionValue[j].ionValue)).getEvents());
                }
                i = i + (event.ionValue.length - 1);
                let eventFactory = new IonEventFactory();
                tempEvents.push(eventFactory.makeEvent(IonEventType.CONTAINER_END, event.ionType!, null, event.depth, [], false, null));
                event.ionValue = tempEvents;
                events.push(...tempEvents.slice(0,-1));
            }
        }
        return events;
    }

    getEventStream() {
        return this.eventStream;
    }

    getLocation(): string {
        return this.location;
    }

    writeComparisonContext(ionOutputWriter: Writer, field_name: string, event_index: number) {
        ionOutputWriter.writeFieldName(field_name);
        ionOutputWriter.stepIn(IonTypes.STRUCT);
        ionOutputWriter.writeFieldName("location");
        ionOutputWriter.writeString(this.location);
        ionOutputWriter.writeFieldName("event");
        if(this.getEventStream().getEvents().length > 0) {
            this.getEventStream().getEvents()[event_index].write(ionOutputWriter);
        } else {
            ionOutputWriter.writeNull(IonTypes.NULL);
        }
        ionOutputWriter.writeFieldName("event_index");
        ionOutputWriter.writeInt(event_index);
        ionOutputWriter.stepOut();
    }
}