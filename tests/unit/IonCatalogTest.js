/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
      name: 'Catalog'
    };

    suite['Finds exact match'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(symbolTable);
      var import_ = new ion.Import('foo', 1, undefined);
      var match = catalog.findSymbolTable(import_);
      assert.strictEqual(symbolTable, match);
    }

    suite['Rejects missing import with undefined max id'] = function() {
      var catalog = new ion.Catalog();
      var import_ = new ion.Import('foo', 1, undefined);
      assert.throws(
        () => catalog.findSymbolTable(import_),
        Error
      );
    }

    suite['Returns substitute symbol table if no match found but max id specified'] = function() {
      var catalog = new ion.Catalog();
      var import_ = new ion.Import('foo', 1, 5);
      var symbolTable = catalog.findSymbolTable(import_);
      assert.isDefined(symbolTable);
      var symbols = symbolTable.getSymbols();
      assert.equal(5, symbols.length);
      for (var i = 0; i < symbols.length; i++) {
        assert.isUndefined(symbols[i]);
      }
    }

    registerSuite(suite);
  }
);
