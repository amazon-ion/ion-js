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
import { Symbol } from "./IonSymbol";
import { SymbolIndex } from "./IonSymbolIndex";
import { SymbolTable } from "./IonSymbolTable";

export class UserSymbolTable implements SymbolTable {
  private name: string;
  private version: number;
  private maxid: number;
  private base: number;
  private imports: Import[];
  private symbols: Symbol[];
  private _index: SymbolIndex;
  private _overflow: any;

  constructor(name: string, ver: number, imports: Import[], symbols: string[] | Symbol[], maxid?: number, overflow: any = {}) {
    this.name      =      name;
    this.version   = ver || -1;
    this.imports   =   imports;
    this.symbols   =        [];
    this._index    =        {};
    this._overflow =  overflow;

    if (typeof(maxid) == 'undefined') {
      maxid = 1;
      if (typeof imports === 'object' && imports.length > 0) {
        let len: number = imports.length;
        for (let i: number = 0; i < len; i++) {
          maxid += imports[i].maxid;
        }
      }
    }
    this.maxid = maxid;
    this.base  = maxid;

    if (typeof symbols != 'undefined' && symbols.length > 0) {
      type Callback<T> = (value: T | Symbol, index: number, array: T[]) => void;
      if (typeof(symbols[0]) == 'string') {
        (<string[]>symbols).forEach(
          (value: string, index: number, array: string[]) => { this.addName(value); },
          this
        );
      } else {
        (<Symbol[]>symbols).forEach(
          (value: Symbol, index: number, array: Symbol[]) => { this.addSymbol(value); },
          this
        );
      }
    }
  }

  addName(name: string) : number {
    let id: number = this.getId(name);
    let alreadyDefined: boolean = typeof(id) != 'undefined';
    if (alreadyDefined) {
      return id;
    }
    id = this.maxid;
    this.maxid++;
    this.addSymbol(new Symbol(id, name));
    return id;
  }

  addSymbol(sym: Symbol) : number {
    let name: string = sym.name;
    let id: number = this.getId(name);
    if (typeof(id) != 'undefined') {
      if (id !== sym.sid) {
        throw new Error("symbol is already defined");
     }
      return id;
    }
    id = sym.sid;
    let offset: number = id - this.base;
    if (offset < 0) {
      throw new Error("can't change symbols in import list");
    }
    if (offset >= this.maxid) {
      this.maxid = offset + 1;
    }
    this.symbols[offset] = sym;
    this._index[name] = offset; // we store the local id not the global
    return sym.sid;
  }

  getId(name: string) : number {
    let imports: Import[] = this.imports;
    if (typeof(imports) != 'undefined') {
      let len: number = imports.length;
      if (len > 0) {
        let base: number = 1;
        for (let i: number = 0; i < len; i++) {
          let id: number = imports[i].symtab.getIndex()[name] || -1;
          if (id > 0) {
            return id + base;
          }
          base += imports[i].maxid;
        }
      }
    }
    return this._index[name];
  }

  getSymbol(id: number) : string {
    if (id < 1 || id >= this.maxid) {
      return undefined;
    }

    let symbols: Symbol[] = this.symbols;
    let base: number = 1;
    let imports: Import[] = this.imports;
    let n: string = undefined;

    if (typeof(imports) != 'undefined' && imports.length > 0) {
      let len: number = imports.length;
      for (let i: number = 0; i < len; i++) {
        if (imports[i].maxid > (id - base)) {
          symbols = imports[i].symtab ? imports[i].symtab.getSymbols() : undefined;
          break;
        }
        base += imports[i].maxid;
      }
    }

    if (symbols) {
      let index: number = id - base;
      n = symbols[index] ? symbols[index].name : undefined;
    } else {
      n = '$'+id.toString();
    }
    return n;
  }

  getIndex(): SymbolIndex {
    return this._index;
  }

  getSymbols() : Symbol[] {
    return this.symbols;
  }
}
