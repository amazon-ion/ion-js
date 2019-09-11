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
import { BinaryReader } from "./IonBinaryReader";
import { Catalog } from "./IonCatalog";
import { IVM } from "./IonConstants";
import { Reader } from "./IonReader";
import { StringSpan, BinarySpan } from "./IonSpan";
import { TextReader } from "./IonTextReader";
import { Writer } from "./IonWriter";
import { TextWriter } from "./IonTextWriter";
import { PrettyTextWriter } from "./IonPrettyTextWriter";
import { Writeable } from "./IonWriteable";
import { BinaryWriter } from "./IonBinaryWriter";
import { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
import { decodeUtf8 } from "./IonUnicode";

/**
 * Indicates whether the provided buffer contains binary Ion data.
 * 
 * @param buffer    The buffer of data to inspect.
 * @returns         True if the provided buffer begins with a binary Ion version marker, false otherwise.
 */
function isBinary(buffer: Uint8Array): boolean {
    if (buffer.length < 4) {
        return false;
    }
    for(let i = 0; i < 4; i++){
        if(buffer[i] !== IVM.binary[i]) return false;
    }
  return true;
}

/** Octet buffer input types for the Ion reader interface. */
export type ReaderOctetBuffer = ArrayBufferLike | ArrayLike<number>;

/** All buffer input types for the Ion reader interface. */
export type ReaderBuffer = ReaderOctetBuffer | string;

/**
 * Create an {Reader} over Ion data in a {ReaderBuffer}.
 *
 * @param buf       The Ion data to be used by the reader. Typically a string, UTF-8 encoded buffer (text), or raw
 *                  binary buffer.
 */
export function makeReader(buf: ReaderBuffer) : Reader {
    // TODO #387 make the catalog an optional parameter
    const catalog = null;
    if((typeof buf) === "string"){
        return new TextReader(new StringSpan(<string>buf), catalog);
    }
    const bufArray = new Uint8Array(buf as ReaderOctetBuffer);
    if(isBinary(bufArray)){
        return new BinaryReader(new BinarySpan(bufArray), catalog);
    } else {
        return new TextReader(new StringSpan(decodeUtf8(bufArray)), catalog);
    }
}

/** Creates a new Ion Text Writer. */
export function makeTextWriter() : Writer {
    // TODO #384 make LST an optional parameter
    return new TextWriter(new Writeable());
}

/** Creates a new Ion Text Writer with pretty printing of the text. */
export function makePrettyWriter(indentSize?: number) : Writer {
    // TODO #384 make LST an optional parameter
    return new PrettyTextWriter(new Writeable(), indentSize);
}

/** Creates a new Ion Binary Writer. */
export function makeBinaryWriter() : Writer {
    // TODO #384 make LST an optional parameter
    const localSymbolTable = defaultLocalSymbolTable();
    return new BinaryWriter(localSymbolTable, new Writeable());
}

export { Reader, ReaderScalarValue } from "./IonReader";
export { Writer } from "./IonWriter";
export { Catalog } from "./IonCatalog";
export { Decimal } from "./IonDecimal";
export { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
export { IonType } from "./IonType";
export { IonTypes } from "./IonTypes";
export { SharedSymbolTable } from "./IonSharedSymbolTable";
export { TimestampPrecision, Timestamp } from "./IonTimestamp";
export { toBase64 } from "./IonText";
export { decodeUtf8 } from "./IonUnicode";
