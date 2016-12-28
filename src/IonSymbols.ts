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
import { LocalSymbolTable } from "./IonLocalSymbolTable";
import { Reader } from "./IonReader";
import { Symbol } from "./IonSymbol";
import { SymbolTable } from "./IonSymbolTable";

export const ion_symbol_table = "$ion_symbol_table";
export const ion_symbol_table_sid = 3;

class SystemSymbolTable implements SymbolTable {
  private symbols: string[] = [
    "$ion",
    "$ion_1_0",
    "$ion_symbol_table",
    "name",
    "version",
    "imports",
    "symbols",
    "max_id",
    "$ion_shared_symbol_table",
  ];

  getSymbols() : string[] {
    return this.symbols;
  }

  getSymbol(id: number) : string {
    return this.symbols[id];
  }
}

const systemSymbolTable: SystemSymbolTable = new SystemSymbolTable();

export function getSystemSymbolTable() : SymbolTable {
  return systemSymbolTable;
}

const empty_struct = {};

function load_imports(sp: Reader, cat: Catalog) : Import[] {
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
      imports.push(new Import(name, version, maxid));
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

export function makeSymbolTable(catalog: Catalog, sp: Reader) : SymbolTable {
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
      imports = load_imports(sp, catalog);
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
  
  let st: SymbolTable = new LocalSymbolTable(catalog, getSystemSymbolTable(), imports, symbols);
  return st;
}
