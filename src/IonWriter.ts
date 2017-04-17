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
import { Decimal } from "./IonDecimal";
import { Timestamp } from "./IonTimestamp";
import { TypeCodes } from "./IonBinary";

/**
 * Writes values in the Ion text or binary formats.
 */
export interface Writer {
  writeBlob(value: number[], annotations?: string[]) : void;
  writeBoolean(value: boolean, annotations?: string[]) : void;
  writeClob(value: number[], annotations?: string[]) : void;
  writeDecimal(value: Decimal, annotations?: string[]) : void;
  writeFieldName(fieldName: string) : void;
  writeFloat32(value: number, annotations?: string[]) : void;
  writeFloat64(value: number, annotations?: string[]) : void;
  writeInt(value: number, annotations?: string[]) : void;
  writeList(annotations?: string[], isNull?: boolean) : void;
  writeNull(type_: TypeCodes, annotations?: string[]) : void;
  writeSexp(annotations?: string[], isNull?: boolean) : void;
  writeString(value: string, annotations?: string[]) : void;
  writeStruct(annotations?: string[], isNull?: boolean) : void;
  writeSymbol(value: string, annotations?: string[]) : void;
  writeTimestamp(value: Timestamp, annotations?: string[]) : void;
  getBytes(): number[];

  close() : void;
  endContainer() : void;
}
