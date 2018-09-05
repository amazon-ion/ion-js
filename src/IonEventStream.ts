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
import {IonEvent, IonEventFactory} from "./IonEvent";
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

    writeEventStream(writer : Writer) {
        writer.writeSymbol("ion_event_stream");
        for(let i : number = 0; i < this.eventStream.length; i++) {
            this.eventStream[i].write(writer);
        }
    }

    writeIon(writer : Writer) {
        let tempBuf : number[];
        let tempEvent : IonEvent;
        for(let indice : number = 0; indice < this.eventStream.length; indice++){
            tempEvent = this.eventStream[indice];
            if(tempEvent.fieldName !== null) {
                writer.writeFieldName(tempEvent.fieldName);
            }
            switch(tempEvent.eventType){
                case IonEventType.SCALAR:
                    switch(tempEvent.ionType) {
                        case IonTypes.BOOL :
                            writer.writeBoolean(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.STRING:
                            writer.writeString(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.SYMBOL :
                            writer.writeSymbol(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.INT :
                            writer.writeInt(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.DECIMAL :
                            writer.writeDecimal(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.FLOAT :
                            writer.writeFloat64(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.NULL :
                            writer.writeNull(tempEvent.ionType.bid, tempEvent.annotations);
                            break;
                        case IonTypes.TIMESTAMP :
                            break;
                        case IonTypes.CLOB :
                            writer.writeClob(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        case IonTypes.BLOB :
                            writer.writeBlob(tempEvent.ionValue, tempEvent.annotations);
                            break;
                        default :
                            throw new Error("unexpected type: " + tempEvent.ionType.name);
                    }
                    break;
                case IonEventType.CONTAINER_START:
                    switch(tempEvent.ionType) {
                        case IonTypes.STRUCT :
                            writer.writeStruct(tempEvent.annotations, false);
                            break;
                        case IonTypes.LIST :
                            writer.writeList(tempEvent.annotations, false);
                            break;
                        case IonTypes.SEXP :
                            writer.writeSexp(tempEvent.annotations, false);
                            break;
                        default :
                            throw new Error('Unexpected IonType: ' + tempEvent.ionType.name);
                    }
                    break;
                case IonEventType.CONTAINER_END:
                    writer.endContainer();
                    break;
                case IonEventType.STREAM_END:
                    writer.close();
                    break;
                case IonEventType.SYMBOL_TABLE:
                    throw new Error("Symboltables unsupported.");
                default:
                    throw new Error("Unexpected event type: "+ tempEvent.eventType);

            }
        }
    }

    getEvents() : IonEvent[]{
        return this.eventStream;
    }

    equals(expected : IonEventStream) {
        let actualIndex : number = 0;
        let expectedIndex : number = 0;
        while(actualIndex < this.eventStream.length && expectedIndex < expected.eventStream.length) {
            let actualEvent = this.eventStream[actualIndex];
            let expectedEvent = expected.eventStream[expectedIndex];
            if(actualEvent.eventType === IonEventType.SYMBOL_TABLE) actualIndex++;
            if(expectedEvent.eventType === IonEventType.SYMBOL_TABLE) expectedIndex++;
            if(actualEvent.eventType === IonEventType.SYMBOL_TABLE || expectedEvent.eventType === IonEventType.SYMBOL_TABLE) continue;
            switch(actualEvent.eventType) {
                case IonEventType.SCALAR : {
                    if (!actualEvent.equals(expectedEvent)) return false;
                    break;
                }
                case IonEventType.CONTAINER_START : {
                    if (actualEvent.equals(expectedEvent)) {
                        actualIndex = actualIndex + actualEvent.ionValue.length;
                        expectedIndex = expectedIndex + expectedEvent.ionValue.length;
                    } else {
                        return false;
                    }
                    break;
                }
                case IonEventType.CONTAINER_END :
                case IonEventType.STREAM_END : {
                    //no op
                    break;
                }
                default : {
                    throw new Error("Unexpected event type: " + actualEvent.eventType);
                }
            }
                actualIndex++;
                expectedIndex++;
        }
        return true;
    }

    private generateStream() : void {
        let tid : IonType = this.reader.next();
        if(tid === IonTypes.SYMBOL && this.reader.stringValue() === "ion_event_stream"){
            this.marshalStream();
            return;
        }
        let currentContainer : IonEvent[] = [];
        let currentContainerIndex : number[] = [];
        while(true) {
            if(this.reader.isNull()){
                this.eventStream.push(this.eventFactory.makeEvent(IonEventType.SCALAR, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), true, this.reader.value()));
            } else {
                switch (tid) {
                    case IonTypes.LIST :
                    case IonTypes.SEXP :
                    case IonTypes.STRUCT : {
                        let containerEvent = this.eventFactory.makeEvent(IonEventType.CONTAINER_START, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, null);
                        this.eventStream.push(containerEvent);
                        currentContainer.push(containerEvent);
                        currentContainerIndex.push(this.eventStream.length);
                        this.reader.stepIn();
                        break;
                    }
                    case undefined : {
                        if (this.reader.depth() === 0) {
                            this.eventStream.push(this.eventFactory.makeEvent(IonEventType.STREAM_END, IonTypes.NULL, null, this.reader.depth(), undefined, false,undefined));
                            return;
                        } else {
                            this.reader.stepOut();
                            this.closeContainer(currentContainer.pop(), currentContainerIndex.pop());
                        }
                        break;
                    }
                    default : {
                        this.eventStream.push(this.eventFactory.makeEvent(IonEventType.SCALAR, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, this.reader.value()));
                        break;
                    }
                }
            }
            tid = this.reader.next();
        }
    }

    private closeContainer(thisContainer : IonEvent, thisContainerIndex : number) {
        this.eventStream.push(this.eventFactory.makeEvent(IonEventType.CONTAINER_END, thisContainer.ionType, null, thisContainer.depth, null,false, null));
        thisContainer.ionValue = this.eventStream.slice(thisContainerIndex, this.eventStream.length);
    }

//(event_type: EventType, ion_type: IonType, field_name: SymbolToken, annotations: list<SymbolToken>, value_text: string, value_binary: list<byte>, imports: list<ImportDescriptor>, depth: int)
    private marshalStream() : void {
        this.eventStream = [];
        let currentContainer : IonEvent[] = [];
        let currentContainerIndex : number[] = [];
            for(let tid : IonType = this.reader.next(); tid === IonTypes.STRUCT; tid = this.reader.next()) {
                this.reader.stepIn();
                let tempEvent : IonEvent = this.marshalEvent();
                if(tempEvent.eventType === IonEventType.CONTAINER_START) {
                    currentContainer.push(tempEvent);
                    this.eventStream.push(tempEvent);
                    currentContainerIndex.push(this.eventStream.length);
                } else if(tempEvent.eventType === IonEventType.CONTAINER_END) {
                    this.closeContainer(currentContainer.pop(), currentContainerIndex.pop());
                } else if(tempEvent.eventType === IonEventType.SCALAR || tempEvent.eventType === IonEventType.STREAM_END) {
                    this.eventStream.push(tempEvent);
                } else {
                    throw new Error('Unexpected eventType: ' + tempEvent.eventType);
                }
                this.reader.stepOut();
            }
    }

    private marshalEvent() : IonEvent {
        let currentEvent = {};
        let tid : IonType;
        for(tid = this.reader.next(); tid !== undefined; tid = this.reader.next()) {

            let fieldName = this.reader.fieldName();
            if (currentEvent[fieldName] !== undefined) throw new Error('Repeated event field: ' + fieldName);
            switch (fieldName) {
                case 'event_type' : {
                    currentEvent[fieldName] = this.reader.stringValue();
                    break;
                }

                case 'ion_type' : {
                    currentEvent[fieldName] = this.parseIonType();
                    break;
                }

                case 'field_name' : {
                    currentEvent[fieldName] = this.reader.stringValue();
                    break;
                }

                case 'annotations' : {
                    currentEvent[fieldName] = this.parseAnnotations();
                    break;
                }

                case 'value_text' : {
                    let tempString : string = this.reader.stringValue();
                    if(tempString.substr(0,5) === '$ion_') tempString = "$ion_user_value::" + tempString
                    let tempReader : Reader = makeReader(tempString, undefined);
                    tempReader.next();
                    let tempValue = tempReader.value();
                    currentEvent['isNull'] =  tempReader.isNull();
                    currentEvent[fieldName] = tempValue;
                    break;
                }

                case 'value_binary' : {
                    currentEvent[fieldName] = this.parseBinaryValue();
                    break;
                }

                case 'imports' : {
                    currentEvent[fieldName] = this.parseImports();
                    break;
                }

                case 'depth' : {
                    currentEvent[fieldName] = this.reader.numberValue();
                    break;
                }

                default :
                    throw new Error('Unexpected event field: ' + fieldName);
            }
        }
        let eventType : IonEventType;
        switch(currentEvent['event_type']){
            case 'CONTAINER_START' :
                eventType = IonEventType.CONTAINER_START;
                break;
            case 'STREAM_END' :
                eventType = IonEventType.STREAM_END;
                break;
            case 'CONTAINER_END' :
                eventType = IonEventType.CONTAINER_END;
                break;
            case 'SCALAR' :
                eventType = IonEventType.SCALAR;
                break;
            case 'SYMBOL_TABLE' :
                throw new Error('Symbol tables unsupported');
        }
        let fieldname = (currentEvent['field_name'] !== undefined ? currentEvent['field_name'] : null);
        //if(currentEvent.get('value_text') !== currentEvent.get('value_binary')) throw new Error(`${currentEvent.get('value_text')} does not equal ${currentEvent.get('value_binary')}`);

        return this.eventFactory.makeEvent(
            eventType,
            currentEvent['ion_type'],
            fieldname,
            currentEvent['depth'],
            currentEvent['annotations'],
            currentEvent['isNull'],
            currentEvent['value_text']
        );
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
                throw new Error('i: ' + input);
            }

        }
    }

    private parseAnnotations() : string[] {
        let annotations : string[] = [];
        if(this.reader.isNull()) {
           return annotations;
        } else {
            this.reader.stepIn();
            for(let tid = this.reader.next(); tid !== undefined; tid = this.reader.next()) {
                annotations.push(this.reader.value());
            }
            this.reader.stepOut();
            return annotations;
        }
    }

    private parseBinaryValue() : any {
        //convert list of ints to array of bytes and pass the currentBuffer to a binary reader, generate value from factory.
        //start with a null check
        if(this.reader.isNull()) return null;
        let numBuffer : number[] = [];
        this.reader.stepIn();
        let tid : IonType = this.reader.next();
        while(tid) {
            numBuffer.push(this.reader.numberValue());
            tid = this.reader.next();
        }
        this.reader.stepOut();
        let tempReader : Reader = makeReader(numBuffer, undefined);
        tempReader.next();
        return tempReader.value();
    }

    private parseImports() : any { //TODO needed for symboltoken support.
        return this.reader.value();
    }
}