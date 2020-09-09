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

import {Reader} from "./IonReader";
import {IonEvent, IonEventFactory, IonEventType} from "./IonEvent";
import {Writer} from "./IonWriter";
import {IonType} from "./IonType";
import {IonTypes} from "./IonTypes";
import {defaultLocalSymbolTable, makeReader, ReaderOctetBuffer} from "./Ion";
import {BinaryReader} from "./IonBinaryReader";
import {BinarySpan} from "./IonSpan";
import {
    ComparisonResult,
    ComparisonResultType,
    ErrorType,
    IonCliCommonArgs,
    IonCliError,
    IonComparisonReport
} from "./Cli";
import {ComparisonType} from "./Compare";

export class IonEventStream {
    private eventStream: IonEvent[];
    private reader: Reader;
    private eventFactory: IonEventFactory;
    isEventStream: boolean; // whether the reader has an event stream as input

    constructor(reader: Reader, path: string = "", args?: IonCliCommonArgs) {
        this.eventStream = [];
        this.reader = reader;
        this.eventFactory = new IonEventFactory();
        this.isEventStream = false;
        this.generateStream(path, args!);
    }

    writeEventStream(writer: Writer) {
        writer.writeSymbol("$ion_event_stream");
        for (let i: number = 0; i < this.eventStream.length; i++) {
                this.eventStream[i].write(writer);
        }
    }

    writeIon(writer: Writer) {
        let tempEvent: IonEvent;
        let isEmbedded = false;
        for (let indice: number = 0; indice < this.eventStream.length; indice++) {
            tempEvent = this.eventStream[indice];
            if (tempEvent.fieldName !== null) {
                writer.writeFieldName(tempEvent.fieldName);
            }
            if((tempEvent.ionType == IonTypes.SEXP || tempEvent.ionType == IonTypes.LIST)
                && this.isEmbedded(tempEvent)) {
                isEmbedded = true;
            }
            writer.setAnnotations(tempEvent.annotations);
            switch (tempEvent.eventType) {
                case IonEventType.SCALAR:
                    if (tempEvent.ionValue == null) {
                        writer.writeNull(tempEvent.ionType!);
                        return;
                    }
                    if (isEmbedded) {
                        writer.writeString(tempEvent.ionValue.toString());
                        break;
                    }
                    switch (tempEvent.ionType) {
                        case IonTypes.BOOL:
                            writer.writeBoolean(tempEvent.ionValue);
                            break;
                        case IonTypes.STRING:
                            writer.writeString(tempEvent.ionValue);
                            break;
                        case IonTypes.SYMBOL:
                            writer.writeSymbol(tempEvent.ionValue);
                            break;
                        case IonTypes.INT:
                            writer.writeInt(tempEvent.ionValue);
                            break;
                        case IonTypes.DECIMAL:
                            writer.writeDecimal(tempEvent.ionValue);
                            break;
                        case IonTypes.FLOAT:
                            writer.writeFloat64(tempEvent.ionValue);
                            break;
                        case IonTypes.NULL:
                            writer.writeNull(tempEvent.ionType);
                            break;
                        case IonTypes.TIMESTAMP:
                            writer.writeTimestamp(tempEvent.ionValue);
                            break;
                        case IonTypes.CLOB:
                            writer.writeClob(tempEvent.ionValue);
                            break;
                        case IonTypes.BLOB:
                            writer.writeBlob(tempEvent.ionValue);
                            break;
                        default:
                            throw new Error("unexpected type: " + tempEvent.ionType!.name);
                    }
                    break;
                case IonEventType.CONTAINER_START:
                    writer.stepIn(tempEvent.ionType!);
                    break;
                case IonEventType.CONTAINER_END:
                    if(isEmbedded) {
                        isEmbedded = false;
                    }
                    writer.stepOut();
                    break;
                case IonEventType.STREAM_END:
                    break;
                case IonEventType.SYMBOL_TABLE:
                    throw new Error("Symboltables unsupported.");
                default:
                    throw new Error("Unexpected event type: " + tempEvent.eventType);
            }
        }
        writer.close();
    }

