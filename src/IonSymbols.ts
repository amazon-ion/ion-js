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

// Ion Symbol Table processing

/// <reference path="IonReader.ts" />
/// <reference path="IonText.ts" />

namespace ION {
  export class Symbol {
    sid: number;
    name: string;

    constructor(id: number, val: string) {
      this.sid = id;
      this.name = val;
    }

    toString() : string {
      var s = "sym::{id:" + asAscii(this.sid) + ",val:\"" + asAscii(this.name) + "\"";
      return s;
    }
  }

  export interface SymbolTable {
    addName(name: string) : number;
    addSymbol(sym: Symbol) : number;
    getId(name: string) : number;
    getName(id: number) : string;
  }

  class UserSymbolTable implements SymbolTable {
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

  export const ion_symbol_table = "$ion_symbol_table";
  export const ion_symbol_table_sid = 3;

  class SystemSymbolTable implements SymbolTable {
    private delegate: UserSymbolTable;

    constructor(delegate: UserSymbolTable) {
      this.delegate = delegate;
    }

    private no_change() : never {
      throw new Error("can't change the system symbol table");
    }

    addName(name: string) : number {
      this.no_change();
      return undefined;
    }

    addSymbol(sym: Symbol) : number {
      this.no_change();
      return undefined;
    }

    getId(name: string) : number {
      return this.delegate.getId(name);
    }

    getName(id: number) : string {
      return this.delegate.getName(id);
    }
  }

  const systemSymbolTable: SystemSymbolTable = new SystemSymbolTable(
    new UserSymbolTable(
      "$ion",
      1,
      [], // no imports
      [
        "$ion",
        "$ion_1_0",
        "$ion_symbol_table",
        "name",
        "version",
        "imports",
        "symbols",
        "max_id",
        "$ion_shared_symbol_table",
      ],
      undefined
    )
  );

  export function getSystemSymbolTable() : SymbolTable {
    return systemSymbolTable;
  }

  const empty_struct = {};

  interface Import {
    name: string;
    version: number;
    maxid: number;
    offset: number;
    symtab: {};
  }

  function load_imports(sp: Reader, cat: any) : Import[] {
    let imports: Import[] = [];

    var name, version, maxid, t, ii, st;
    sp.stepIn(); // into the array

    for (;;) {
      t = sp.next(); 
      if (!t) break;
      sp.stepIn(); // into the struct of 1 import
      name = undefined;
      maxid = undefined;
      version = undefined;
      while ((t = sp.next()) !== undefined) {
        switch(sp.fieldName()) {
        //case 1:  //"$ion",
        //case 2 : //"$ion_1_0",
        //case 3 : //"$ion_symbol_table",
        case "name":
          name = sp.stringValue();
          break;
        case "version":
          version = sp.numberValue();
          break;
        // case 6 : //"imports",
        // case 7 : //"symbols",
        case "max_id":
          maxid = sp.numberValue();
        //case 9 : //"$ion_shared_symbol_table",
        default:
          break;
        }
      }
      if (typeof name != 'undefined') {
        imports.push(
          {
            name:    name,
            version: version,
            maxid:   maxid,
            offset:  0,
            symtab:  empty_struct,
          } as Import
        );
      }
      sp.stepOut(); // out of one import struct
    }
    sp.stepOut(); // out of the array of imports

    return imports;
  }

  function load_symbols(sp: Reader) : string[] {
    var syms = [], name;
    sp.stepIn();
    while (sp.next() !== undefined) {
      name = sp.stringValue();
      syms.push(name);
    }
    sp.stepOut();
    return syms;
  }

  export function makeSymbolTable(cat, sp: Reader) : SymbolTable {
    let name: string;
    let version: number;
    let imports: Import[];
    let symbols: string[];
    let maxid: number;
    let overflow: any;

    var len, t, off, ii, imp, fld;
    
    sp.stepIn();
    while ((t = sp.next()) !== undefined) {
      fld = sp.fieldName();
      switch(fld) {
      //case "$ion":                // sid 1
      //case "$ion_1_0":            // sid 2
      //case "$ion_symbol_table":   // sid 3
      case "name":                // sid 4
        name = sp.stringValue();
        break;
      case "version":             // sid 5
        version = sp.numberValue();
        break;
      case "imports":             // sid 6
        imports = load_imports(sp, cat);
        break;
      case "symbols":             // sid 7
        symbols = load_symbols(sp);
        break;
      case "max_id":              // sid 8
        maxid = sp.numberValue();
      //case 9 : //"$ion_shared_symbol_table",
      default:
        if (typeof overflow === 'undefined') overflow = {};
        overflow[sp.fieldName()] = sp.value();
        break;
      }
    }
    sp.stepOut();
    
    // DEBUG
    let err: string = "";
    if (typeof name !== 'undefined') {
      if (typeof name !== 'string') err += "bad type for name, ";
      if (typeof version !== 'number') err += "bad type for version, ";
    }
    if (typeof maxid !== 'undefined' && typeof maxid != 'number') err += "bad type for maxid, ";
    if (err !== "") throw new Error(err);
    
    let st: SymbolTable = new UserSymbolTable(name, version, imports, symbols, maxid, overflow);
    
    // step through the imports and resolve the imported symbol tables and
    // compute the _offset id and _max_id (if missing)
    off = 0;
    len = imports ? imports.length : 0;
    for (ii=0; ii<len; ii++) {
      name = imports[ii].name;
      version = imports[ii].version;
      imp = cat ? cat.getSymbolTable(name, version) : undefined;
      if (imp) {
        imports[ii].symtab = imp;
        if (imports[ii].maxid === undefined) {
          imports[ii].maxid = imp.maxid;
        }
      }
      imports[ii].offset = off;
      off += imports[ii].maxid;
    }
   
    return st;
  }
}
