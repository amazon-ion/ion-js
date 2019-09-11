/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import {Writer} from "./IonWriter";
import {IonType} from "./IonType";
import {Reader} from "./IonReader";
import {IonTypes} from "./IonTypes";
import {_validateAnnotations, _isString} from "./util"

// TS workaround that avoids the need to copy all Writer method signatures into AbstractWriter
export interface AbstractWriter extends Writer {}

export abstract class AbstractWriter implements Writer {
    protected _annotations = [];

    addAnnotation(annotation: string): void {
        if(!_isString(annotation)) {
            throw new Error('Annotation must be of type string.');
        }
        this._annotations.push(annotation);
    }

    setAnnotations(annotations: string[]): void {
        if(annotations === undefined || annotations === null){
            this._annotations = [];
        } else if (!_validateAnnotations(annotations)) {
            throw new Error('Annotations must be of type string[].');
        } else {
            this._annotations = annotations;
        }
    }

    protected _clearAnnotations(): void {
        this._annotations = [];
    }

    writeValues(reader: Reader): void {
        this._writeValues(reader);
    }

    private _writeValues(reader: Reader, _depth = 0): void {
        let type: IonType = reader.type();
        if (type === null) {
            type = reader.next();
        }
        while (type !== null) {
            this._writeValue(reader, _depth);
            type = reader.next();
        }
    }

    writeValue(reader: Reader): void {
        this._writeValue(reader);
    }

    private _writeValue(reader: Reader, _depth = 0): void {
        let type: IonType = reader.type();
        if (type === null) {
            return;
        }
        if (_depth > 0) {
            if (reader.fieldName() != null) {
                this.writeFieldName(reader.fieldName());
            }
        }
        this.setAnnotations(reader.annotations());
        if (reader.isNull()) {
            this.writeNull(type);
        } else {
            switch (type) {
                case IonTypes.BOOL:      this.writeBoolean(reader.booleanValue()); break;
                case IonTypes.INT:       this.writeInt(reader.numberValue()); break;
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
                this._writeValues(reader, _depth + 1);
                this.stepOut();
                reader.stepOut();
            }
        }
    }
}

