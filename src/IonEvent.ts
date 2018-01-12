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

import { IonTypes } from "./IonTypes";
import { Decimal } from "./IonDecimal";
import { Timestamp } from "./IonTimestamp";
import { IonType } from "./IonType";
import { Writer } from "./IonWriter";
import { TypeCodes } from "./IonBinary";
import { TextWriter } from "./IonTextWriter";
import { Writeable } from "./IonWriteable";
import { BinaryWriter } from "./IonBinaryWriter";
import { Reader } from "./IonReader";
import {defaultLocalSymbolTable} from "./IonLocalSymbolTable";

export enum IonEventType {
    SCALAR = 0,
    CONTAINER_START = 1,
    CONTAINER_END = 2,
    SYMBOL_TABLE = 3,
    STREAM_END = 4
}

export interface IIonEvent {
    write(writer : Writer) : void;
    equals(expected : IonEvent) : boolean;
    writeIonValue(writer : Writer) : void;
}

export abstract class IonEvent implements IIonEvent {
    readonly eventType : IonEventType;
    readonly ionType : IonType;
    readonly fieldName : string;
    readonly annotations : string[];
    readonly depth : number;
    readonly ionValue : any;

    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any) {
        this.eventType = eventType;
        this.ionType = ionType;
        this.fieldName = fieldName;
        this.annotations = annotations;
        this.depth = depth;
        this.ionValue = ionValue;
    }

    abstract writeIonValue(writer : Writer) : void;
    abstract valueEquals(expected : IonEvent) : boolean;

    write(writer : Writer) {
        writer.writeStruct();
        writer.writeFieldName('event_type');
        writer.writeSymbol(IonEventType[this.eventType]);
        writer.writeFieldName('ion_type');
        writer.writeSymbol(this.ionType.name);
        writer.writeFieldName('field_name');
        writer.writeString(this.fieldName);
        writer.writeFieldName('annotations');
        this.writeAnnotations(writer);
        this.writeValues(writer);
        writer.writeFieldName('imports');
        this.writeImportDescriptor(writer);
        writer.writeFieldName('depth');
        writer.writeInt(this.depth);
        writer.endContainer();
    }

    writeAnnotations(writer : Writer) {
        writer.writeNull(TypeCodes.LIST);
        /* TODO annotations do not work right now. Need to change the annotations type to SymbolToken/importlocation as well.
        writer.writeList();
        for(){

        }
        */
    }

    writeSymbolToken(writer : Writer, text : string, ){
        writer.writeSymbol(text);
    }

    writeImportDescriptor(writer){
        writer.writeNull(TypeCodes.STRUCT);
        /* TODO implement shared symboltable introduction event callbacks to build import descriptor value for the event.
        writer.writeStruct();
        writer.writeFieldName('import_name');
        writer.writeString();
        writer.writeFieldName('max_id');
        writer.writeInt();
        writer.writeFieldName('version');
        writer.writeInt();
        writer.endContainer();
        */
    }

    writeValues(writer : Writer) : void {
        writer.writeFieldName('value_text');
        this.writeTextValue(writer);
        writer.writeFieldName('value_binary');
        this.writeBinaryValue(writer);
    }

    writeTextValue(writer : Writer) : void {
        let tempTextWriter = new TextWriter(new Writeable());
        this.writeIonValue(tempTextWriter);
        tempTextWriter.close();
        const numBuffer = tempTextWriter.getBytes();
        let stringValue : string = "";
        for(let i : number = 0; i < numBuffer.length; i++){
            stringValue = stringValue + String.fromCharCode(numBuffer[i]);
        }
        writer.writeString(stringValue);
    }

    writeBinaryValue(writer : Writer) : void {
        let tempBinaryWriter = new BinaryWriter(defaultLocalSymbolTable(), new Writeable());
        this.writeIonValue(tempBinaryWriter);
        tempBinaryWriter.close();
        let binaryBuffer = tempBinaryWriter.getBytes();
        writer.writeList();
        for(var i = 0; i < binaryBuffer.length; i++){
            writer.writeInt(binaryBuffer[i]);
        }
        writer.endContainer();
    }

    equals(expected : IonEvent) : boolean {
        return (
            this.eventType === expected.eventType &&
            this.ionType === expected.ionType &&
            this.depth === expected.depth &&
            this.annotationEquals(expected.annotations) &&
            this.valueEquals(expected)
        );
    }

    annotationEquals(expectedAnnotations : string[]) : boolean {//TODO
        return true;
    }
}

