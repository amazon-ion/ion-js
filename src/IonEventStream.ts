/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { Reader } from "./IonReader";
import {IonContainerEvent, IonEndEvent, IonEvent, IonEventFactory} from "./IonEvent";
import { Writer } from "./IonWriter";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { IonEventType } from "./IonEvent";
import {TypeCodes} from "./IonBinary";
import {TextReader} from "./IonTextReader";
import {makeReader} from "./Ion";
import { Span } from "./IonSpan";
import {BinaryReader} from "./IonBinaryReader";

export class IonEventStream {
    private eventStream : IonEvent[];
    private reader : Reader;
    private eventFactory : IonEventFactory;

    constructor(reader : Reader) {
        this.eventStream = [];
        this.reader = reader;
        this.eventFactory = new IonEventFactory();
        this.generateStream();

    }

    write(writer : Writer) {
        writer.writeSymbol("ion_event_stream");
        for(let i : number = 0; i < this.eventStream.length; i++) {
            this.eventStream[i].write(writer);
        }
    }

    getEvents() : IonEvent[]{
        return this.eventStream;
    }

    equals(expected : IonEventStream) {
        let actualIndex : number = 0;
        let expectedIndex : number = 0;
        for(; actualIndex < this.eventStream.length && expectedIndex < expected.eventStream.length; actualIndex++, expectedIndex++) {
            let actualEvent = this.eventStream[actualIndex];
            let expectedEvent = expected.eventStream[expectedIndex];
            switch(actualEvent.eventType) {
                case IonEventType.SCALAR : {
                    if(!actualEvent.equals(expectedEvent)) return false;
                    break;
                }
                case IonEventType.CONTAINER_START : {
                    if(actualEvent.equals(expectedEvent)){
                        actualIndex = actualIndex + (<IonContainerEvent>actualEvent).events.length; //todo probably some off by one error around lengths and incrementing the for loop.
                        expectedIndex = expectedIndex + (<IonContainerEvent>expectedEvent).events.length;
                    } else {
                        return false;
                    }
                    break;
                }
            }
        }
        return true;
    }

    //doesnt handle clobs, blobs, datagrams
    private generateStream() : void {
        let tid : IonType = this.reader.next();
        if(tid === IonTypes.SYMBOL && this.reader.stringValue() === "ion_event_stream"){
            this.marshalStream();
            return;
        }
        let currentContainer : IonContainerEvent[] = [];
        let currentContainerIndex : number[] = [];
        while(true) {
            if(this.reader.isNull()){
                this.eventStream.push(this.eventFactory.makeScalarEvent(tid, this.reader.fieldName(), this.reader.depth(), undefined, this.reader));
                tid = this.reader.next();
            } else {
                switch (tid) {
                    case IonTypes.LIST :
                    case IonTypes.SEXP :
                    case IonTypes.STRUCT : {
                        let containerEvent = this.eventFactory.makeContainerEvent(IonEventType.CONTAINER_START, tid, this.reader.fieldName(), undefined, this.reader.depth(), undefined);
                        this.eventStream.push(containerEvent);
                        currentContainer.push(containerEvent);
                        currentContainerIndex.push(this.eventStream.length);
                        this.reader.stepIn();
                        break;
                    }
                    case undefined : {
                        if (this.reader.depth() === 0) {
                            this.eventStream.push(this.eventFactory.makeEndEvent(IonEventType.STREAM_END, IonTypes.NULL, undefined, undefined, this.reader.depth(), undefined));
                            return;
                        } else {
                            this.reader.stepOut();
                            this.closeContainer(currentContainer.pop(), currentContainerIndex.pop());
                            break;
                        }
                    }
                    default : {
                        this.eventStream.push(this.eventFactory.makeScalarEvent(tid, this.reader.fieldName(), this.reader.depth(), undefined, this.reader));
                        break;
                    }
                }
            }
            tid = this.reader.next();
        }
    }

    private closeContainer(thisContainer : IonContainerEvent, thisContainerIndex : number) {
        this.eventStream.push(this.eventFactory.makeEndEvent(IonEventType.CONTAINER_END, thisContainer.ionType, undefined, undefined, thisContainer.depth, undefined));
        thisContainer.setEvents(this.eventStream.slice(thisContainerIndex, this.eventStream.length)); //todo probably some off by one error around the .length calls.
    }

//(event_type: EventType, ion_type: IonType, field_name: SymbolToken, annotations: list<SymbolToken>, value_text: string, value_binary: list<byte>, imports: list<ImportDescriptor>, depth: int)
    private marshalStream() {
        let currentContainer : IonContainerEvent[] = [];
        let currentContainerIndex : number[] = [];
        let tid : IonType = this.reader.next();
            while(tid === IonTypes.STRUCT) {
                this.reader.stepIn();
                let tempEvent : IonEvent = this.marshalEvent();
                if(tempEvent instanceof IonContainerEvent) {
                    currentContainerIndex.push(this.eventStream.length);
                    currentContainer.push(tempEvent);
                } else if(tempEvent instanceof IonEndEvent) {
                    this.closeContainer(currentContainer.pop(), currentContainerIndex.pop());
                } else if(tempEvent instanceof IonEvent) {
                    this.eventStream.push(tempEvent);
                }
                this.reader.stepOut();
                tid = this.reader.next();
            }
    }

