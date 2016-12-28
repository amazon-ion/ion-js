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
import { Import } from "./IonImport";
import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { SymbolTable } from "./IonSymbolTable";

export class Catalog {
  private symbolTables: SharedSymbolTable[] = [];

  addSymbolTable(symbolTable: SharedSymbolTable) : void {
    this.symbolTables.push(symbolTable);
  }

  findSymbolTable(import_: Import) : SymbolTable {
    let bestMatch: SharedSymbolTable;
    for (let symbolTable of this.symbolTables) {
      if (import_.getName() == symbolTable.getName()) {
        let exactMatch: boolean = import_.getVersion() == symbolTable.getVersion();
        if (exactMatch) {
          return symbolTable;
        }

        if (typeof(bestMatch) == 'undefined') {
          bestMatch = symbolTable;
        } else if (bestMatch.getVersion() < symbolTable.getVersion()) {
          bestMatch = symbolTable;
        }
      }
    }

    if (typeof(bestMatch) != 'undefined') {
      if (typeof(import_.getMaxId()) == 'undefined') {
        throw new Error(`Cannot use inexact match for import ${import_.getName()} with undefined max id`);
      }
      return bestMatch;
    }

    if (typeof(import_.getMaxId()) == 'undefined') {
      throw new Error(`Cannot create substitute symbol table for missing import ${import_.getName()} with undefined max id`);
    }
    return new SubstituteSymbolTable(import_.getMaxId());
  }
}

class SubstituteSymbolTable implements SymbolTable {
  private symbols: string[];

  constructor(size: number) {
    this.symbols = new Array(size);
  }

  getSymbols() : string[] {
    return this.symbols;
  }

  getSymbol(id: number) : string {
    return undefined;
  }
}
