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
import { Reader } from "./IonReader";
import { Symbol } from "./IonSymbol";
import { SymbolTable } from "./IonSymbolTable";
import { UserSymbolTable } from "./IonUserSymbolTable";

export const ion_symbol_table = "$ion_symbol_table";
export const ion_symbol_table_sid = 3;

const empty_struct = {};

function load_imports(reader: Reader, catalog: Catalog) : Import[] {
  let imports: Import[] = [];

  reader.stepIn(); // into the array
  while(reader.next()) {
    reader.stepIn(); // into the struct of 1 import

    let name: string;
    let maxId: number;
    let version: number;

    while (reader.next()) {
      switch(reader.fieldName()) {
        case "name":
          name = reader.stringValue();
          break;
        case "version":
          version = reader.numberValue();
          break;
        case "max_id":
          maxId = reader.numberValue();
      }
    }
    if (name) {
      imports.push(
        {
          name:    name,
          version: version,
          maxid:   maxId,
          offset:  0,
          symtab:  empty_struct,
        } as Import
      );
    }
    reader.stepOut(); // out of one import struct
  }
  reader.stepOut(); // out of the array of imports

  return imports;
}

function load_symbols(reader: Reader) : string[] {
  let symbols: string[] = [];
  reader.stepIn();
  while (reader.next()) {
    symbols.push(reader.stringValue());
  }
  reader.stepOut();
  return symbols;
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
  
  let st: SymbolTable = new UserSymbolTable(name, version, imports, symbols, maxid, overflow);
  
  // step through the imports and resolve the imported symbol tables and
  // compute the _offset id and _max_id (if missing)
  off = 0;
  len = imports ? imports.length : 0;
  for (ii=0; ii<len; ii++) {
    name = imports[ii].name;
    version = imports[ii].version;
    imp = catalog ? catalog.getSymbolTable(name, version) : undefined;
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