    private marshalEvent() : IonEvent {
        let currentEvent : Map<string, any> = new Map<string, any>();
        let tid : IonType;
        while(currentEvent.size < 8) {
            tid = this.reader.next();
            let fieldName = this.reader.fieldName();
            //console.log('fieldname: ' + fieldName);
            if (currentEvent.has(fieldName)) {
                throw new Error('Repeated event field: ' + fieldName);
            }
            switch (fieldName) {
                case 'event_type' : {
                    currentEvent.set(fieldName, this.reader.stringValue);
                    break;
                }

                case 'ion_type' : {
                    currentEvent.set(fieldName, this.parseIonType());
                    break;
                }

                case 'field_name' : {
                    currentEvent.set(fieldName, this.reader.stringValue());//might have issues with the $ at the start?
                    break;
                }

                case 'annotations' : {
                    currentEvent.set(fieldName, this.parseAnnotations());
                    break;
                }

                case 'value_text' : {
                    currentEvent.set(fieldName, this.parseTextValue());
                    break;
                }

                case 'value_binary' : {
                    currentEvent.set(fieldName, this.parseBinaryValue());
                    break;
                }

                case 'imports' : {
                    currentEvent.set(fieldName, this.parseImports());
                    break;
                }

                case 'depth' : {
                    currentEvent.set(fieldName, this.reader.numberValue());
                    break;
                }

                default :
                    throw new Error('Unexpected event field: ' + fieldName);
            }
        }

        switch(currentEvent.get('event_type')) {
            case 'CONTAINER_START' :
                return this.eventFactory.makeContainerEvent(
                    IonEventType.CONTAINER_START,
                    currentEvent.get('ion_type'),
                    currentEvent.get('field_name'),
                    currentEvent.get('annotations'),
                    currentEvent.get('depth'),
                    currentEvent.get('value_text')
                );
            case 'STREAM_END' :
                return this.eventFactory.makeEndEvent(
                    IonEventType.STREAM_END,
                    currentEvent.get('ion_type'),
                    currentEvent.get('field_name'),
                    currentEvent.get('annotations'),
                    currentEvent.get('depth'),
                    currentEvent.get('value_text')
                );
            case 'CONTAINER_END' :
                return this.eventFactory.makeEndEvent(
                    IonEventType.CONTAINER_END,
                    currentEvent.get('ion_type'),
                    currentEvent.get('field_name'),
                    currentEvent.get('annotations'),
                    currentEvent.get('depth'),
                    currentEvent.get('value_text')
                );
            case 'SCALAR' :
                return this.eventFactory.makeScalarEvent(
                    currentEvent.get('ion_type'),
                    currentEvent.get('field_name'),
                    currentEvent.get('annotations'),
                    currentEvent.get('depth'),
                    currentEvent.get('value_text')
                );
            case 'SYMBOL_TABLE' :
                return undefined;
        }
    }

    private parseIonType() : IonType{
        let input : string = this.reader.stringValue().toLowerCase();
        switch(input) {
            case 'null' : {
                return IonTypes.NULL;
            }
            case 'bool' : {
                return IonTypes.BOOL;
            }
            case 'int' : {
                return IonTypes.INT;
            }
            case 'float' : {
                return IonTypes.FLOAT;
            }
            case 'decimal' : {
                return IonTypes.DECIMAL;
            }
            case 'timestamp' : {
                return IonTypes.TIMESTAMP;
            }
            case 'symbol' : {
                return IonTypes.SYMBOL;
            }
            case 'string' : {
                return IonTypes.STRING;
            }
            case 'clob' : {
                return IonTypes.CLOB;
            }
            case 'blob' : {
                return IonTypes.BLOB;
            }
            case 'list' : {
                return IonTypes.LIST;
            }
            case 'sexp' : {
                return IonTypes.SEXP;
            }
            case 'struct' : {
                return IonTypes.STRUCT;
            }
            default : {
                throw new Error('unexpected type: ' + input);
            }

        }
    }

    private parseAnnotations() : string[] {
        if(this.reader.isNull()) {
           return undefined;
        } else {
            this.reader.stepIn();
            let tid = this.reader.next();
            while(tid !== undefined) {
                tid = this.reader.next();
                if(tid === IonTypes.STRUCT || tid === IonTypes.LIST || tid === IonTypes.SEXP) {
                    this.reader.stepIn();
                    this.parseAnnotations();
                    this.reader.stepOut();
                }
            }
            this.reader.stepOut();
        }
    }

    private parseTextValue() : any {
        //create reader from stringvalue of reader and generate IonEvent from factory.
        //start with a nullcheck
        let tempString : string = this.reader.stringValue();
        let tempReader : Reader = makeReader(tempString, undefined);
        tempReader.next();
        return tempReader.value();
    }

    private parseBinaryValue() : any {
        //convert list of ints to array of bytes and pass the buffer to a binary reader, generate value from factory.
        //start with a null check
        if(this.reader.isNull()) return undefined;
        let numBuffer : number[] = [];
        this.reader.stepIn();
        let tid : IonType = this.reader.next();
        while(tid) {
            numBuffer.push(this.reader.numberValue());
            tid = this.reader.next();
        }
        this.reader.stepOut();
        let tempReader : Reader = makeReader(numBuffer, undefined);
        return tempReader.value();
    }

    private parseImports() : any { //TODO
        return this.reader.value();
    }
}