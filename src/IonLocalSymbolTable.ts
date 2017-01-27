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
import { getSystemSymbolTableImport } from "./IonSystemSymbolTable";
import { Import } from "./IonImport";
import { isNullOrUndefined } from "./IonUtilities";
import { isUndefined } from "./IonUtilities";
import { SymbolIndex } from "./IonSymbolIndex";

export function defaultLocalSymbolTable() : LocalSymbolTable {
  return new LocalSymbolTable(getSystemSymbolTableImport());
}

export class LocalSymbolTable  {
  private import_: Import;
  private offset: number;
  private symbols: string[] = [];
  private index: SymbolIndex = {};

  constructor(import_: Import = getSystemSymbolTableImport(), symbols: string[] = []) {
    this.import_ = import_;
    this.offset = import_.offset + import_.getLength();

    for (let symbol_ of symbols) {
      this.addSymbol(symbol_);
    }
  }

  getSymbolId(symbol_: string) : number {
    return this.import_.getSymbolId(symbol_)
      || this.index[symbol_];
  }

  addSymbol(symbol_: string) : number {
    let existingSymbolId = this.getSymbolId(symbol_);
    if (!isUndefined(existingSymbolId)) {
      return existingSymbolId;
    }

    let symbolId = this.offset + this.symbols.length;
    this.symbols.push(symbol_);
    this.index[symbol_] = symbolId;
    return symbolId;
  }

  getSymbol(symbolId: number): string {
    let importedSymbol: string = this.import_.getSymbol(symbolId);
    if (!isUndefined(importedSymbol)) {
      return importedSymbol;
    }

    let index = symbolId - this.offset;
    if (index < this.symbols.length) {
      return this.symbols[index];
    }

    return undefined;
  }

  getSymbols() : string[] {
    return this.symbols;
  }
}
