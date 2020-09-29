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

import fs from 'fs';
import {OutputFormat} from './OutputFormat';
import {IonEventStream} from "ion-js";
import {Writer} from "ion-js";
import {IonTypes, makeReader, Reader} from "ion-js";
import {IonEvent} from "ion-js";
import {ErrorType, IonCliError} from "./CliError";
import {IonCliCommonArgs} from "./CliCommonArgs";

/**
 * The `command`, `describe`, and `handler` exports below are part of the yargs command module API
 * See: https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
export const command = 'process <input-file..>'

export const describe = "Read the input file(s) (optionally, specifying ReadInstructions or a filter) and re-write in" +
    "the format specified by --output.";

export const handler = function (argv) {
    let args = new IonCliCommonArgs(argv);
    new Process(args);
}

/**
 *  Read the input file(s) and re-write in the format specified by --output-format
 *  Create error report through --error-report and output file specified by --output
 */
export class Process {
    private EVENT_STREAM = "$ion_event_stream";

    constructor(parsedArgs: IonCliCommonArgs) {
        let output_writer = OutputFormat.createIonWriter(parsedArgs.getOutputFormatName());
        if (output_writer) {
            if (parsedArgs.getOutputFormatName() == OutputFormat.EVENTS) {
                this.processEvents(output_writer, parsedArgs);
            } else {
                this.processFiles(output_writer, parsedArgs);
            }
        }
    }

    private getInput(path: string): string | Buffer {
        let options = path.endsWith(".10n") ? null : "utf8";
        return fs.readFileSync(path, options);
    }

    // create a reader for an input stream
    createReaderForProcess(path: string, args: IonCliCommonArgs): Reader {
        let ionReader;
        try {
            ionReader = makeReader(this.getInput(path));
        } catch (Error) {
            new IonCliError(ErrorType.READ, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
        return ionReader;
    }

    private isEventStream(ionReader: Reader): boolean {
        let type = ionReader.next();
        return type != null
            && type == IonTypes.SYMBOL
            && ionReader.stringValue() == this.EVENT_STREAM;
    }

    // processes input streams into event streams
    processEvents(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
            this.processEvent(ionOutputWriter, args, path);
        }
        args.getOutputFile().write(ionOutputWriter.getBytes());
    }

    private processEvent(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        this.writeToEventStream(ionOutputWriter, ionReader, path, args);
    }

    private writeToEventStream(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        let eventStream;
        let writeEvents: IonEvent[] = [];
        try {
            eventStream = new IonEventStream(ionReader);

            if(eventStream.isEventStream) {
                //process event stream into event stream
                writeEvents = eventStream.getEvents();
            } else {
                // processes input stream(text or binary) into event stream
                writeEvents = this.collectInputStreamEvents(writeEvents, eventStream);
            }
        } catch (EventStreamError) {
            if(EventStreamError.eventstream) {
                writeEvents.push(...EventStreamError.eventstream);
            }
            if(EventStreamError.type === "READ") {
                new IonCliError(ErrorType.READ, path, EventStreamError.message, args.getErrorReportFile(), writeEvents.length).writeErrorReport();
            }
            else if(EventStreamError.type === "WRITE") {
                new IonCliError(ErrorType.WRITE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
            else {
                new IonCliError(ErrorType.STATE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
        } finally {
            this.addEventsToWriter(ionOutputWriter, writeEvents);
        }
    }

    private addEventsToWriter(ionOutputWriter: Writer, writeEvents: IonEvent[]): void {
        ionOutputWriter.writeSymbol(this.EVENT_STREAM);
        for (let event of writeEvents) {
            event.write(ionOutputWriter);
        }
        ionOutputWriter.close();
    }

    private collectInputStreamEvents(writeEvents: IonEvent[], eventStream: IonEventStream): IonEvent[] {
        for(let i = 0; i < eventStream.getEvents().length; i++) {
            let event = eventStream.getEvents()[i];
            writeEvents.push(event);

            if (eventStream.isEmbedded(event)) {
                for (let j = 0; j < event.ionValue.length - 1; j++) {
                    writeEvents.push(...new IonEventStream(makeReader(event.ionValue[j].ionValue)).getEvents());
                }
                i = i + (event.ionValue.length - 1);
            }
        }
        return writeEvents;
    }

    // process input stream into specified output format (except events)
    processFiles(ionOutputWriter: Writer, args: IonCliCommonArgs): void {
        for (let path of args.getInputFiles()) {
            this.processFile(ionOutputWriter, args, path);
        }
        args.getOutputFile().write(ionOutputWriter.getBytes());
    }

    private processFile(ionOutputWriter: Writer, args: IonCliCommonArgs, path: string): void {
        let ionReader = this.createReaderForProcess(path, args);
        if (this.isEventStream(ionReader)) {
            let reader = this.createReaderForProcess(path, args);
            this.writeToProcessFileFromEventStream(ionOutputWriter, reader, path, args);
        } else {
            this.writeToProcessFile(ionOutputWriter, ionReader, path, args);
        }
    }

    // write event stream to specified output format (except events)
    private writeToProcessFileFromEventStream(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        let eventStream;
        try {
            eventStream = new IonEventStream(ionReader);
            eventStream.writeIon(ionOutputWriter);
        } catch (EventStreamError) {
            if(EventStreamError.type === "READ") {
                new IonCliError(ErrorType.READ, path, EventStreamError.message, args.getErrorReportFile(), EventStreamError.index).writeErrorReport();
            }
            else if(EventStreamError.type === "WRITE") {
                new IonCliError(ErrorType.WRITE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
            else {
                new IonCliError(ErrorType.STATE, path, EventStreamError.message, args.getErrorReportFile()).writeErrorReport();
            }
        }
    }

    // write input stream to specified output format (except events)
    private writeToProcessFile(ionOutputWriter: Writer, ionReader: Reader, path: string, args: IonCliCommonArgs): void {
        try {
            ionOutputWriter.writeValues(ionReader);
            ionOutputWriter.close();
        } catch (Error) {
            new IonCliError(ErrorType.WRITE, path, Error.message, args.getErrorReportFile()).writeErrorReport();
        }
    }
}