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
import { SharedSymbolTable } from "./IonSharedSymbolTable";

/**
 * A special case of shared symbol table whose entries are all undefined. Used in certain cases
 * when an import cannot be satisfied by the current catalog.
 * @see http://amznlabs.github.io/ion-docs/symbols.html#imports
 */
export class SubstituteSymbolTable extends SharedSymbolTable {
  constructor(length: number) {
    super(null, undefined, new Array(length));
  }
}
