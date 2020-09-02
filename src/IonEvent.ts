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

import {IonTypes} from "./IonTypes";
import {Decimal} from "./IonDecimal";
import {Timestamp} from "./IonTimestamp";
import {IonType} from "./IonType";
import {Writer} from "./IonWriter";
import {TextWriter} from "./IonTextWriter";
import {Writeable} from "./IonWriteable";
import {BinaryWriter} from "./IonBinaryWriter";
import {defaultLocalSymbolTable} from "./IonLocalSymbolTable";
import {decodeUtf8} from "./IonUnicode";
import JSBI from "jsbi";
import {ComparisonResult, ComparisonResultType} from "./Cli";

export enum IonEventType {
    SCALAR = 0,
    CONTAINER_START = 1,
    CONTAINER_END = 2,
    SYMBOL_TABLE = 3,
    STREAM_END = 4
}


export interface IonEvent {
    eventType: IonEventType;
    ionType: IonType | null;
    fieldName: string | null;
    annotations: string[];
    depth: number;
    ionValue: any;

    write(writer: Writer): void;

    equals(expected: IonEvent): boolean;

    compare(expected: IonEvent): ComparisonResult;

    writeIonValue(writer: Writer): void;
}

abstract class AbstractIonEvent implements IonEvent {
    eventType: IonEventType;
    ionType: IonType | null;
    fieldName: string | null;
    annotations: string[];
    depth: number;
    ionValue: any;


    constructor(eventType: IonEventType, ionType: IonType | null, fieldName: string | null, annotations: string[], depth: number, ionValue: any) {
        this.eventType = eventType;
        this.ionType = ionType;
        this.fieldName = fieldName;
        this.annotations = annotations;
        this.depth = depth;
        this.ionValue = ionValue;
    }

    abstract writeIonValue(writer: Writer): void;

    abstract valueCompare(expected: IonEvent): ComparisonResult;

    write(writer: Writer) {
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('event_type');
        writer.writeSymbol(IonEventType[this.eventType]);
        if (this.ionType !== null) {
            writer.writeFieldName('ion_type');
            writer.writeSymbol(this.ionType.name);
        }
        if (this.fieldName !== null && this.fieldName !== undefined) {
            writer.writeFieldName('field_name');
            writer.writeString(this.fieldName);
        }
        if (this.annotations !== null) {
            writer.writeFieldName('annotations');
            this.writeAnnotations(writer);
        }
        if (this.eventType === IonEventType.SCALAR) {
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
        writer.stepOut();
    }

    writeAnnotations(writer: Writer) {
        if (this.annotations === undefined) {
            writer.writeNull(IonTypes.LIST);
            return;
        }
        writer.stepIn(IonTypes.LIST);
        for (let i = 0; i < this.annotations.length; i++) {
            writer.stepIn(IonTypes.STRUCT);
            writer.writeFieldName("text");
            writer.writeString(this.annotations[i]);
            writer.stepOut();
        }
        writer.stepOut();
    }

    writeSymbolToken(writer: Writer, text: string) {
        //should be a struct with text/import descriptor?
        writer.writeSymbol(text);
    }

    writeImportDescriptor(writer) {
        writer.writeNull(IonTypes.STRUCT);
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

    writeValues(writer: Writer): void {
        if (this.eventType === IonEventType.SCALAR) {
            writer.writeFieldName('value_text');
            this.writeTextValue(writer);
            writer.writeFieldName('value_binary');
            this.writeBinaryValue(writer);
        }
    }

    writeTextValue(writer: Writer): void {
        let tempTextWriter = new TextWriter(new Writeable());
        this.writeIonValue(tempTextWriter);
        tempTextWriter.close();
        writer.writeString(decodeUtf8(tempTextWriter.getBytes()));
    }

    writeBinaryValue(writer: Writer): void {
        let tempBinaryWriter = new BinaryWriter(defaultLocalSymbolTable(), new Writeable());
        this.writeIonValue(tempBinaryWriter);
        tempBinaryWriter.close();
        let binaryBuffer = tempBinaryWriter.getBytes();
        writer.stepIn(IonTypes.LIST);
        for (let i = 0; i < binaryBuffer.length; i++) {
            writer.writeInt(binaryBuffer[i]);
        }
        writer.stepOut();
    }

    equals(expected: IonEvent): boolean {
        return this.compare(expected).result == ComparisonResultType.EQUAL;
    }

    /**
     *  compares events for equivalence and generate comparison result
     */
    compare(expected: IonEvent): ComparisonResult {
        if(this.eventType !== expected.eventType) {
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Event types don't match");
        }
        if(this.ionType !== expected.ionType) {
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Ion types don't match "
                + this.ionType?.name + " vs. " + expected.ionType?.name);
        }
        if(this.fieldName !== expected.fieldName) {
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Field names don't match "
                + this.fieldName + " vs. " + expected.fieldName);
        }
        if(this.depth !== expected.depth) {
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Event depths don't match "
                + this.depth + " vs. " + expected.depth,);
        }
        let annotationResult = this.annotationCompare(expected.annotations);
        if(annotationResult.result === ComparisonResultType.NOT_EQUAL) return annotationResult;
        let valueResult = this.valueCompare(expected);
        if(valueResult.result === ComparisonResultType.NOT_EQUAL) return valueResult;
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }

    annotationCompare(expectedAnnotations: string[]): ComparisonResult {
        if (this.annotations === expectedAnnotations) return new ComparisonResult(ComparisonResultType.EQUAL);
        if (this.annotations.length !== expectedAnnotations.length)
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "annotations length don't match"
                + this.annotations.length + " vs. " + expectedAnnotations.length);
        for (let i = 0; i < this.annotations.length; i++) {
            if (this.annotations[i] !== expectedAnnotations[i])
                return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "annotation value doesn't match"
                    + this.annotations[i] + " vs. " + expectedAnnotations[i]);
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }
}

