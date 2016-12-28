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
import { isNullOrUndefined } from "./IonUtilities";
import { isUndefined } from "./IonUtilities";
import { SharedSymbolTable } from "./IonSharedSymbolTable";
import { SymbolIndex } from "./IonSymbolIndex";

export class Import {
  private readonly parent: Import;
  private readonly symbolTable: SharedSymbolTable;
  private readonly offset: number;
  private readonly length: number;
  private readonly index: SymbolIndex = {};

  constructor(parent: Import, symbolTable: SharedSymbolTable, length?: number) {
    this.parent = parent;
    this.symbolTable = symbolTable;
    this.offset = (parent && (parent.getOffset() + parent.getLength())) || 1;
    this.length = length || symbolTable.getSymbols().length;

    let symbols: string[] = symbolTable.getSymbols();
    for (let i: number = 0; i < this.length; i++) {
      this.index[symbols[i]] = this.offset + i;
    }
  }

  getSymbol(symbolId: number) : string {
    if (!isNullOrUndefined(this.parent)) {
      let parentSymbol = this.parent.getSymbol(symbolId);
      if (!isUndefined(parentSymbol)) {
        return parentSymbol;
      }
    }

    let index: number = symbolId - this.offset;
    if (index < this.length) {
      return this.symbolTable.getSymbols()[index];
    }

    return undefined;
  }

  getSymbolId(symbol_: string) : number {
    return (this.parent && this.parent.getSymbolId(symbol_))
      || this.index[symbol_];
  }

  getOffset() : number {
    return this.offset;
  }

  getLength() : number {
    return this.length;
  }
}
