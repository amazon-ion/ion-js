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
import { SymbolTable } from "./IonSymbolTable";

export class UserSymbolTable implements SymbolTable {
  private name: string;
  private version: number;
  private maxid: number;
  private base: number;
  private imports: Import[];
  private symbols: Symbol[];
  private _index: any;
  private _overflow: any;

  constructor(name: string, ver: number, imports: Import[], symbols: string[] | Symbol[], maxid: number, overflow: any = {}) {
    var ii, len, fn;
    this.name      =      name;
    this.version   = ver || -1;
    this.imports   =   imports;
    this.symbols   =        [];
    this._index    =        {};
    this._overflow =  overflow;

    if (maxid === undefined) {
      maxid = 1;
      if (typeof imports === 'object' && imports.length > 0) {
        len = imports.length;
        for (ii=0; ii<len; ii++) {
          maxid += imports[ii].maxid;
        }
      }
    }
    this.maxid = maxid;
    this.base  = maxid;

    if (typeof symbols !== 'undefined' && (len = symbols.length) > 0) {
      fn = (typeof symbols[0] === 'string') ? this.addName : this.addSymbol;
      for (ii = 0; ii<len; ii++) {
        fn.call(this, symbols[ii]);
      }
    }
  }

  addName(name: string) : number {
    var id, t = this;
    if (typeof name !== 'string') throw new Error("invalid symbol");
    id = t.getId(name);
    if (id !== undefined) return id;
    id = t.maxid;
    t.maxid++;
    t.addSymbol(new Symbol(id, name));
    return id;
  }

  addSymbol(sym: Symbol) : number {
    var id, name, t = this;
    name = sym.name;
    id = t.getId(name);
    if (id !== undefined) {
      if (id !== sym.sid) throw new Error("symbol is already defined");
      return id;
    }
    id = sym.sid;
    let offset: number = id - t.base;
    if (offset < 0) {
      throw new Error("can't change symbols in import list");
    }
    if (offset >= t.maxid) t.maxid = offset + 1;
    t.symbols[offset] = sym;
    t._index[name] = offset; // we store the local id not the global
    return sym.sid;
  }

  getId(name: string) : number {
    var ii, id, len, base, imports, t = this;
    if ((imports = t.imports) !== undefined 
     && (len = imports.length) > 0) 
    {
      base = 1;
      for (ii=0; ii<len; ii++) {
        id = imports[ii]._index[name] || -1;
        if (id > 0) {
          return id + base;
        }
        base += imports[ii].maxid;
      }
    }
    id = t._index[name];
    return id ? id.sid : undefined;
  }

  getName(id: number) : string {
    var ii, len, base, n, imports, symbols, t = this;
    if (id < 1 || id >= t.maxid) return undefined;
    symbols = t.symbols;
    base = 1;
    if ((imports = t.imports) !== undefined 
     && (len = imports.length) > 0) 
    {
      n = undefined;
      for (ii=0; ii<len; ii++) {
        if (imports[ii].maxid > (id-base)) {
          symbols = imports[ii].symtab ? imports[ii].symtab.symbols : undefined;
          break;
        }
        base += imports[ii].maxid;
      }
    }
    if (symbols) {
      ii = id - base;
      n = symbols[ii] ? symbols[ii].name : undefined;
    }
    else {
      n = '$'+id.toString();
    }
    return n;
  }
}
