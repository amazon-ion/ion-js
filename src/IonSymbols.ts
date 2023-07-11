/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { Catalog } from "./IonCatalog";
import { Import } from "./IonImport";
import { LocalSymbolTable } from "./IonLocalSymbolTable";
import { Reader } from "./IonReader";
import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { SubstituteSymbolTable } from "./IonSubstituteSymbolTable";
import { getSystemSymbolTableImport } from "./IonSystemSymbolTable";
import { IonTypes } from "./Ion";

export const ion_symbol_table = "$ion_symbol_table";
export const ion_symbol_table_sid = 3;

const empty_struct = {};

function load_imports(reader: Reader, catalog: Catalog): Import {
  let import_: Import = getSystemSymbolTableImport();

  reader.stepIn(); // into the array
  while (reader.next()) {
    reader.stepIn(); // into the struct of 1 import

    let name: string | null = null;
    let version: number | null = 1;
    let maxId: number | null = null;

    while (reader.next()) {
      switch (reader.fieldName()) {
        case "name":
          name = reader.stringValue();
          break;
        case "version":
          version = reader.numberValue();
          break;
        case "max_id":
          maxId = reader.numberValue();
      }
    }

    if (version === null || version < 1) {
      version = 1;
    }

    if (name && name !== "$ion") {
      let symbolTable: SharedSymbolTable | null = catalog.getVersion(
        name,
        version!
      );
      if (!symbolTable) {
        if (maxId === undefined) {
          throw new Error(
            `No exact match found when trying to import symbol table ${name} version ${version}`
          );
        } else {
          symbolTable = catalog.getTable(name);
        }
      }

      if (!symbolTable) {
        symbolTable = new SubstituteSymbolTable(maxId!);
      }

      import_ = new Import(import_, symbolTable!, maxId);
    }

    reader.stepOut(); // out of one import struct
  }
  reader.stepOut(); // out of the array of imports

  return import_;
}

function load_symbols(reader: Reader): (string | null)[] {
  const symbols: (string | null)[] = [];

  reader.stepIn();
  while (reader.next()) {
    symbols.push(reader.stringValue());
  }
  reader.stepOut();

  return symbols;
}

/**
 * Constructs a {LocalSymbolTable} from the given Ion {Reader}.
 *
 * @param catalog The catalog to resolve imported shared symbol tables from.
 * @param reader The Ion {Reader} over the local symbol table in its serialized form.
 * @param currentSymbolTable Current local symbol table for the reader.
 */
export function makeSymbolTable(
  catalog: Catalog,
  reader: Reader,
  currentSymbolTable: LocalSymbolTable
): LocalSymbolTable {
  let import_: Import | null = null;
  let symbols: (string | null)[] = [];
  let foundSymbols: boolean = false;
  let foundImports: boolean = false;
  let foundLstAppend: boolean = false;

  reader.stepIn();
  while (reader.next()) {
    switch (reader.fieldName()) {
      case "imports":
        if (foundImports) {
          throw new Error("Multiple import fields found.");
        }
        let ion_type = reader.type();
        if (
          ion_type === IonTypes.SYMBOL &&
          reader.stringValue() === ion_symbol_table
        ) {
          // this is a local symbol table append
          import_ = currentSymbolTable.import;
          let symbols_ = symbols;
          symbols = currentSymbolTable.symbols;
          symbols.push(...symbols_);
          foundLstAppend = true;
        } else if (ion_type === IonTypes.LIST) {
          import_ = load_imports(reader, catalog);
        } else {
          throw new Error(
            `Expected import field name to be a list or symbol found ${ion_type}`
          );
        }
        foundImports = true;
        break;
      case "symbols":
        if (foundSymbols) {
          throw new Error("Multiple symbol fields found.");
        }
        if (foundLstAppend) {
          symbols.push(...load_symbols(reader));
        } else {
          symbols = load_symbols(reader);
        }
        foundSymbols = true;
        break;
    }
  }
  reader.stepOut();

  return new LocalSymbolTable(import_, symbols);
}
