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

    suite['Finds specific version'] = function() {
      var symbolTable = new ion.SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(symbolTable);
      var match = catalog.findSpecificVersion('foo', 1);
      assert.strictEqual(symbolTable, match);
    }

    suite['Finds latest version'] = function() {
      var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
      var version2 = new ion.SharedSymbolTable('foo', 2, ['b']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(version1);
      catalog.addSymbolTable(version2);
      var match = catalog.findLatestVersion('foo');
      assert.strictEqual(2, match.version);
    }

    registerSuite(suite);
  }
);