    getEvents(): IonEvent[] {
        return this.eventStream;
    }

    equals(expected: IonEventStream): boolean {
        return this.compare(expected).result == ComparisonResultType.EQUAL;
    }

    /**
     *  compares eventstreams and generates comparison result
     *
     *  @param comparisonReport: optional argument to write a comparison report for the equivalence result
     */
    compare(expected: IonEventStream, comparisonReport?: IonComparisonReport): ComparisonResult {
        let actualIndex: number = 0;
        let expectedIndex: number = 0;
        if(this.eventStream.length != expected.eventStream.length) {
            return new ComparisonResult(ComparisonResultType.ERROR, "Both event streams of different length");
        }
        while (actualIndex < this.eventStream.length && expectedIndex < expected.eventStream.length) {
            let actualEvent = this.eventStream[actualIndex];
            let expectedEvent = expected.eventStream[expectedIndex];
            if (actualEvent.eventType === IonEventType.SYMBOL_TABLE) actualIndex++;
            if (expectedEvent.eventType === IonEventType.SYMBOL_TABLE) expectedIndex++;
            if (actualEvent.eventType === IonEventType.SYMBOL_TABLE || expectedEvent.eventType === IonEventType.SYMBOL_TABLE) continue;
            switch (actualEvent.eventType) {
                case IonEventType.SCALAR: {
                    let eventResult = actualEvent.compare(expectedEvent);
                    if (eventResult.result == ComparisonResultType.NOT_EQUAL) {
                        if(comparisonReport)
                            comparisonReport.writeComparisonReport(ComparisonResultType.NOT_EQUAL, eventResult.message, actualIndex, expectedIndex);
                        return eventResult;
                    }
                    break;
                }
                case IonEventType.CONTAINER_START: {
                    let eventResult = actualEvent.compare(expectedEvent);
                    if (eventResult.result == ComparisonResultType.NOT_EQUAL) {
                        actualIndex += eventResult.actualIndex;
                        expectedIndex += eventResult.expectedIndex;
                        if(comparisonReport)
                            comparisonReport.writeComparisonReport(ComparisonResultType.NOT_EQUAL, eventResult.message, actualIndex, expectedIndex);
                        return eventResult;
                    } else {
                        actualIndex = actualIndex + actualEvent.ionValue.length;
                        expectedIndex = expectedIndex + expectedEvent.ionValue.length;
                    }
                    break;
                }
                case IonEventType.CONTAINER_END:
                case IonEventType.STREAM_END: {
                    //no op
                    break;
                }
                default: {
                    let message = "Unexpected event type: " + actualEvent.eventType;
                    if(comparisonReport) {
                        comparisonReport.writeComparisonReport(ComparisonResultType.ERROR,
                            message, actualIndex, expectedIndex);
                    } else {
                        throw new Error(message);
                    }
                }
            }
            actualIndex++;
            expectedIndex++;
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }

    /**
     * Returns true if this `IonEventStream` is equal to the provided `IonEventStream`
     * as determined by the `ComparisonType`; returns false otherwise.
     * */
    equivs(expected: IonEventStream, comparisonType: ComparisonType): boolean {
        return this.compareEquivs(expected, comparisonType).result == ComparisonResultType.EQUAL;
    }

    isEmbedded(event: IonEvent): boolean {
        if(event.annotations[0] === 'embedded_documents') {
            return true;
        }
        return false;
    }

    /**
     *  equivs, non-equivs & equiv-timeline comparison of eventstreams
     *
     *  @param comparisonReport: optional argument to write a comparison report for the equivalence result
     */
    compareEquivs(expected: IonEventStream , comparisonType: ComparisonType, comparisonReport?: IonComparisonReport): ComparisonResult {
        let actualIndex: number = 0;
        let expectedIndex: number = 0;

        while (actualIndex < this.eventStream.length && expectedIndex < expected.eventStream.length) {
            let actualEvent = this.eventStream[actualIndex];
            let expectedEvent = expected.eventStream[expectedIndex];

            if(actualEvent.eventType == IonEventType.STREAM_END && expectedEvent.eventType == IonEventType.STREAM_END) {
                break;
            } else if(actualEvent.eventType == IonEventType.STREAM_END || expectedEvent.eventType == IonEventType.STREAM_END) {
                throw new Error("Different number of comparison sets.");
            } else if (!(actualEvent.ionType == IonTypes.LIST || actualEvent.ionType == IonTypes.SEXP)
                || !(expectedEvent.ionType == IonTypes.LIST || expectedEvent.ionType == IonTypes.SEXP)) {
                throw new Error("Comparison sets must be lists or s-expressions.");
            } else if(this.isEmbedded(actualEvent) as any ^ this.isEmbedded(expectedEvent) as any) {
                throw new Error("Both streams should be embedded streams.");
            }

            // both containers has type any as it maybe IonEventStream[] or IonEvent[]
            // depending on the type compare method will be called
            let actualContainer: any = [];
            let expectedContainer: any = [];
            if (this.isEmbedded(actualEvent) && this.isEmbedded(expectedEvent)) {
                //we found a list of strings that we need to interpret as top level ion text streams.
                actualContainer = this.parseEventStream(actualEvent);
                expectedContainer = this.parseEventStream(expectedEvent);
            } else {//we're in an sexp/list
                actualContainer = this.parseContainer(actualEvent);
                expectedContainer = this.parseContainer(expectedEvent);
            }

            actualIndex = actualIndex + actualEvent.ionValue.length;
            expectedIndex = expectedIndex + expectedEvent.ionValue.length;

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
                            comparisonReport.writeComparisonReport(ComparisonResultType.NOT_EQUAL, eventResult.message, i + 1, j + 1);
                        }
                        return new ComparisonResult(ComparisonResultType.NOT_EQUAL);
                    } else if (comparisonType == ComparisonType.NON_EQUIVS && eventResult.result == ComparisonResultType.EQUAL) {
                        if(comparisonReport) {
                            comparisonReport.writeComparisonReport(ComparisonResultType.EQUAL,
                                "Both values are equal in non-equivs comparison.", i + 1, j + 1);
                        }
                        return new ComparisonResult(ComparisonResultType.EQUAL);
                    }
                }
            }
            actualIndex++;
            expectedIndex++;
        }
        return new ComparisonResult(comparisonType == ComparisonType.NON_EQUIVS ? ComparisonResultType.NOT_EQUAL : ComparisonResultType.EQUAL);
    }

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

    private parseEventStream(event: IonEvent): any {
        let container: any = [];
        for (let j = 0; j < event.ionValue.length - 1; j++) {
            if(event.ionValue[j].eventType == IonEventType.STREAM_END)
                continue;
            container.push(new IonEventStream(makeReader(event.ionValue[j].ionValue)));
        }
        return container;
    }

    private generateStream(path: string, args: IonCliCommonArgs): void {
        try{
            let tid: IonType | null = this.reader.next();
            if (tid === IonTypes.SYMBOL && this.reader.stringValue() === "$ion_event_stream") {
                this.marshalStream();
                this.isEventStream = true;
                return;
            }
            let currentContainer: IonEvent[] = [];
            let currentContainerIndex: number[] = [];
            while (true) {
                if (this.reader.isNull()) {
                    this.eventStream.push(this.eventFactory.makeEvent(IonEventType.SCALAR, tid!, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), true, this.reader.value()));
                } else {
                    switch (tid) {
                        case IonTypes.LIST:
                        case IonTypes.SEXP:
                        case IonTypes.STRUCT: {
                            let containerEvent = this.eventFactory.makeEvent(IonEventType.CONTAINER_START, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, null);
                            this.eventStream.push(containerEvent);
                            currentContainer.push(containerEvent);
                            currentContainerIndex.push(this.eventStream.length);
                            this.reader.stepIn();
                            break;
                        }
                        case null: {
                            if (this.reader.depth() === 0) {
                                this.eventStream.push(this.eventFactory.makeEvent(IonEventType.STREAM_END, IonTypes.NULL, null, this.reader.depth(), [], false, undefined));
                                return;
                            } else {
                                this.reader.stepOut();
                                this.endContainer(currentContainer.pop()!, currentContainerIndex.pop()!);
                            }
                            break;
                        }
                        default: {
                            this.eventStream.push(this.eventFactory.makeEvent(IonEventType.SCALAR, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, this.reader.value()));
                            break;
                        }
                    }
                }
                tid = this.reader.next();
            }
        } catch (Error) {
            if(args) {
                new IonCliError(ErrorType.READ, path, Error.message, args.getErrorReportFile(), this.eventStream.length).writeErrorReport();
            }
        }
    }

    private endContainer(thisContainer: IonEvent, thisContainerIndex: number) {
        this.eventStream.push(this.eventFactory.makeEvent(IonEventType.CONTAINER_END, thisContainer.ionType!, null, thisContainer.depth, [], false, null));
        thisContainer.ionValue = this.eventStream.slice(thisContainerIndex, this.eventStream.length);
    }

