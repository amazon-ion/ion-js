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

import {Writer} from "./IonWriter";
import {IonType} from "./IonType";
import {Reader} from "./IonReader";
import {IonTypes} from "./IonTypes";

// TS workaround that avoids the need to copy all Writer method signatures into AbstractWriter
export interface AbstractWriter extends Writer {
}

export abstract class AbstractWriter implements Writer {
    protected _annotations: string[] = [];

    addAnnotation(annotation: string): void {
        if (!this._isString(annotation)) {
            throw new Error('Annotation must be of type string.');
        }
        this._annotations.push(annotation);
    }

    setAnnotations(annotations: string[]): void {
        if (annotations === undefined || annotations === null) {
            throw new Error('Annotations were undefined or null.');
        } else if (!this._validateAnnotations(annotations)) {
            throw new Error('Annotations must be of type string[].');
        } else {
            this._annotations = annotations;
        }
    }

    // This method is not part of the Writer interface, but subclasses of AbstractWriter must implement it
    // in order to use the default implementations of writeValue() and writeValues()
    protected abstract _isInStruct(): boolean

    writeValues(reader: Reader): void {
        this._writeValues(reader);
    }

    writeValue(reader: Reader): void {
        this._writeValue(reader);
    }

    protected _clearAnnotations(): void {
        this._annotations = [];
    }

    private _writeValues(reader: Reader): void {
        let type: IonType | null = reader.type();
        if (type === null) {
            type = reader.next();
        }
        while (type !== null) {
            this._writeValue(reader);
            type = reader.next();
        }
    }

    private _writeValue(reader: Reader): void {
        let type: IonType | null = reader.type();
        if (type === null) {
            return;
        }

        if (this._isInStruct()) {
            let fieldName = reader.fieldName();
            if (fieldName === null) {
                throw new Error("Cannot call writeValue() when the Writer is in a Struct but the Reader is not.");
            }
            this.writeFieldName(fieldName);
        }

        this.setAnnotations(reader.annotations());

        if (reader.isNull()) {
            this.writeNull(type);
            return;
        }

        switch (type) {
            case IonTypes.BOOL:      this.writeBoolean(reader.booleanValue()); break;
            case IonTypes.INT:       this.writeInt(reader.bigIntValue()); break;
            case IonTypes.FLOAT:     this.writeFloat64(reader.numberValue()); break;
            case IonTypes.DECIMAL:   this.writeDecimal(reader.decimalValue()); break;
            case IonTypes.TIMESTAMP: this.writeTimestamp(reader.timestampValue()); break;
            case IonTypes.SYMBOL:    this.writeSymbol(reader.stringValue()); break;
            case IonTypes.STRING:    this.writeString(reader.stringValue()); break;
            case IonTypes.CLOB:      this.writeClob(reader.byteValue()); break;
            case IonTypes.BLOB:      this.writeBlob(reader.byteValue()); break;
            case IonTypes.LIST:      this.stepIn(IonTypes.LIST); break;
            case IonTypes.SEXP:      this.stepIn(IonTypes.SEXP); break;
            case IonTypes.STRUCT:    this.stepIn(IonTypes.STRUCT); break;
            default: throw new Error('Unrecognized type ' + (type !== null ? type.name : type));
        }
        if (type.isContainer) {
            reader.stepIn();
            this._writeValues(reader);
            this.stepOut();
            reader.stepOut();
        }
    }

    private _validateAnnotations(input: string[]): boolean {
        if (!Array.isArray(input)) {
            return false;
        }
        for (let i = 0; i < input.length; i++) {
            if (!this._isString(input[i])) {
                return false;
            }
        }
        return true;
    }

    private _isString(input: string): boolean {
        return typeof input === 'string';
    }
}

