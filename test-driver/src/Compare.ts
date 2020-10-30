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

import {OutputFormat} from './OutputFormat';
import {Writer} from "ion-js";
import {IonComparisonReport} from "./ComparisonReport";
import {ComparisonContext} from "./ComparisonContext";
import {IonCompareArgs} from "./CliCompareArgs";
import {ComparisonResult, ComparisonResultType} from "ion-js";
import {IonEvent, IonEventType} from "ion-js";
import {IonTypes} from "ion-js";
import {makeReader} from "ion-js";
import {IonEventStream} from "ion-js";

/**
 * The `command`, `describe`, and `handler` exports below are part of the yargs command module API
 * See: https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 */
export const command = 'compare <input-file..>'

export const describe = "Compare all inputs (which may contain Ion streams and/or EventStreams) against all other inputs " +
    "using the Ion data model's definition of equality. Write a ComparisonReport to the output.";

export const builder = {
    'comparison-type': {
        alias: "y",
        default: 'basic',
        choices: ['basic', 'equivs', 'non-equivs', 'equiv-timeline'],
        describe: "Comparison semantics to be used with the compare command, from the set (basic | equivs | non-equivs |" +
            "equiv-timeline). Any embedded streams in the inputs are compared for EventStream equality. 'basic' performs" +
            "a standard data-model comparison between the corresponding events (or embedded streams) in the inputs." +
            "'equivs' verifies that each value (or embedded stream) in a top-level sequence is equivalent to every other" +
            "value (or embedded stream) in that sequence. 'non-equivs' does the same, but verifies that the values (or" +
            "embedded streams) are not equivalent. 'equiv-timeline' is the same as 'equivs', except that when top-level" +
            "sequences contain timestamp values, they are considered equivalent if they represent the same instant" +
            "regardless of whether they are considered equivalent by the Ion data model. [default: basic]"
    }
}

export const handler = function (argv) {
    let args = new IonCompareArgs(argv);
    new Compare(args);
}

/** Comparison semantics to be used with compare command */
export enum ComparisonType {
    BASIC = "basic",
    EQUIVS = "equivs",
    NON_EQUIVS ="non-equivs",
    EQUIV_TIMELINE = "equiv-timeline"
}

/**
 * Compare all inputs (which may contain Ion streams and/or EventStreams) against all other inputs
 * using the Ion data model's definition of equality. Write a ComparisonReport to the output.
**/
export class Compare {

    constructor(parsedArgs: IonCompareArgs) {
        let output_writer = OutputFormat.createIonWriter(parsedArgs.getOutputFormatName());
        if (output_writer) {
            this.compareFiles(output_writer, parsedArgs);
        }
    }

    // compares files according to comparison type
    compareFiles(ionOutputWriter: Writer, args: IonCompareArgs): void {
        for (let pathFirst of args.getInputFiles()) {
            for (let pathSecond of args.getInputFiles()) {
                let comparisonType = args.getComparisonType();
                if (comparisonType == ComparisonType.BASIC && pathFirst === pathSecond) {
                    continue;
                }
                this.compareFilePair(ionOutputWriter, pathFirst, pathSecond, args);
            }
        }
    }

    private compareFilePair(ionOutputWriter: Writer, pathFirst: string, pathSecond: string, args: IonCompareArgs): void {
        let lhs = new ComparisonContext(pathFirst, args);
        let rhs = new ComparisonContext(pathSecond, args);
        ionOutputWriter.close();
        let comparisonType = args.getComparisonType();
        let comparisonReport = new IonComparisonReport(lhs, rhs, args.getOutputFile(), comparisonType);
        let result: ComparisonResult = new ComparisonResult();
        let lhsEventStream = lhs.getEventStream();
        let rhsEventStream = rhs.getEventStream();
        if(comparisonType == ComparisonType.BASIC) {
            if(lhsEventStream && rhsEventStream) {
                result = lhs.getEventStream().compare(rhs.getEventStream());
                if(result.result == ComparisonResultType.NOT_EQUAL) {
                    comparisonReport.writeComparisonReport(result.result, result.message, result.actualIndex, result.expectedIndex);
                }
            }
        }
        else if(comparisonType == ComparisonType.EQUIVS || comparisonType == ComparisonType.EQUIV_TIMELINE
            || comparisonType == ComparisonType.NON_EQUIVS) {
            if(lhsEventStream && rhsEventStream) {
                result = this.compareEquivs(lhs.getEventStream(), rhs.getEventStream(), comparisonType, comparisonReport);
                if(comparisonType == ComparisonType.NON_EQUIVS && result.result == ComparisonResultType.EQUAL) {
                    comparisonReport.writeComparisonReport(result.result, result.message, result.actualIndex, result.expectedIndex);
                }
                else if((comparisonType == ComparisonType.EQUIVS || comparisonType == ComparisonType.EQUIV_TIMELINE) && result.result == ComparisonResultType.NOT_EQUAL) {
                    comparisonReport.writeComparisonReport(result.result, result.message, result.actualIndex, result.expectedIndex);
                }
            }
        }

    }

