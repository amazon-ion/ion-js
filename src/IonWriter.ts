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
import {Decimal} from "./IonDecimal";
import {IonType} from "./IonType";
import {Reader} from "./IonReader";
import {Timestamp} from "./IonTimestamp";

/**
 * Writes values in the Ion text or binary formats.
 */
export interface Writer {
  writeBlob(value: Uint8Array) : void;
  writeBoolean(value: boolean) : void;
  writeClob(value: Uint8Array) : void;
  writeDecimal(value: Decimal) : void;
  writeFieldName(fieldName: string) : void;
  writeFloat32(value: number) : void;
  writeFloat64(value: number) : void;
  writeInt(value: number) : void;
  writeNull(type: IonType) : void;
  writeString(value: string) : void;
  writeSymbol(value: string) : void;
  writeTimestamp(value: Timestamp) : void;
  stepIn(type: IonType) : void;
  stepOut() : void;
  getBytes(): Uint8Array;

  /**
   * Adds an annotation to the list of annotations to be used when
   * writing the next value.
   */
  addAnnotation(annotation: string) : void;

  /**
   * Specifies the list of annotations to be used when writing
   * the next value.
   */
  setAnnotations(annotations: string[]) : void;

  close() : void;

  /**
   * Writes a reader's current value and all following values until the end
   * of the current container.  If there's no current value then this method
   * calls {@link next()} to get started.
   */
  writeValues(reader: Reader) : void;
}
