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

/**
 * A shared symbol table import.
 * 
 * Import order in shared symbol tables is important, so each import also
 * references a parent (previous) import (except for the implicit system symbol
 * table import, which has no parent). Optionally, the number of symbols to
 * import from a given symbol table may be specified as the "length" of the
 * import.
 * 
 * @see http://amzn.github.io/ion-docs/symbols.html#imports
 */
export class Import {
    private readonly _offset: number;
    private readonly _length: number;
    private readonly index: SymbolIndex = {};
    private readonly _parent : Import;
    private readonly _symbolTable : SharedSymbolTable;

    constructor(parent : Import, symbolTable : SharedSymbolTable, length?: number) {
        this._parent = parent;
        this._symbolTable = symbolTable;
        this._offset = this.parent ? this.parent.offset + this.parent.length : 1;//this is wrong.
        this._length = length || this.symbolTable.symbols.length;

        let symbols: string[] = this.symbolTable.symbols;
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
            return this.symbolTable.symbols[index];
        }

        return undefined;
    }

    getSymbolId(symbol_: string) : number {
        return (this.parent && this._parent.getSymbolId(symbol_)) || this.index[symbol_];
    }

    get parent() : Import {
        return this._parent;
    }

    get offset() : number {
        return this._offset;
    }

    get length() : number {
        return this._length;
    }

    get symbolTable() : SharedSymbolTable {
        return this._symbolTable;
    }
}