//(event_type: EventType, ion_type: IonType, field_name: SymbolToken, annotations: list<SymbolToken>, value_text: string, value_binary: list<byte>, imports: list<ImportDescriptor>, depth: int)
    private marshalStream(): void {
        this.eventStream = [];
        let currentContainer: IonEvent[] = [];
        let currentContainerIndex: number[] = [];
        for (let tid: IonType | null = this.reader.next(); tid === IonTypes.STRUCT; tid = this.reader.next()) {
            this.reader.stepIn();
            let tempEvent: IonEvent = this.marshalEvent();
            if (tempEvent.eventType === IonEventType.CONTAINER_START) {
                currentContainer.push(tempEvent);
                this.eventStream.push(tempEvent);
                currentContainerIndex.push(this.eventStream.length);
            } else if (tempEvent.eventType === IonEventType.CONTAINER_END) {
                this.endContainer(currentContainer.pop()!, currentContainerIndex.pop()!);
            } else if (tempEvent.eventType === IonEventType.SCALAR || tempEvent.eventType === IonEventType.STREAM_END) {
                this.eventStream.push(tempEvent);
            } else {
                throw new Error('Unexpected eventType: ' + tempEvent.eventType);
            }
            this.reader.stepOut();
        }
    }

    private marshalEvent(): IonEvent {
        let currentEvent = {};
        for (let tid: IonType | null; tid = this.reader.next();) {
            let fieldName = this.reader.fieldName();
            if (fieldName && currentEvent[fieldName] !== undefined) throw new Error('Repeated event field: ' + fieldName);
            switch (fieldName) {
                case 'event_type': {
                    currentEvent[fieldName] = this.reader.stringValue();
                    break;
                }

                case 'ion_type': {
                    currentEvent[fieldName] = this.parseIonType();
                    break;
                }

                case 'field_name': {
                    currentEvent[fieldName] = this.reader.stringValue();
                    break;
                }

                case 'annotations': {
                    currentEvent[fieldName] = this.parseAnnotations();
                    break;
                }

                case 'value_text': {
                    let tempString: string = this.reader.stringValue()!;
                    if (tempString.substr(0, 5) === '$ion_') tempString = "$ion_user_value::" + tempString;
                    let tempReader: Reader = makeReader(tempString);
                    tempReader.next();
                    let tempValue = tempReader.value();
                    currentEvent['isNull'] = tempReader.isNull();
                    currentEvent[fieldName] = tempValue;
                    break;
                }

                case 'value_binary': {
                    currentEvent[fieldName] = this.parseBinaryValue();
                    break;
                }

                case 'imports': {
                    currentEvent[fieldName] = this.parseImports();
                    break;
                }

                case 'depth': {
                    currentEvent[fieldName] = this.reader.numberValue();
                    break;
                }

                default:
                    throw new Error('Unexpected event field: ' + fieldName);
            }
        }
        let eventType: IonEventType;
        switch (currentEvent['event_type']) {
            case 'CONTAINER_START':
                eventType = IonEventType.CONTAINER_START;
                break;
            case 'STREAM_END':
                eventType = IonEventType.STREAM_END;
                break;
            case 'CONTAINER_END':
                eventType = IonEventType.CONTAINER_END;
                break;
            case 'SCALAR':
                eventType = IonEventType.SCALAR;
                break;
            case 'SYMBOL_TABLE':
                throw new Error('Symbol tables unsupported');
        }
        let fieldname = (currentEvent['field_name'] !== undefined ? currentEvent['field_name'] : null);
        if (!currentEvent['annotations']) currentEvent['annotations'] = [];

        let textEvent = this.eventFactory.makeEvent(
            eventType!,
            currentEvent['ion_type'],
            fieldname,
            currentEvent['depth'],
            currentEvent['annotations'],
            currentEvent['isNull'],
            currentEvent['value_text']
        );

        if (eventType! === IonEventType.SCALAR) {
            let binaryEvent = this.eventFactory.makeEvent(
                eventType,
                currentEvent['ion_type'],
                fieldname,
                currentEvent['depth'],
                currentEvent['annotations'],
                currentEvent['isNull'],
                currentEvent['value_binary']
            );
            if (!textEvent.equals(binaryEvent)) {
                throw new Error(`Text event ${currentEvent['value_text']} does not equal binary event ${currentEvent['value_binary']}`);
            }
        }
        return textEvent;
    }

    private parseIonType(): IonType {
        let input: string = this.reader.stringValue()!.toLowerCase();
        switch (input) {
            case 'null': {
                return IonTypes.NULL;
            }
            case 'bool': {
                return IonTypes.BOOL;
            }
            case 'int': {
                return IonTypes.INT;
            }
            case 'float': {
                return IonTypes.FLOAT;
            }
            case 'decimal': {
                return IonTypes.DECIMAL;
            }
            case 'timestamp': {
                return IonTypes.TIMESTAMP;
            }
            case 'symbol': {
                return IonTypes.SYMBOL;
            }
            case 'string': {
                return IonTypes.STRING;
            }
            case 'clob': {
                return IonTypes.CLOB;
            }
            case 'blob': {
                return IonTypes.BLOB;
            }
            case 'list': {
                return IonTypes.LIST;
            }
            case 'sexp': {
                return IonTypes.SEXP;
            }
            case 'struct': {
                return IonTypes.STRUCT;
            }
            default: {
                throw new Error('i: ' + input);
            }

        }
    }

    private parseAnnotations(): string[] {
        let annotations: string[] = [];
        if (this.reader.isNull()) {
            return annotations;
        } else {
            this.reader.stepIn();
            for (let tid; tid = this.reader.next();) {
                if(tid == IonTypes.STRUCT) {
                    this.reader.stepIn();
                    let type = this.reader.next();
                    if(this.reader.fieldName() == "text" && type == IonTypes.STRING) {
                        let text = this.reader.stringValue();
                        if (text !== null) {
                            annotations.push(text!);
                        }
                    }
                    else if(this.reader.fieldName() == "importLocation" && type == IonTypes.INT) {
                        let symtab = defaultLocalSymbolTable();
                        let symbol = symtab.getSymbolText(this.reader.numberValue()!)
                        if (symbol === undefined || symbol === null) {
                            throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
                        }
                        annotations.push(symbol);
                    }
                    this.reader.stepOut();
                }
            }
            this.reader.stepOut();
            return annotations;
        }
    }

    private parseBinaryValue(): any {
        //convert list of ints to array of bytes and pass the currentBuffer to a binary reader, generate value from factory.
        //start with a null check
        if (this.reader.isNull()) return null;
        let numBuffer: number[] = [];
        this.reader.stepIn();
        let tid: IonType | null = this.reader.next();
        while (tid) {
            numBuffer.push(this.reader.numberValue()!);
            tid = this.reader.next();
        }
        this.reader.stepOut();
        const bufArray = new Uint8Array(numBuffer as ReaderOctetBuffer);
        let tempReader: Reader = new BinaryReader(new BinarySpan(bufArray));
        tempReader.next();
        return tempReader.value();
    }

    private parseImports(): any { //TODO needed for symboltoken support.
        return this.reader.value();
    }
}