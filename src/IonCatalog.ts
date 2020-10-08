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

import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { getSystemSymbolTable } from "./IonSystemSymbolTable";

interface SymbolTableIndex {
  [name: string]: SharedSymbolTable[];
}

function byVersion(x: SharedSymbolTable, y: SharedSymbolTable): number {
  return x.version - y.version;
}

/**
 * A catalog holds available shared symbol tables and always includes the system symbol table.
 * @see https://amzn.github.io/ion-docs/docs/symbols.html#the-catalog
 */
export class Catalog {
  private symbolTables: SymbolTableIndex;

  /** Creates a catalog containing only the system symbol table. */
  constructor() {
    this.symbolTables = {};
    this.add(getSystemSymbolTable());
  }

  /** Adds a new shared symbol table to this catalog. */
  add(symbolTable: SharedSymbolTable): void {
    if (symbolTable.name === undefined || symbolTable.name === null)
      throw new Error("SymbolTable name must be defined.");
    const versions = this.symbolTables[symbolTable.name];
    if (versions === undefined) this.symbolTables[symbolTable.name] = [];
    this.symbolTables[symbolTable.name][symbolTable.version] = symbolTable;
  }

  /**
   * Returns a symbol table by name and version.
   *
   * @return The symbol table or `null` if it does not exist in the {Catalog}.
   */
  getVersion(name: string, version: number): SharedSymbolTable | null {
    const tables: SharedSymbolTable[] = this.symbolTables[name];
    if (!tables) return null;
    let table = tables[version];
    if (!table) table = tables[tables.length];
    return table ? table : null;
  }

  /**
   * Retrieves the latest version of a symbol table by name.
   *
   * @return The symbol table or `null` if it does not exist in the {Catalog}.
   */
  getTable(name: string): SharedSymbolTable | null {
    const versions = this.symbolTables[name];
    if (versions === undefined) return null;
    return versions[versions.length - 1];
  }
}
