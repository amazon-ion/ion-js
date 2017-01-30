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
import { Span } from "./IonSpan";
import { TextReader } from "./IonTextReader";

const e = {
  name: "IonError",
  where: undefined,
  msg: "error",
}

interface Options {
  catalog: Catalog;
  sourceType: string;
}

function get_buf_type(buf: Span) {
  var firstByte = buf.valueAt(0);
  return (firstByte === IVM.binary[0]) ? 'binary' : 'text';
}

function makeBinaryReader(span: Span, options: Options) : BinaryReader {
  return new BinaryReader(span, options && options.catalog);
}

function makeTextReader(span: Span, options: Options) : TextReader {
  return new TextReader(span, options && options.catalog);
}

export function makeReader(buf: Span, options: Options) : Reader {
  var stype =  options && (typeof options.sourceType === 'undefined')
                ? options.sourceType
                : get_buf_type(buf);
  let reader: Reader = (stype === 'binary')
             ? makeBinaryReader(buf, options)
             : makeTextReader(buf, options);
  return reader;
}

export { BinaryWriter } from "./IonBinaryWriter";
export { Catalog } from "./IonCatalog";
export { Decimal } from "./IonDecimal";
export { defaultLocalSymbolTable } from "./IonLocalSymbolTable";
export { encodeUtf8 } from "./IonUnicode";
export { getBits } from "./IonBinary";
export { getSystemSymbolTable } from "./IonSystemSymbolTable";
export { getSystemSymbolTableImport } from "./IonSystemSymbolTable";
export { Import } from "./IonImport";
export { IonTypes } from "./IonTypes";
export { isIdentifier } from "./IonText";
export { LocalSymbolTable } from "./IonLocalSymbolTable";
export { LowLevelBinaryWriter } from "./IonLowLevelBinaryWriter";
export { makeSpan } from "./IonSpan";
export { NullNode } from "./IonBinaryWriter";
export { Precision } from "./IonPrecision";
export { SharedSymbolTable } from "./IonSharedSymbolTable";
export { TextWriter } from "./IonTextWriter";
export { Timestamp } from "./IonTimestamp";
export { toBase64 } from "./IonText";
export { TypeCodes } from "./IonBinary";
export { Writeable } from "./IonWriteable";
