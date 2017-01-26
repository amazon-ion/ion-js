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
      name: 'Import'
    };

    var bytes = function(array) {
      return new Uint8Array(array);
    };

    suite['Orphan import has offset of 1'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a']);
      var import_ = new ion.Import(null, symbolTable);
      assert.equal(import_.getSymbolId('a'), 1);
    };

    suite['Child symbol ids start after parent'] = function() {
      var parentSymbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b']);
      var parentImport = new ion.Import(null, parentSymbolTable);
      var childSymbolTable = new ion.SharedSymbolTable('bar', 1, ['c']);
      var childImport = new ion.Import(parentImport, childSymbolTable);

      assert.equal(childImport.getSymbolId('a'), 1);
      assert.equal(childImport.getSymbolId('b'), 2);
      assert.equal(childImport.getSymbolId('c'), 3);
    };

    suite['Child import consults parent import first'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
      var parent = new ion.Import(null, symbolTable);
      var child = new ion.Import(parent, symbolTable);

      // Sanity check the parent
      assert.equal(parent.getSymbolId('a'), 1);
      assert.equal(parent.getSymbolId('b'), 2);
      assert.equal(parent.getSymbolId('c'), 3);

      // Verify that child ids match parent ids
      assert.equal(child.getSymbolId('a'), 1);
      assert.equal(child.getSymbolId('b'), 2);
      assert.equal(child.getSymbolId('c'), 3);

      // Verify that duplicate symbols are accessible
      assert.equal(child.getSymbol(4), 'a');
      assert.equal(child.getSymbol(5), 'b');
      assert.equal(child.getSymbol(6), 'c');
    };

    suite['Short length omits symbols'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
      var parent = new ion.Import(null, symbolTable, 1);
      var child = new ion.Import(parent, symbolTable);

      assert.equal(child.getSymbol(1), 'a');
      assert.equal(child.getSymbol(2), 'a');
      assert.equal(child.getSymbol(3), 'b');
      assert.equal(child.getSymbol(4), 'c');
    }

    suite['Long length pads symbols'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
      var parent = new ion.Import(null, symbolTable, 4);
      var child = new ion.Import(parent, symbolTable);

      assert.equal(child.getSymbol(1), 'a');
      assert.equal(child.getSymbol(2), 'b');
      assert.equal(child.getSymbol(3), 'c');
      assert.isUndefined(child.getSymbol(4));
      assert.equal(child.getSymbol(5), 'a');
      assert.equal(child.getSymbol(6), 'b');
      assert.equal(child.getSymbol(7), 'c');
    }

    registerSuite(suite);
  }
);
