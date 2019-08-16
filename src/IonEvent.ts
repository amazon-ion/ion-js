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
import {decodeUtf8} from "./IonUnicode";

export enum IonEventType {
    SCALAR = 0,
    CONTAINER_START = 1,
    CONTAINER_END = 2,
    SYMBOL_TABLE = 3,
    STREAM_END = 4
}



export interface IonEvent {
    eventType : IonEventType;
    ionType : IonType;
    fieldName : string;
    annotations : string[];
    depth : number;
    ionValue : any;
    write(writer : Writer) : void;
    equals(expected : IonEvent) : boolean;
    writeIonValue(writer : Writer) : void;
}

abstract class AbstractIonEvent implements IonEvent {
    eventType: IonEventType;
    ionType: IonType;
    fieldName: string;
    annotations: string[];
    depth: number;
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
        if(this.ionType !== null) {
            writer.writeFieldName('ion_type');
            writer.writeSymbol(this.ionType.name);
        }
        if(this.fieldName !== null && this.fieldName !== undefined) {
            writer.writeFieldName('field_name');
            writer.writeString(this.fieldName);
        }
        if(this.annotations !== null) {
            writer.writeFieldName('annotations');
            this.writeAnnotations(writer);
        }
        if(this.eventType === IonEventType.SCALAR){
            this.writeValues(writer);
        }
        /*
        if(this.imports !== null){
            writer.writeFieldName('imports');
            this.writeImportDescriptor(writer);
        }
        */
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
            writer.writeString(this.annotations[i]);
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
        if(this.eventType === IonEventType.SCALAR) {
            writer.writeFieldName('value_text');
            this.writeTextValue(writer);
            writer.writeFieldName('value_binary');
            this.writeBinaryValue(writer);
        }
    }

    writeTextValue(writer : Writer) : void {
        let tempTextWriter = new TextWriter(new Writeable());
        this.writeIonValue(tempTextWriter);
        tempTextWriter.close();
        writer.writeString(decodeUtf8(tempTextWriter.getBytes()));
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
            this.fieldName === expected.fieldName &&
            this.depth === expected.depth &&
            this.annotationEquals(expected.annotations) &&
            this.valueEquals(expected)
        );
    }

    annotationEquals(expectedAnnotations : string[]) : boolean {
        if(this.annotations === expectedAnnotations) return true;
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
                return new IonEndEvent(eventType, null, null, null, depth);
        }
    }
}

class IonNullEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth, null);

    }
    valueEquals(expected : IonNullEvent) : boolean {
        return expected instanceof IonNullEvent && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeNull(this.ionType.bid);
    }
}

class IonIntEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : number) {
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonIntEvent) : boolean {
        return expected instanceof IonIntEvent && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeInt(this.ionValue);
    }
}

class IonBoolEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : boolean) {
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonBoolEvent) : boolean {
        return expected instanceof IonBoolEvent && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeBoolean(this.ionValue);
    }
}

class IonFloatEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : number){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonFloatEvent) : boolean {
        if(isNaN(this.ionValue) && isNaN(expected.ionValue)) return true;
        return expected instanceof IonFloatEvent &&  this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeFloat64(this.ionValue);
    }
}

class IonDecimalEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Decimal){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonDecimalEvent) : boolean {
        return expected instanceof IonDecimalEvent && this.ionValue.equals(expected.ionValue);
    }
    writeIonValue(writer : Writer) : void {
        writer.writeDecimal(this.ionValue);
    }
}

class IonSymbolEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        //if(ionValue === '$ion_1_0') ionValue = "$ion_user_value::" + ionValue;
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonSymbolEvent) : boolean {
        return expected instanceof IonSymbolEvent && this.ionValue === expected.ionValue;//will need to change when symboltokens are introduced.
    }
    writeIonValue(writer : Writer) : void{
        writer.writeSymbol(this.ionValue.toString());//if symboltokens text is unknown we will need to write out symboltable
    }

}

class IonStringEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonStringEvent) : boolean {
        return expected instanceof IonStringEvent && this.ionValue === expected.ionValue;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeString(this.ionValue);
    }

}

class IonTimestampEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Timestamp){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);

    }
    valueEquals(expected : IonTimestampEvent) : boolean {
        return expected instanceof IonTimestampEvent && this.ionValue.equals(expected.ionValue);
    }
    writeIonValue(writer : Writer) : void {
        writer.writeTimestamp(this.ionValue);
    }
}

class IonBlobEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : string){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonBlobEvent) : boolean {
        if(!(expected instanceof IonBlobEvent)) return false;
        if(this.ionValue.length !== expected.ionValue.length) return false;
        for(let i = 0; i < this.ionValue.length; i++){
            if(this.ionValue[i] !== expected.ionValue[i]) return false;
        }
        return true;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeBlob(this.ionValue);
    }
}

class IonClobEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number, ionValue : Uint8Array){
        super(eventType , ionType, fieldName, annotations, depth, ionValue);
    }
    valueEquals(expected : IonClobEvent) : boolean {//can there be byte padding?
        if(!(expected instanceof IonClobEvent)) return false;
        for(let i = 0; i < this.ionValue.length; i++){
            if(this.ionValue[i] !== expected.ionValue[i]) return false;
        }
        return true;
    }
    writeIonValue(writer : Writer) : void {
        writer.writeClob(this.ionValue);
    }
}

abstract class AbsIonContainerEvent extends AbstractIonEvent{

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
        return expected instanceof IonStructEvent && this.structsEqual(this.ionValue, expected.ionValue) && this.structsEqual(expected.ionValue, this.ionValue);
    }

    //for each actual ionEvent, searches for an equivalent expected ionEvent,
    //equivalent pairings remove the paired expectedEvent from the search space.
    structsEqual(actualEvents : AbstractIonEvent[], expectedEvents : AbstractIonEvent[]) : boolean {
        let matchFound : boolean = true;
        let paired : boolean[] = new Array<boolean>(expectedEvents.length);
        for (let i : number = 0; matchFound && i < actualEvents.length; i++) {
            matchFound = false;
            for (let j : number = 0; !matchFound && j < expectedEvents.length; j++) {
                if (!paired[j]) {
                    matchFound = actualEvents[i].equals(expectedEvents[j]);
                    if (matchFound && actualEvents[i].eventType === IonEventType.CONTAINER_START) {
                        for (let k = j; k < expectedEvents[j].ionValue.length; k++) {
                            paired[k] = true;
                        }
                        i += actualEvents[i].ionValue.length;
                    }
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
        if(!(expected instanceof IonListEvent)) return false;
        if(this.ionValue.length !== expected.ionValue.length) return false;
        for(let i : number = 0; i < this.ionValue.length; i++){
            if(!this.ionValue[i].equals(expected.ionValue[i])){
                return false;
            } else if(this.ionValue[i].eventType === IonEventType.CONTAINER_START) {
                i += this.ionValue[i].length;
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
        if(!(expected instanceof IonSexpEvent)) return false;
        for(let i : number = 0; i < this.ionValue.length; i++){
            if(!this.ionValue[i].equals(expected.ionValue[i])){
                return false;
            } else if(this.ionValue[i].eventType === IonEventType.CONTAINER_START) {
                i += this.ionValue[i].length;
            }
        }
        return true;
    }
}

class IonEndEvent extends AbstractIonEvent {
    constructor(eventType : IonEventType, ionType : IonType, fieldName : string, annotations : string[], depth : number){
        super(eventType , ionType, fieldName, annotations, depth, undefined);

    }
    valueEquals(expected : IonEndEvent) {
        return expected instanceof IonEndEvent
            && this.ionValue === expected.ionValue; //should be null === null if they are both end events.
    }

    writeIonValue(writer : Writer) : void {
        //no op
    }
}

