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

"use strict";

var ION;
if (!ION) {
  throw {
    name: "IonError",
    where: "loading IonSymbols.js",
    msg: "IonSymbols.js must follow Ion.js"
  };
}

if (typeof ION.Symbol !== 'function') {

  ION.Symbol = (function() 
  {
    var 
      Symbol_class = function(id, val)
      {
        this.sid = id;
        this.name = val;
      },
      symbol_impl = {
        toString: function() {
          var s = "sym::{id:"+ION.asAscii(this.sid)+",val:\""+ION.asAscii(this.val)+"\"";
          return s;
        }
      };
    Symbol_class.prototype = symbol_impl;
    Symbol_class.prototype.constructor = Symbol_class;
    return Symbol_class;
  })();
}

ION.SymbolTable = ION.SymbolTable || (function() 
{
  var 
    Symbol_class = ION.Symbol,

    SymbolTable_class = function(name, ver, imports, symbols, overflow) {
      var ii, len, maxid, fn;
      this.name      =      name;
      this.version   = ver || -1;
      this.maxid     =         1;
      this.base      =         0;
      this.imports   =   imports;
      this.symbols   =        {};
      this._index    =        {};
      this._overflow =  overflow;
      
      maxid = 1;
      if (typeof imports === 'object' && imports.length > 0) {
        len = imports.length;
        for (ii=0; ii<len; ii++) {
          maxid += imports[ii].maxid;
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
    },
    symbol_table_impl = 
    {
      addName : function(name) {
        var id, t = this;
        if (typeof name !== 'string') ION.error("invalid symbol");
        id = t.getId(name);
        if (id !== undefined) return id;
        id = t.maxid;
        t.maxid++;
        t.addSymbol(new Symbol_class(id, name));
        return id;
      },
      addSymbol : function(sym) {
        var id, name, offset, t = this;
        if (typeof sym !== 'object' || !sym.name || !sym.sid) ION.error("invalid symbol");
        name = sym.name;
        id = t.getId(name);
        if (id !== undefined) {
          if (id !== sym.sid) ION.error("symbol is already defined");
          return id;
        }
        id = sym.sid;
        offset = id - t.base;
        if (offset < 0) {
          ION.error("can't change symbols in import list");
        }
        if (offset >= t.maxid) t.maxid = offset + 1;
        t.symbols[offset] = sym;
        t._index[name] = offset; // we store the local id not the global
        return sym.sid;
      },
      getId : function(name) {
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
      },
      getName : function(id) {
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
    };
    
  ION.ion_symbol_table = "$ion_symbol_table";
  ION.ion_symbol_table_sid = 3;

  SymbolTable_class.prototype = symbol_table_impl;
  SymbolTable_class.prototype.constructor = SymbolTable_class;
  return SymbolTable_class;
})();

  
ION.getSystemSymbolTable = ION.getSystemSymbolTable  || (function() 
{
  var system_symbol_table, no_change, impl;

  /* we just use the SYSTEM_SYMBOLS symbol table for these values
  var s = {
    ION_1_0_MAX_ID              : 9,
    ION                         : "$ion",
    ION_SID                     : 1,
    ION_1_0                     : "$ion_1_0",
    ION_1_0_SID                 : 2,
    ION_SYMBOL_TABLE            : "$ion_symbol_table",
    ION_SYMBOL_TABLE_SID        : 3,
    NAME                        : "name",
    NAME_SID                    : 4,
    VERSION                     : "version",
    VERSION_SID                 : 5,
    IMPORTS                     : "imports",
    IMPORTS_SID                 : 6,
    SYMBOLS                     : "symbols",
    SYMBOLS_SID                 : 7,
    MAX_ID                      : "max_id",
    MAX_ID_SID                  : 8,
    ION_SHARED_SYMBOL_TABLE     : "$ion_shared_symbol_table",
    ION_SHARED_SYMBOL_TABLE_SID : 9,
  };
*/
  // we're hiding this a little bit
  system_symbol_table = new ION.SymbolTable(
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
    ]
  );
  no_change = function() {
    ION.error("can't change the system symbol table");
  };
  system_symbol_table["addName"] = no_change;
  system_symbol_table["addSymbol"] = no_change;
  impl = function() {
    return system_symbol_table;
  };
  return impl;
})();

ION.makeSymbolTable = ION.makeSymbolTable || (function() 
{
  //makeSymbolTable
  //sp : system parser
  //assumes the sp just encountered a struct on next which is infact a symbol table
  var 
  empty_struct = {},
  load_imports = function (sp, cat)
  {
    var name, version, maxid, t, ii, st, imports = [];
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
          }
        );
      }
      sp.stepOut(); // out of one import struct
    }
    sp.stepOut(); // out of the array of imports

    return imports;
  },
  load_symbols = function (sp)
  {
    var syms = [], name;
    sp.stepIn();
    while (sp.next() !== undefined) {
      name = sp.stringValue();
      syms.push(name);
    }
    sp.stepOut();
    return syms;
  },
  make_symbol_table = function(cat, sp)
  {
    var st, len, t, err, off, ii, imp, fld, 
        name, version, imports, symbols, maxid, overflow;
    
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
        maxid = sp.getScalar();
      //case 9 : //"$ion_shared_symbol_table",
      default:
        if (typeof overflow === 'undefined') overflow = {};
        overflow[sp.fieldName()] = sp.getValue();
        break;
      }
    }
    sp.stepOut();
    
    // DEBUG
    var err = "";
    if (typeof name !== 'undefined') {
      if (typeof name !== 'string') err += "bad type for name, ";
      if (typeof version !== 'number') err += "bad type for version, ";
    }
    if (typeof maxid !== 'undefined' && typeof maxid != 'number') err += "bad type for maxid, ";
    if (err !== "") ION.error(err);
    
    st = new ION.SymbolTable(name, version, imports, symbols, maxid, overflow);
    
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
        if (imports.maxid === undefined) {
          imports.maxid = imp.maxid;
        }
      }
      imports[ii].offset = off;
      off += imports[ii].maxid;
    }
   
    return st;
  };
  return make_symbol_table;
})();

