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
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
  ],
  function(intern, registerSuite, assert, ion) {

    var suite = {
      name: 'Local Symbol Table'
    };

    var defaultCatalog = function() {
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(new ion.SharedSymbolTable('foo', 1, ['a', 'b']));
      catalog.addSymbolTable(new ion.SharedSymbolTable('bar', 1, ['c', 'd']));
      return catalog;
    };

    var assertSystemSymbols = function(symbolTable) {
      assert.equal(symbolTable.getSymbolId('$ion'), 1);
      assert.equal(symbolTable.getSymbolId('$ion_1_0'), 2);
      assert.equal(symbolTable.getSymbolId('$ion_symbol_table'), 3);
      assert.equal(symbolTable.getSymbolId('name'), 4);
      assert.equal(symbolTable.getSymbolId('version'), 5);
      assert.equal(symbolTable.getSymbolId('imports'), 6);
      assert.equal(symbolTable.getSymbolId('symbols'), 7);
      assert.equal(symbolTable.getSymbolId('max_id'), 8);
      assert.equal(symbolTable.getSymbolId('$ion_shared_symbol_table'), 9);
    };

    suite['Imports system symbol table by default'] = function() {
      var symbolTable = ion.defaultLocalSymbolTable();
      assertSystemSymbols(symbolTable);
      try {
        symbolTable.getSymbol(10);
        throw new Error("Expected Error.")
      } catch(e) {
          if(e.message === "Expected Error.") throw new Error("Failed to cause index Error")
      }
    }

    suite['Imports are added in order'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import(ion.getSystemSymbolTableImport(), catalog.findSpecificVersion('foo', 1));
      var import2 = new ion.Import(import1, catalog.findSpecificVersion('bar', 1));

      var symbolTable = new ion.LocalSymbolTable(import2);

      assert.isDefined(symbolTable.getSymbol(13));
      try{
          symbolTable.getSymbol(14);
          throw new Error("Expected Error.")
      } catch(e) {
          if(e.message === "Expected Error.") throw new Error("Failed to cause index Error")
      }


      assertSystemSymbols(symbolTable);
      assert.equal(symbolTable.getSymbolId('a'), 10);
      assert.equal(symbolTable.getSymbolId('b'), 11);
      assert.equal(symbolTable.getSymbolId('c'), 12);
      assert.equal(symbolTable.getSymbolId('d'), 13);
    }

    suite['Local symbols are added last'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import(ion.getSystemSymbolTableImport(), catalog.findSpecificVersion('foo', 1));
      var import2 = new ion.Import(import1, catalog.findSpecificVersion('bar', 1));

      var symbolTable = new ion.LocalSymbolTable(import2, ['e', 'f']);

      assertSystemSymbols(symbolTable);
      assert.equal(symbolTable.getSymbolId('a'), 10);
      assert.equal(symbolTable.getSymbolId('b'), 11);
      assert.equal(symbolTable.getSymbolId('c'), 12);
      assert.equal(symbolTable.getSymbolId('d'), 13);
      assert.equal(symbolTable.getSymbolId('e'), 14);
      assert.equal(symbolTable.getSymbolId('f'), 15);
      try{
          symbolTable.getSymbol(16);
          throw new Error("Expected Error.")
      } catch(e) {
          if(e.message === "Expected Error.") throw new Error("Failed to cause index Error")
      }
    }

    suite['Maxid less than symbol table length restricts imports'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import(ion.getSystemSymbolTableImport(), catalog.findSpecificVersion('foo', 1), 1);
      var import2 = new ion.Import(import1, catalog.findSpecificVersion('bar', 1), 1);

      var symbolTable = new ion.LocalSymbolTable(import2, ['e', 'f']);

      assert.isDefined(symbolTable.getSymbol(13));
      try{
          symbolTable.getSymbol(14);
          throw new Error("Expected Error.")
      } catch(e) {
          if(e.message === "Expected Error.") throw new Error("Failed to cause index Error")
      }

      assertSystemSymbols(symbolTable);
      assert.equal(symbolTable.getSymbolId('a'), 10);
      assert.isUndefined(symbolTable.getSymbolId('b'));
      assert.equal(symbolTable.getSymbolId('c'), 11);
      assert.isUndefined(symbolTable.getSymbolId('d'));
      assert.equal(symbolTable.getSymbolId('e'), 12);
      assert.equal(symbolTable.getSymbolId('f'), 13);
    }

    suite['Maxid greater than symbol table length extends imports'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import(ion.getSystemSymbolTableImport(), catalog.findSpecificVersion('foo', 1), 3);
      var import2 = new ion.Import(import1, catalog.findSpecificVersion('bar', 1), 3);

      var symbolTable = new ion.LocalSymbolTable(import2, ['e', 'f']);

      assert.isDefined(symbolTable.getSymbol(17));
      try {
          symbolTable.getSymbol(18);
          throw new Error("Expected Error.")
      } catch(e) {
          if(e.message === "Expected Error.") throw new Error("Failed to cause index Error")
      }


      assertSystemSymbols(symbolTable);
      assert.equal(symbolTable.getSymbolId('a'), 10);
      assert.equal(symbolTable.getSymbolId('b'), 11);
      assert.isUndefined(symbolTable.getSymbol(12));
      assert.equal(symbolTable.getSymbolId('c'), 13);
      assert.equal(symbolTable.getSymbolId('d'), 14);
      assert.isUndefined(symbolTable.getSymbol(15));
      assert.equal(symbolTable.getSymbolId('e'), 16);
      assert.equal(symbolTable.getSymbolId('f'), 17);
    }

    suite['addSymbol'] = function() {
      var symbolTable = ion.defaultLocalSymbolTable();

      var symbol_ = "foo";
      assert.isUndefined(symbolTable.getSymbolId(symbol_), "Symbol was already defined");

      var id = symbolTable.addSymbol(symbol_);
      assert.isDefined(id, "Unable to add symbol to symbol table");
      assert.equal(id, 10);

      var actualSymbol_ = symbolTable.getSymbol(id);
      assert.equal(symbol_, actualSymbol_, "Symbol names did not match");
    };

    suite['Duplicate symbols are not added'] = function() {
      var symbolTable = ion.defaultLocalSymbolTable();
      var originalLength = symbolTable.symbols.length;

      var symbol_ = "foo";
      var originalId = symbolTable.addSymbol(symbol_);
      assert.equal(originalLength + 1, symbolTable.symbols.length, "Original symbol was not added to symbol table");

      var duplicateId = symbolTable.addSymbol(symbol_);
      assert.equal(originalId, duplicateId, "Duplicate symbol was not given original id");
      assert.equal(originalLength + 1, symbolTable.symbols.length, "Duplicate symbol added to symbol table");
    };

    registerSuite(suite);
  }
);
