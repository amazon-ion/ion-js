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
 define(
  function(require) {
    const registerSuite = require('intern!object');
    const assert = require('intern/chai!assert');
    const ion = require('dist/Ion');

    var suite = {
      name: 'User Symbol Table'
    };

    var defaultCatalog = function() {
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(new ion.SharedSymbolTable('foo', 1, ['a', 'b']));
      catalog.addSymbolTable(new ion.SharedSymbolTable('bar', 1, ['c', 'd']));
      return catalog;
    };

    var assertSystemSymbols = function(symbolTable) {
      assert.equal(1, symbolTable.getId('$ion'));
      assert.equal(2, symbolTable.getId('$ion_1_0'));
      assert.equal(3, symbolTable.getId('$ion_symbol_table'));
      assert.equal(4, symbolTable.getId('name'));
      assert.equal(5, symbolTable.getId('version'));
      assert.equal(6, symbolTable.getId('imports'));
      assert.equal(7, symbolTable.getId('symbols'));
      assert.equal(8, symbolTable.getId('max_id'));
      assert.equal(9, symbolTable.getId('$ion_shared_symbol_table'));
    };

    suite['Imports system symbol table by default'] = function() {
      var catalog = new ion.Catalog();
      var symbolTable = new ion.LocalSymbolTable(catalog, ion.getSystemSymbolTable());
      assert.equal(10, symbolTable.getSymbols().length);
      assertSystemSymbols(symbolTable);
    }

    suite['Imports are added in order'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import('foo', 1);
      var import2 = new ion.Import('bar', 1);

      var symbolTable = new ion.LocalSymbolTable(catalog, ion.getSystemSymbolTable(), [import1, import2]);

      assert.equal(14, symbolTable.getSymbols().length);
      assertSystemSymbols(symbolTable);
      assert.equal(10, symbolTable.getId('a'));
      assert.equal(11, symbolTable.getId('b'));
      assert.equal(12, symbolTable.getId('c'));
      assert.equal(13, symbolTable.getId('d'));
    }

    suite['Local symbols are added last'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import('foo', 1);
      var import2 = new ion.Import('bar', 1);

      var symbolTable = new ion.LocalSymbolTable(
        catalog,
        ion.getSystemSymbolTable(),
        [import1, import2],
        ['e', 'f']);

      assert.equal(16, symbolTable.getSymbols().length);
      assertSystemSymbols(symbolTable);
      assert.equal(10, symbolTable.getId('a'));
      assert.equal(11, symbolTable.getId('b'));
      assert.equal(12, symbolTable.getId('c'));
      assert.equal(13, symbolTable.getId('d'));
      assert.equal(14, symbolTable.getId('e'));
      assert.equal(15, symbolTable.getId('f'));
    }

    suite['Maxid restricts imports'] = function() {
      var catalog = defaultCatalog();

      var import1 = new ion.Import('foo', 1, 1);
      var import2 = new ion.Import('bar', 1, 1);

      var symbolTable = new ion.LocalSymbolTable(
        catalog,
        ion.getSystemSymbolTable(),
        [import1, import2],
        ['e', 'f']);

      assert.equal(14, symbolTable.getSymbols().length);
      assertSystemSymbols(symbolTable);
      assert.equal(10, symbolTable.getId('a'));
      assert.isUndefined(symbolTable.getId('b'));
      assert.equal(11, symbolTable.getId('c'));
      assert.isUndefined(symbolTable.getId('d'));
      assert.equal(12, symbolTable.getId('e'));
      assert.equal(13, symbolTable.getId('f'));
    }

    suite['addSymbol'] = function() {
      var symbolTable = new ion.LocalSymbolTable(new ion.Catalog(), ion.getSystemSymbolTable());
      var symbol_ = "foo";
      assert.isUndefined(symbolTable.getId(symbol_), "Symbol was already defined");
      var id = symbolTable.addSymbol(symbol_);
      assert.isDefined(id, "Unable to add symbol to symbol table");
      assert.equal(10, id);
      var actualSymbol_ = symbolTable.getSymbol(id);
      assert.equal(symbol_, actualSymbol_, "Symbol names did not match");
    };

    suite['addDuplicateSymbol'] = function() {
      var symbolTable = new ion.LocalSymbolTable(new ion.Catalog(), ion.getSystemSymbolTable());
      var symbol_ = "foo";
      var originalId = symbolTable.addSymbol(symbol_);
      assert.equal(11, symbolTable.getSymbols().length, "Original symbol was not added to symbol table");
      var duplicateId = symbolTable.addSymbol(symbol_);
      assert.equal(originalId, duplicateId, "Duplicate symbol was not given original id");
      assert.equal(11, symbolTable.getSymbols().length, "Duplicate symbol added to symbol table");
    };

    registerSuite(suite);
  }
);
