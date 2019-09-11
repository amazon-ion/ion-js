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

import {IonTypes} from "./IonTypes";
import {IonType} from "./IonType";
import {Reader as IonReader} from "./IonReader";
import {Writer as IonWriter} from "./IonWriter";

/**
 * Returns -1 if x is negative (including -0); otherwise returns 1.
 */
export function _sign(x: number): number {
    return (x < 0 || (x === 0 && (1 / x) === -Infinity)) ? -1 : 1
}

/**
 * Writes a reader's current value and all following values until the end
 * of the current container.  If there's no current value then this method
 * calls Reader.next() to get started.
 */
export function _writeValues(reader: IonReader, writer: IonWriter, _depth = 0): void {
    let type: IonType = reader.type();
    if (type === null) {
        type = reader.next();
    }
    while (type !== null) {
        _writeValue(reader, writer, _depth);
        type = reader.next();
    }
}

/**
 * Writes the current value from a reader.
 */
export function _writeValue(reader: IonReader, writer: IonWriter, _depth = 0): void {
    let type: IonType = reader.type();
    if (type === null) {
        return;
    }
    if (_depth > 0) {
        if (reader.fieldName() != null) {
            writer.writeFieldName(reader.fieldName());
        }
    }
    writer.setAnnotations(reader.annotations());
    if (reader.isNull()) {
        writer.writeNull(type);
    } else {
        switch (type) {
            case IonTypes.BOOL:      writer.writeBoolean(reader.booleanValue()); break;
            case IonTypes.INT:       writer.writeInt(reader.numberValue()); break;
            case IonTypes.FLOAT:     writer.writeFloat64(reader.numberValue()); break;
            case IonTypes.DECIMAL:   writer.writeDecimal(reader.decimalValue()); break;
            case IonTypes.TIMESTAMP: writer.writeTimestamp(reader.timestampValue()); break;
            case IonTypes.SYMBOL:    writer.writeSymbol(reader.stringValue()); break;
            case IonTypes.STRING:    writer.writeString(reader.stringValue()); break;
            case IonTypes.CLOB:      writer.writeClob(reader.byteValue()); break;
            case IonTypes.BLOB:      writer.writeBlob(reader.byteValue()); break;
            case IonTypes.LIST:      writer.stepIn(IonTypes.LIST); break;
            case IonTypes.SEXP:      writer.stepIn(IonTypes.SEXP); break;
            case IonTypes.STRUCT:    writer.stepIn(IonTypes.STRUCT); break;
            default: throw new Error('Unrecognized type ' + (type !== null ? type.name : type));
        }
        if (type.isContainer) {
            reader.stepIn();
            _writeValues(reader, writer, _depth + 1);
            writer.stepOut();
            reader.stepOut();
        }
    }
}

/**
 * Returns false if v is undefined or null; otherwise true.
 * @private
 */
export function _hasValue(v: any): boolean {
    return v !== undefined && v !== null;
}