    /**
     *  equivs, non-equivs & equiv-timeline comparison of eventstreams
     *
     *  @param comparisonReport: optional argument to write a comparison report for the equivalence result
     */
    compareEquivs(actual: IonEventStream, expected: IonEventStream , comparisonType: ComparisonType, comparisonReport?: IonComparisonReport): ComparisonResult {
        let actualIndex: number = 0;
        let expectedIndex: number = 0;

        while (actualIndex < actual.getEvents().length && expectedIndex < expected.getEvents().length) {
            let actualEvent = actual.getEvents()[actualIndex];
            let expectedEvent = expected.getEvents()[expectedIndex];

            if(actualEvent.eventType == IonEventType.STREAM_END && expectedEvent.eventType == IonEventType.STREAM_END) {
                break;
            } else if(actualEvent.eventType == IonEventType.STREAM_END || expectedEvent.eventType == IonEventType.STREAM_END) {
                throw new Error("Different number of comparison sets.");
            } else if (!(actualEvent.ionType == IonTypes.LIST || actualEvent.ionType == IonTypes.SEXP)
                || !(expectedEvent.ionType == IonTypes.LIST || expectedEvent.ionType == IonTypes.SEXP)) {
                throw new Error("Comparison sets must be lists or s-expressions.");
            } else if(actual.isEmbedded(actualEvent) as any ^ expected.isEmbedded(expectedEvent) as any) {
                throw new Error("Both streams should be embedded streams.");
            }

            // both containers has type any as it maybe IonEventStream[] or IonEvent[]
            // depending on the type compare method will be called
            let actualContainer: any = [];
            let expectedContainer: any = [];
            if (actual.isEmbedded(actualEvent) && expected.isEmbedded(expectedEvent)) {
                //we found a list of strings that we need to interpret as top level ion text streams.
                actualContainer = this.parseEmbeddedStream(actualEvent)
                expectedContainer = this.parseEmbeddedStream(expectedEvent)
            } else {//we're in an sexp/list
                actualContainer = this.parseContainer(actualEvent);
                expectedContainer = this.parseContainer(expectedEvent);
            }

            for (let i = 0; i < actualContainer.length; i++) {
                for (let j = 0; j < expectedContainer.length; j++) {
                    // for non-equivs: not comparing same index's value as it will always be same.
                    if (comparisonType == ComparisonType.NON_EQUIVS && i == j)
                        continue;
                    let actualContainerEvent: IonEvent = actualContainer[i];
                    let expectedContainerEvent: IonEvent = expectedContainer[j];
                    let eventResult;

                    if (comparisonType == ComparisonType.EQUIV_TIMELINE && actualContainerEvent.ionType == IonTypes.TIMESTAMP) {
                        let ionTimestampActual = actualContainerEvent.ionValue;
                        let ionTimestampExpected = expectedContainerEvent.ionValue;
                        eventResult = ionTimestampActual.compareTo(ionTimestampExpected) == 0 ? new ComparisonResult(ComparisonResultType.EQUAL)
                            : new ComparisonResult(ComparisonResultType.NOT_EQUAL, ionTimestampActual + " vs. " + ionTimestampExpected);
                    } else {
                        eventResult = actualContainerEvent.compare(expectedContainerEvent);
                    }

                    if ((comparisonType == ComparisonType.EQUIVS || comparisonType == ComparisonType.EQUIV_TIMELINE)
                        && eventResult.result == ComparisonResultType.NOT_EQUAL) {
                        if(comparisonReport) {
                            // set event-index as the index of container + (i/j) representing the event-index inside container
                            // + 1 to skip the first event (the container event)
                            comparisonReport.writeComparisonReport(ComparisonResultType.NOT_EQUAL, eventResult.message, actualIndex+ i + 1, expectedIndex + j + 1);
                        }
                        return new ComparisonResult(ComparisonResultType.NOT_EQUAL);
                    } else if (comparisonType == ComparisonType.NON_EQUIVS && eventResult.result == ComparisonResultType.EQUAL) {
                        if(comparisonReport) {
                            // set event-index as the index of container + (i/j) representing the event-index inside container
                            // + 1 to skip the first event (the container event)
                            comparisonReport.writeComparisonReport(ComparisonResultType.EQUAL,
                                "Both values are equal in non-equivs comparison.", actualIndex + i + 1, expectedIndex + j + 1);
                        }
                        return new ComparisonResult(ComparisonResultType.EQUAL);
                    }
                }
            }

            // set indices to the next container/event stream
            actualIndex = actualIndex + actualEvent.ionValue.length + 1;
            expectedIndex = expectedIndex + expectedEvent.ionValue.length + 1;
        }
        return new ComparisonResult(comparisonType == ComparisonType.NON_EQUIVS ? ComparisonResultType.NOT_EQUAL : ComparisonResultType.EQUAL);
    }


    // parse container into events
    private parseContainer(event: IonEvent): IonEvent[] {
        let container: IonEvent[] = [];
        for (let j = 0; j < event.ionValue.length - 1; j++) {
            container.push(event.ionValue[j]);
            if (event.ionValue[j].eventType === IonEventType.CONTAINER_START) {
                j += event.ionValue[j].ionValue.length;
            }
        }
        return container;
    }

    // parse embedded stream into events
    private parseEmbeddedStream(event: IonEvent): any {
        let container: any = [];
        let value = "";
        for (let j = 0; j < event.ionValue.length - 1; j++) {
            if(event.ionValue[j].eventType == IonEventType.STREAM_END) {
                container.push(new IonEventStream(makeReader(value)));
                value = "";
                continue;
            }
            value += event.ionValue[j].ionValue + " ";
        }

        return container;
    }
}