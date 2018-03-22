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
import { defaultLocalSymbolTable } from "./IonLocalSymbolTable";

export enum IonEventType {
    SCALAR = 0,
    CONTAINER_START = 1,
    CONTAINER_END = 2,
    SYMBOL_TABLE = 3,
    STREAM_END = 4
}

export interface IonEvent {
    readonly eventType : IonEventType;
    readonly ionType : IonType;
    readonly fieldName : string;
    readonly annotations : string[];
    readonly depth : number;
    ionValue : any;
    write(writer : Writer) : void;
    equals(expected : IonEvent) : boolean;
    writeIonValue(writer : Writer) : void;
}

abstract class AbsIonEvent implements IonEvent {
    readonly eventType: IonEventType;
    readonly ionType: IonType;
    readonly fieldName: string;
    readonly annotations: string[];
    readonly depth: number;
    ionValue: any;


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
        if(this.annotations === undefined){
            writer.writeNull(TypeCodes.LIST);
            return;
        }
        writer.writeList();
        for(var i = 0; i < this.annotations.length; i++){
            writer.writeSymbol(this.annotations[i]);
        }
        writer.endContainer();
    }

    writeSymbolToken(writer : Writer, text : string){
        //should be a struct with text/import descriptor?
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

    annotationEquals(expectedAnnotations : string[]) : boolean {
        if(this.annotations.length !== expectedAnnotations.length) return false;
        for(let i = 0; i < this.annotations.length; i++){
            if(this.annotations[i] !== expectedAnnotations[i]) return false;
        }
        return true;
    }
}

export class IonEventFactory {

    makeEvent(eventType : IonEventType, ionType : IonType, fieldName : string, depth : number, annotations : string[], isNull : boolean, value : any) : IonEvent {
        if(isNull){
            return new IonNullEvent(eventType , ionType, fieldName, annotations, depth);
        }
        switch(eventType) {
            case IonEventType.SCALAR :
            case IonEventType.CONTAINER_START :
                switch(ionType) {
                    case IonTypes.BOOL : {
                        return new IonBoolEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.INT : {
                        return new IonIntEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.FLOAT : {
                        return new IonFloatEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.DECIMAL : {
                        return new IonDecimalEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.SYMBOL : {
                        return new IonSymbolEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.STRING : {
                        return new IonStringEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.TIMESTAMP : {
                        return new IonTimestampEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.BLOB : {
                        return new IonBlobEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.CLOB : {
                        return new IonClobEvent(eventType , ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.LIST : {
                        return new IonListEvent(eventType , ionType, fieldName, annotations, depth);
                    }
                    case IonTypes.SEXP : {
                        return new IonSexpEvent(eventType , ionType, fieldName, annotations, depth);
                    }
                    case IonTypes.STRUCT : {
                        return new IonStructEvent(eventType , ionType, fieldName, annotations, depth);
                    }
                    default : {
                        throw new Error("IonType " + ionType.name + " unexpected.");
                    }
                }
            case IonEventType.SYMBOL_TABLE :
                throw new Error("symbol tables unsupported.");
            case IonEventType.CONTAINER_END :
            case IonEventType.STREAM_END :
                return new IonEndEvent(eventType, ionType, fieldName, annotations, depth);
        }
    }
}

class IonNullEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth, null);

    }
    valueEquals(expected : IonNullEvent) : boolean {
        return expected.constructor.name === IonNullEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeNull(this.ionType.bid);
    }
}

class IonIntEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : number) {
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonIntEvent) : boolean {
        return expected.constructor.name === IonIntEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeInt(this.ionValue);
    }
}

class IonBoolEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : boolean) {
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonBoolEvent) : boolean {
        return expected.constructor.name === IonBoolEvent.name && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeBoolean(this.ionValue);
    }
}

class IonFloatEvent extends AbsIonEvent {
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

class IonDecimalEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Decimal){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonDecimalEvent) : boolean {
        return expected.constructor.name === IonDecimalEvent.name && this.ionValue.equals(expected.ionValue);
    }
    writeIonValue(writer : Writer) : void {
        writer.writeDecimal(this.ionValue);
    }
}

class IonSymbolEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonSymbolEvent) : boolean {
        if(expected.constructor.name !== IonSymbolEvent.name) return false;
        return this.ionValue.name === expected.ionValue.name;
    }
    writeIonValue(writer : Writer) : void{
        writer.writeSymbol(this.ionValue.toString());
    }

}

class IonStringEvent extends AbsIonEvent {
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

class IonTimestampEvent extends AbsIonEvent {
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

class IonBlobEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonBlobEvent) : boolean {
        return this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        let tempBuf = [];
        for (let i = 0; i < this.ionValue.length; i++) {
            tempBuf.push(this.ionValue.charCodeAt(i));
        }
        writer.writeBlob(tempBuf);
    }
}

class IonClobEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonClobEvent) : boolean {
        return this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        let tempBuf = [];
        for (let i = 0; i < this.ionValue.length; i++) {
            tempBuf.push(this.ionValue.charCodeAt(i));
        }
        writer.writeClob(tempBuf);
    }
}

abstract class AbsIonContainerEvent extends AbsIonEvent{

    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number) {
        super(eventType , ionType, fieldName, annotations, depth, null);
    }

    abstract valueEquals(expected : AbsIonContainerEvent);
    writeIonValue(writer : Writer) : void{
        //no op;
    }
}

class IonStructEvent extends AbsIonContainerEvent {//no embed support as of yet.
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number) {
        super(eventType , ionType, fieldName, annotations, depth);

    }
    //two way equivalence between the structEvents, they must have the exact same number of equivalent elements.
    valueEquals(expected : IonStructEvent) : boolean {
        if(expected.constructor.name !== IonStructEvent.name) return false;
        return this.structsEqual(this.ionValue, expected.ionValue) && this.structsEqual(expected.ionValue, this.ionValue);
    }



    //for each actual ionEvent, searches for an equivalent expected ionEvent,
    //equivalent pairings remove the paired expectedEvent from the search space.
    structsEqual(actualEvents : AbsIonEvent[], expectedEvents : AbsIonEvent[]) : boolean {
        let matchFound : boolean = true;
        let paired : boolean[] = new Array<boolean>(expectedEvents.length);
        for(let i : number = 0; matchFound && i < actualEvents.length; i++) {
            matchFound = false;
            for(let j : number = 0; !matchFound && j < expectedEvents.length; j++) {
                if(!paired[j]) {
                    matchFound = actualEvents[i].equals(expectedEvents[j]);
                    paired[j] = matchFound;
                }
            }
        }
        return matchFound;
    }

}

class IonListEvent extends AbsIonContainerEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth);

    }
    valueEquals(expected : IonListEvent) : boolean {
        for(let i : number = 0; i < this.ionValue.length; i++){
            if(!this.ionValue[i].equals(expected.ionValue[i])){
                return false;
            }
        }
        return true;
    }
}

class IonSexpEvent extends AbsIonContainerEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth);

    }
    valueEquals(expected : IonSexpEvent) : boolean {
        for(let i : number = 0; i < this.ionValue.length; i++){
            if(!this.ionValue[i].equals(expected.ionValue[i])){
                return false;
            }
        }
        return true;
    }
}

class IonEndEvent extends AbsIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth, undefined);

    }
    valueEquals(expected : IonEndEvent) {
        return this.ionValue === expected.ionValue; //should be undefined === undefined if they are both end events.
    }

    writeIonValue(writer : Writer) : void {
        //no op
    }
}