export class IonEventFactory {
    makeScalarEvent(ionType : IonType, fieldName : string, depth : number, annotations : string[], reader : Reader) : IonEvent {
        let eventType = IonEventType.SCALAR;

        if (reader.isNull()) return new IonNullEvent(eventType , ionType, fieldName, annotations, depth);

        switch(ionType) {
            case IonTypes.BOOL : {
                return new IonBoolEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.INT : {
                return new IonIntEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.FLOAT : {
                return new IonFloatEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.DECIMAL : {
                return new IonDecimalEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.SYMBOL : {
                return new IonSymbolEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.STRING : {
                return new IonStringEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.TIMESTAMP : {
                return new IonTimestampEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.BLOB : {
                return new IonBlobEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }
            case IonTypes.CLOB : {
                return new IonClobEvent(eventType , ionType, fieldName, annotations, depth, reader.value());
            }

            default : {
                throw new Error("IonType " + ionType.name + " unexpected.");
            }
        }
    }

    makeContainerEvent(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any) : IonContainerEvent {
        switch(eventType) {
            case IonEventType.CONTAINER_START : {
                switch(ionType) {
                    case IonTypes.LIST : {
                        return new IonListEvent(eventType , ionType, fieldName, annotations, depth, ionValue);
                    }
                    case IonTypes.SEXP : {
                        return new IonSexpEvent(eventType , ionType, fieldName, annotations, depth, ionValue);
                    }
                    case IonTypes.STRUCT : {
                        return new IonStructEvent(eventType , ionType, fieldName, annotations, depth, ionValue);
                    }
                    default : {
                        throw new Error("IonType " + ionType + " unexpected.");
                    }
                }
            }
            default : {
                throw new Error("IonEventType " + eventType + " unexpected.");
            }
        }
    }

    makeEndEvent(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any) : IonEndEvent {
        switch(eventType) {
            case IonEventType.CONTAINER_END :
            case IonEventType.STREAM_END : {
                return new IonEndEvent(eventType, ionType, fieldName, annotations, depth, ionValue);
            }
            default : {
                throw new Error("IonEventType " + eventType + " unexpected.");
            }
        }
    }
}

export class IonNullEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        let ionValue = undefined;
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonNullEvent) : boolean {
        return expected.constructor.name === IonNullEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeNull(TypeCodes.NULL);
    }
}

export class IonIntEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : number){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonIntEvent) : boolean {
        return expected.constructor.name === IonIntEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeInt(this.ionValue);
    }
}

export class IonBoolEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : boolean){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonBoolEvent) : boolean {
        return expected.constructor.name === IonBoolEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeBoolean(this.ionValue);
    }
}

export class IonFloatEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : number){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonFloatEvent) : boolean {
        return expected.constructor.name === IonFloatEvent.name &&  this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeFloat32(this.ionValue);
    }
}

export class IonDecimalEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Decimal){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonDecimalEvent) : boolean {
        if(expected.constructor.name !== IonDecimalEvent.name) return false;
        return this.ionValue.equals(expected.ionValue);
    }
    writeIonValue(writer : Writer) : void {
        writer.writeDecimal(this.ionValue);
    }
}

export class IonSymbolEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonSymbolEvent) : boolean {
        if(expected.constructor.name !== IonSymbolEvent.name) return false;
        return this.ionValue.name === expected.ionValue.name
    }
    writeIonValue(writer : Writer) : void{
        writer.writeSymbol(this.ionValue.toString());
    }

}

export class IonStringEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonStringEvent) : boolean {
        if(expected.constructor.name !== IonStringEvent.name) return false;
        return this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeString(this.ionValue);
    }

}

export class IonTimestampEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonTimestampEvent) : boolean {
        if(expected.constructor.name !== IonTimestampEvent.name) return false;
        return this.ionValue.equals(expected.ionValue);
    }
    writeIonValue(writer : Writer) : void {
        writer.writeTimestamp(this.ionValue);
    }
}

export class IonBlobEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonBlobEvent) : boolean {
        return this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeBlob(this.ionValue);
    }
}
export class IonClobEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonClobEvent) : boolean {
        return this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeClob(this.ionValue);
    }
}
/*

Container events encapsulate other IonEvents

 */
export abstract class IonContainerEvent extends IonEvent {
    events : IonEvent[];
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }

    abstract valueEquals(expected : IonContainerEvent);

    setEvents(inputEvents : IonEvent[]) {
        this.events = inputEvents;
    }

    writeIonValue(writer : Writer) : void {
        writer.writeNull(TypeCodes.NULL);
    }
}

export class IonStructEvent extends IonContainerEvent {//no embed support as of yet.
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    //two way equivalence between the structEvents, they must have the exact same number of equivalent elements.
    valueEquals(expected : IonStructEvent) : boolean {
        if(expected.constructor.name !== IonStructEvent.name) return false;
        return this.structsEqual(this.events, expected.events) && this.structsEqual(expected.events, this.events);
    }

    //for each actual ionEvent, searches for an equivalent expected ionEvent,
    //equivalent pairings remove the paired expectedEvent from the search space.
    structsEqual(actualEvents : IonEvent[], expectedEvents : IonEvent[]) : boolean {
        let matchFound : boolean = true;
        let paired : boolean[] = new Array<boolean>(expectedEvents.length);
        for(let i : number = 0; matchFound && i < actualEvents.length; i++) {
            matchFound = false;
            for(let j : number = 0; !matchFound && j < expectedEvents.length; j++) {
                if(paired[j] !== true) {
                    matchFound = actualEvents[i].equals(expectedEvents[j]);
                    paired[j] = matchFound;
                }
            }
        }
        return matchFound;
    }

}

export class IonListEvent extends IonContainerEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }

    valueEquals(expected : IonListEvent) : boolean {
        for(let i : number = 0; i < this.events.length; i++){
            if(!this.events[i].equals(expected.events[i])){
                return false;
            }
        }
        return true;
    }
}

export class IonSexpEvent extends IonContainerEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonListEvent) : boolean {
        for(let i : number = 0; i < this.events.length; i++){
            if(!this.events[i].equals(expected.events[i])){
                return false;
            }
        }
        return true;
    }
}

export class IonEndEvent extends IonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : any){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonEndEvent) {
        return this.ionValue === expected.ionValue; //should be undefined === undefined if they are both end events.
    }

    writeIonValue(writer : Writer) : void {
        writer.writeNull(TypeCodes.NULL);
    }
}

