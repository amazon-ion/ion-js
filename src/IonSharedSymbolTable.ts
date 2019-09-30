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
 * A shared symbol table.
 * @see https://amzn.github.io/ion-docs/docs/symbols.html#shared-symbol-tables
 */
export class SharedSymbolTable {

  protected _numberOfSymbols: number;
  protected readonly _idsByText: Map<string, number>;

  constructor(
    private readonly _name: string,
    private readonly _version: number,
    private readonly _symbols: string[]
  ) {
    this._idsByText = new Map<string, number>();
    this._numberOfSymbols = this._symbols.length;
    // Iterate through the symbol array in reverse order so if the same string appears more than
    // once the smaller symbol ID is stored.
    for (let m = _symbols.length - 1; m >= 0; m--) {
      this._idsByText[_symbols[m]] = m;
    }
  }

  getSymbolText(symbolId: number): string {
    if (symbolId < 0) {
      throw new Error(
          `Index ${symbolId} is out of bounds for the SharedSymbolTable name=${this.name}, version=${this.version}`
      );
    }
    if (symbolId >= this.numberOfSymbols) {
      return undefined;
    }
    return this._symbols[symbolId];
  }

  getSymbolId(text: string): number {
    let symbolId = this._idsByText[text];
    if (symbolId === undefined) {
      return null;
    }
    return symbolId;
  }

  get name() : string {
    return this._name;
  }

  get version() : number {
    return this._version;
  }

  get numberOfSymbols(): number {
    return this._numberOfSymbols;
  }
}
