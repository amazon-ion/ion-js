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
import { BinarySpan, StringSpan } from "./IonSpan";
import { TextReader } from "./IonTextReader";
import { InvalidArgumentError } from "./IonErrors";
import { Writer } from "./IonWriter";
import { TextWriter } from "./IonTextWriter";
import { Writeable } from "./IonWriteable";
import { BinaryWriter } from "./IonBinaryWriter";
import { LocalSymbolTable, defaultLocalSymbolTable } from "./IonLocalSymbolTable";
import { ParserTextRaw } from "./IonParserTextRaw";

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
  raw_tokens: boolean;
}

/**
 * Returns the `buf` type as binary or text.
 *
 * @param buffer we want to check its type
 * @returns either `'binary'` or `'text'`
 */
function get_buf_type(buf: any) {
  let firstByte = typeof(buf) === 'string'
    ? buf.charCodeAt(0)
    : buf[0];
  return (firstByte === IVM.binary[0]) ? 'binary' : 'text';
}

function makeBinaryReader(span: BinarySpan, options: Options) : BinaryReader {
  return new BinaryReader(span, options && options.catalog);
}

function makeTextReader(span: StringSpan, options: Options) : TextReader {
  return new TextReader(span, options && options.catalog, options && options.raw_tokens);
}

export function makeTextTokenizer(source: string) : ParserTextRaw {
  let span = new StringSpan(source);
  let reader = new TextReader(span, undefined /* catalog */, true /* raw */);
  return reader.raw_parser();
}

/**
 * Create an Ion Reader object from a buffer `buf` and `options`.
 *
 *
 * @param buf the Ion data to be used by the reader. Typically a string.
 * @param options for the reader including catalogue and type of source, e.g., `'binary'` or `'text'`
 * @returns {Reader}
 */
export function makeReader(buf: any, options: Options) : Reader {
  let stype = options && isSourceType(options.sourceType)
    ? options.sourceType
    : get_buf_type(buf);
  let reader: Reader = (stype === 'binary')
    ? makeBinaryReader(new BinarySpan(buf), options)
    : makeTextReader(new StringSpan(buf), options);
  return reader;
}


function isSourceType(val) : boolean {
  return val === 'text' || val === 'binary';
}

/**
 * Create a new Ion Text Writer.
 *
 * @returns {TextWriter}
 */
export function makeTextWriter() : Writer {
  return new TextWriter(new Writeable());
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

//export { BinaryWriter } from "./IonBinaryWriter";
export { Catalog } from "./IonCatalog";
export { Decimal } from "./IonDecimal";
export { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
export { IonTypes } from "./IonTypes";
export { Precision } from "./IonPrecision";
export { SharedSymbolTable } from "./IonSharedSymbolTable";
export { Timestamp } from "./IonTimestamp";
export { toBase64 } from "./IonText";
export { TypeCodes } from "./IonBinary";
export { getIonType } from "./IonParserTextRaw";
