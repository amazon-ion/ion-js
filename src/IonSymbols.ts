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
import { Catalog } from "./IonCatalog";
import { getSystemSymbolTableImport } from "./IonSystemSymbolTable";
import { Import } from "./IonImport";
import { LocalSymbolTable } from "./IonLocalSymbolTable";
import { Reader } from "./IonReader";
import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { SubstituteSymbolTable } from "./IonSubstituteSymbolTable";

export const ion_symbol_table = "$ion_symbol_table";
export const ion_symbol_table_sid = 3;

const empty_struct = {};

function load_imports(reader: Reader, catalog: Catalog) : Import {
  let import_: Import = getSystemSymbolTableImport();

  reader.stepIn(); // into the array
  while (reader.next()) {
    reader.stepIn(); // into the struct of 1 import

    let name: string;
    let version: number = 1;
    let maxId: number;

    while (reader.next()) {
      switch(reader.fieldName()) {
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

    if (version < 1) {
      version = 1;
    }

    if (name && name !== "$ion") {
      let symbolTable: SharedSymbolTable = catalog.getVersion(name, version);
      if (!symbolTable) {
        if (maxId === undefined) {
          throw new Error(`No exact match found when trying to import symbol table ${name} version ${version}`);
        } else {
          symbolTable = catalog.getTable(name);
        }
      }

      if (!symbolTable) {
        symbolTable = new SubstituteSymbolTable(maxId);
      }

      import_ = new Import(import_, symbolTable, maxId);
    }

    reader.stepOut(); // out of one import struct
  }
  reader.stepOut(); // out of the array of imports

  return import_;
}

function load_symbols(reader: Reader) : string[] {
  let symbols: string[] = [];

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
 */
export function makeSymbolTable(catalog: Catalog, reader: Reader) : LocalSymbolTable {
    let import_: Import;
    let symbols: string[];
    let maxId: number;
    let foundSymbols : boolean = false;
    let foundImports : boolean = false;

    reader.stepIn();
    while (reader.next()) {
        switch(reader.fieldName()) {
        case "imports":
            if(foundImports) throw new Error("Multiple import fields found.");
            import_ = load_imports(reader, catalog);
            foundImports = true;
            break;
        case "symbols":
            if(foundSymbols) throw new Error("Multiple symbol fields found.");
            symbols = load_symbols(reader);
            foundSymbols = true;
            break;
        }
    }
    reader.stepOut();

    return new LocalSymbolTable(import_, symbols);
}