export class IonEventFactory {

    makeEvent(eventType: IonEventType, ionType: IonType, fieldName: string | null, depth: number, annotations: string[], isNull: boolean, value: any): IonEvent {
        if (isNull) {
            return new IonNullEvent(eventType, ionType, fieldName, annotations, depth);
        }
        switch (eventType) {
            case IonEventType.SCALAR :
            case IonEventType.CONTAINER_START :
                switch (ionType) {
                    case IonTypes.BOOL : {
                        return new IonBoolEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.INT : {
                        return new IonIntEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.FLOAT : {
                        return new IonFloatEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.DECIMAL : {
                        return new IonDecimalEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.SYMBOL : {
                        return new IonSymbolEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.STRING : {
                        return new IonStringEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.TIMESTAMP : {
                        return new IonTimestampEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.BLOB : {
                        return new IonBlobEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.CLOB : {
                        return new IonClobEvent(eventType, ionType, fieldName, annotations, depth, value);
                    }
                    case IonTypes.LIST : {
                        return new IonListEvent(eventType, ionType, fieldName, annotations, depth);
                    }
                    case IonTypes.SEXP : {
                        return new IonSexpEvent(eventType, ionType, fieldName, annotations, depth);
                    }
                    case IonTypes.STRUCT : {
                        return new IonStructEvent(eventType, ionType, fieldName, annotations, depth);
                    }
                    default : {
                        throw new Error("IonType " + ionType.name + " unexpected.");
                    }
                }
            case IonEventType.SYMBOL_TABLE :
                throw new Error("symbol tables unsupported.");
            case IonEventType.CONTAINER_END :
            case IonEventType.STREAM_END :
                return new IonEndEvent(eventType, depth);
        }
    }
}

class IonNullEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number) {
        super(eventType, ionType, fieldName, annotations, depth, null);
    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonNullEvent && this.ionValue === expected.ionValue)
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeNull(this.ionType !== null ? this.ionType : IonTypes.NULL );
    }
}

class IonIntEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: number) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonIntEvent && JSBI.equal(this.ionValue, expected.ionValue))
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeInt(this.ionValue);
    }
}

class IonBoolEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: boolean) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonBoolEvent && this.ionValue === expected.ionValue)
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeBoolean(this.ionValue);
    }
}

class IonFloatEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: number) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (isNaN(this.ionValue) && isNaN(expected.ionValue)) return new ComparisonResult(ComparisonResultType.EQUAL);
        if (expected instanceof IonFloatEvent && this.ionValue === expected.ionValue)
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeFloat64(this.ionValue);
    }
}

class IonDecimalEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: Decimal) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonDecimalEvent && this.ionValue.equals(expected.ionValue))
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeDecimal(this.ionValue);
    }
}

class IonSymbolEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: string) {
        //if(ionValue === '$ion_1_0') ionValue = "$ion_user_value::" + ionValue;
        super(eventType, ionType, fieldName, annotations, depth, ionValue);
    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonSymbolEvent && this.ionValue === expected.ionValue)
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }
    writeIonValue(writer: Writer): void {
        writer.writeSymbol(this.ionValue);//if symboltokens text is unknown we will need to write out symboltable
    }

}

class IonStringEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: string) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonStringEvent && this.ionValue === expected.ionValue)
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeString(this.ionValue);
    }

}

class IonTimestampEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: Timestamp) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);

    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (expected instanceof IonTimestampEvent && this.ionValue.equals(expected.ionValue))
            return new ComparisonResult(ComparisonResultType.EQUAL);
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        writer.writeTimestamp(this.ionValue);
    }
}

class IonBlobEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: string) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);
    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (!(expected instanceof IonBlobEvent)) return new ComparisonResult(ComparisonResultType.NOT_EQUAL);
        if (this.ionValue.length !== expected.ionValue.length)
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Blob length don't match");
        for (let i = 0; i < this.ionValue.length; i++) {
            if (this.ionValue[i] !== expected.ionValue[i])
                return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue[i] + " vs. " + expected.ionValue[i]);
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }

    writeIonValue(writer: Writer): void {
        writer.writeBlob(this.ionValue);
    }
}

class IonClobEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number, ionValue: Uint8Array) {
        super(eventType, ionType, fieldName, annotations, depth, ionValue);
    }

    valueCompare(expected: IonEvent): ComparisonResult {
        if (!(expected instanceof IonClobEvent)) return new ComparisonResult(ComparisonResultType.NOT_EQUAL);
        for (let i = 0; i < this.ionValue.length; i++) {
            if (this.ionValue[i] !== expected.ionValue[i])
                return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue[i] + " vs. " + expected.ionValue[i]);
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }

    writeIonValue(writer: Writer): void {
        writer.writeClob(this.ionValue);
    }
}

abstract class AbsIonContainerEvent extends AbstractIonEvent {

    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number) {
        super(eventType, ionType, fieldName, annotations, depth, null);
    }

    abstract valueCompare(expected: AbsIonContainerEvent);

    writeIonValue(writer: Writer): void {
        //no op;
    }
}

