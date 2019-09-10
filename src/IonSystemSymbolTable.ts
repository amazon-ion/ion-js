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

/**
 * @file Helper methods for obtaining the system symbol table or its Import.
 * @see https://amzn.github.io/ion-docs/docs/symbols.html#system-symbols
 */
import { Import } from "./IonImport";
import { SharedSymbolTable } from "./IonSharedSymbolTable";

const systemSymbolTable: SharedSymbolTable = new SharedSymbolTable(
  "$ion",
  1,
  [
    "$ion",
    "$ion_1_0",
    "$ion_symbol_table",
    "name",
    "version",
    "imports",
    "symbols",
    "max_id",
    "$ion_shared_symbol_table"
  ]
);

export function getSystemSymbolTable() : SharedSymbolTable {
  return systemSymbolTable;
}

export function getSystemSymbolTableImport() : Import {
  return new Import(null, getSystemSymbolTable());
}
