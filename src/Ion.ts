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
import { LocalSymbolTable, defaultLocalSymbolTable } from "./IonLocalSymbolTable";
import { decodeUtf8 } from "./IonUnicode";

const e = {
  name: "IonError",
  where: undefined,
  msg: "error",
}


/**
 * Options object to be passed during the creation of an Ion Reader.
 * Holds the Ion catalogue @see http://amzn.github.io/ion-docs/symbols.html#the-catalog
 * and the Ion source type (i.e., binary or text) as a `string`
 */
export interface Options {
  catalog: Catalog;
  sourceType: string;
}

/**
 * Returns the `buf` type as true for binary, false for text.
 * 
 * @param buffer we want to check its type 
 * @returns either `'binary'` or `'text'`
 */
function isBinary(buf: Uint8Array) {
    for(let i = 0; i < 4; i++){
        if(buf[i] !== IVM.binary[i]) return false;
    }
  return true;
}


/**
 * Create an Ion Reader object from a currentBuffer `buf`
 *
 * @param buf the Ion data to be used by the reader. Typically a string, UTF-8 encoded buffer (text), or raw binary buffer.
 * @param options for the reader including catalog
 * @returns {Reader}
 */
export function makeReader(buf: any, catalog? : Catalog) : Reader {
    if((typeof buf) === "string"){
        return new TextReader(new StringSpan(<string>buf), catalog);
    }
    buf = new Uint8Array(buf);
    if(isBinary(buf)){
        return new BinaryReader(new BinarySpan(buf), catalog);
    } else {
        return new TextReader(new StringSpan(decodeUtf8(buf)), catalog);
    }
}

/**
 * Create a new Ion Text Writer.
 *
 * @returns {TextWriter}
 */
export function makeTextWriter() : Writer {
  return new TextWriter(new Writeable());
}

export function makePrettyWriter(indentSize?: number) : Writer {
    return new PrettyTextWriter(new Writeable(), indentSize);
}


/**
 * Create a new Ion Binary Writer. You can optionally provide a local symbol table else
 * the default local symbol table will be used.
 *
 * @param localSymbolTable to use for the new writer
 * @returns {BinaryWriter}
 */
export function makeBinaryWriter(localSymbolTable : LocalSymbolTable = defaultLocalSymbolTable()) : Writer {
  return new BinaryWriter(localSymbolTable, new Writeable());
}

export { Reader } from "./IonReader";
export { Writer } from "./IonWriter";
export { BinaryWriter } from "./IonBinaryWriter";
export { Catalog } from "./IonCatalog";
export { Decimal } from "./IonDecimal";
export { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
export { IonTypes } from "./IonTypes";
export { SharedSymbolTable } from "./IonSharedSymbolTable";
export { Precision, Timestamp } from "./IonTimestamp";
export { toBase64 } from "./IonText";
export { decodeUtf8 } from "./IonUnicode";