class IonStructEvent extends AbsIonContainerEvent {//no embed support as of yet.
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number) {
        super(eventType, ionType, fieldName, annotations, depth);

    }

    //two way equivalence between the structEvents, they must have the exact same number of equivalent elements.
    valueCompare(expected: IonStructEvent): ComparisonResult {
        if(!(expected instanceof IonStructEvent)) {
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Event types don't match", );
        }
        if(this.ionValue.length !== expected.ionValue.length)
            return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Struct length don't match");
        return this.structsCompare(this.ionValue, expected.ionValue);
    }

    //for each actual ionEvent, searches for an equivalent expected ionEvent,
    //equivalent pairings remove the paired expectedEvent from the search space.
    structsCompare(actualEvents: AbstractIonEvent[], expectedEvents: AbstractIonEvent[]): ComparisonResult {
        let matchFound:  ComparisonResult = new ComparisonResult(ComparisonResultType.EQUAL);
        let paired: boolean[] = new Array<boolean>(expectedEvents.length);
        for (let i: number = 0; matchFound && i < actualEvents.length; i++) {
            matchFound.result = ComparisonResultType.NOT_EQUAL;
            for (let j: number = 0; matchFound.result == ComparisonResultType.NOT_EQUAL && j < expectedEvents.length; j++) {
                if (!paired[j]) {
                    let child = actualEvents[i];
                    let expectedChild = expectedEvents[j];
                    matchFound = child.compare(expectedChild);
                    if (matchFound.result == ComparisonResultType.EQUAL) paired[j] = true;
                    if (matchFound.result == ComparisonResultType.EQUAL && child.eventType === IonEventType.CONTAINER_START) {
                        for (let k = j + 1; k < expectedChild.ionValue.length; k++) {
                            paired[k] = true;
                        }
                        i += child.ionValue.length;
                    }
                }
            }
        }
        // set matchFound to the first pair that didn't find a matching field if any
        for(let i: number = 0; i < paired.length; i++) {
            if(!paired[i]) {
                matchFound = new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Didn't find matching field for " + expectedEvents[i].fieldName);
                break;
            }
        }
        return matchFound;
    }

}

class IonListEvent extends AbsIonContainerEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number) {
        super(eventType, ionType, fieldName, annotations, depth);

    }

    valueCompare(expected: IonListEvent): ComparisonResult {
        if (!(expected instanceof IonListEvent)) return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "Event types don't match");
        let container = this.ionValue;
        let expectedContainer = expected.ionValue;
        if (container.length !== expectedContainer.length) return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "List length don't match");
        for (let i: number = 0; i < container.length; i++) {
            let child = container[i];
            if (child.compare(expectedContainer[i]).result == ComparisonResultType.NOT_EQUAL) {
                return new ComparisonResult(ComparisonResultType.NOT_EQUAL, child.ionValue + " vs. " +
                    expectedContainer[i].ionValue, i + 1, i + 1);
            } else if (child.eventType === IonEventType.CONTAINER_START) {
                i += child.ionValue.length;
            }
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }
}

class IonSexpEvent extends AbsIonContainerEvent {
    constructor(eventType: IonEventType, ionType: IonType, fieldName: string | null, annotations: string[], depth: number) {
        super(eventType, ionType, fieldName, annotations, depth);

    }

    valueCompare(expected: IonSexpEvent): ComparisonResult {
        if (!(expected instanceof IonSexpEvent)) return new ComparisonResult(ComparisonResultType.NOT_EQUAL,"Event types don't match");
        let container = this.ionValue;
        let expectedContainer = expected.ionValue;
        if (container.length !== expectedContainer.length) return new ComparisonResult(ComparisonResultType.NOT_EQUAL, "S-expression length don't match");
        for (let i: number = 0; i < container.length; i++) {
            let child = container[i];
            let eventResult = child.compare(expectedContainer[i]).result;
            if (eventResult == ComparisonResultType.NOT_EQUAL) {
                return eventResult;
            } else if (child.eventType === IonEventType.CONTAINER_START) {
                i += child.ionValue.length;
            }
        }
        return new ComparisonResult(ComparisonResultType.EQUAL);
    }
}

class IonEndEvent extends AbstractIonEvent {
    constructor(eventType: IonEventType, depth: number) {
        super(eventType, null, null, [], depth, undefined);

    }

    valueCompare(expected: IonEndEvent): ComparisonResult {
        //should be null === null if they are both end events.
        if(expected instanceof IonEndEvent && this.ionValue === expected.ionValue) {
            return new ComparisonResult(ComparisonResultType.EQUAL);
        }
        return new ComparisonResult(ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }

    writeIonValue(writer: Writer): void {
        //no op
    }
}

