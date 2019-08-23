/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { IonType } from "./IonType";
import { Timestamp } from "./IonTimestamp";

/**
 * Reads a sequence of Ion values.
 */
export interface Reader {
  booleanValue: () => boolean;
  byteValue: () => Uint8Array;
  decimalValue: () => Decimal;
  depth: () => number;
  fieldName: () => string;
  isNull: () => boolean;
  next: () => IonType;
  numberValue: () => number;
  stepIn: () => void;
  stepOut: () => void;
  stringValue: () => string;
  timestampValue: () => Timestamp;
  type: () => IonType;
  value: () => any;
  annotations: () => string[];//TODO implement symboltokens to replace string[] https://github.com/amzn/ion-js/issues/121
}
