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
import { Import } from "./IonImport";
import { Index } from "./IonIndex";
import { Symbol } from "./IonSymbol";
import { SymbolTable } from "./IonSymbolTable";

export class LocalSymbolTable implements SymbolTable {
  private symbols: string[] = [];
  private index: Index = {};
  private maxId: number = 0;

  constructor(catalog: Catalog, systemSymbolTable: SymbolTable, imports: Import[] = [], symbols: string[] = []) {
    for (let symbol_ of systemSymbolTable.getSymbols()) {
      this.addSymbol(symbol_);
    }

    for (let import_ of imports) {
      let symbolTable: SymbolTable = catalog.findSymbolTable(import_);
      let importMaxId = import_.getMaxId() || symbolTable.getSymbols().length;
      for (let i: number = 0; i < importMaxId; i++) {
        let symbol_: string = symbolTable.getSymbols()[i];
        if (typeof(symbol_) != 'undefined') {
          this.addSymbol(symbol_);
        } else {
          this.maxId++;
        }
      }
    }

    for (let symbol_ of symbols) {
      this.addSymbol(symbol_);
    }
  }

  private addSymbol(symbol_: string) : number {
    let currentIndex: number = this.index[symbol_];
    if (typeof(currentIndex) != 'undefined') {
      return currentIndex;
    }
    let index = ++this.maxId;
    this.symbols[index] = symbol_;
    this.index[symbol_] = index;
    return index;
  }

  getSymbols() : string[] {
    return this.symbols;
  }

  getId(symbol_: string) : number {
    return this.index[symbol_];
  }

  getSymbol(id: number): string {
    return this.symbols[id];
  }
}
