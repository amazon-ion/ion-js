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
      var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
      var version2 = new ion.SharedSymbolTable('foo', 2, ['b']);
      var version3 = new ion.SharedSymbolTable('foo', 3, ['b']);
      var version4 = new ion.SharedSymbolTable('foo', 4, ['b']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(version1);
      catalog.addSymbolTable(version2);
      catalog.addSymbolTable(version3);
      catalog.addSymbolTable(version4);
      var match = catalog.findSpecificVersion('foo', 3);
      assert.strictEqual(version3, match);
    }

    suite['Find specific version returns undefined if specific version not found'] = function() {
      var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(version1);
      assert.isUndefined(catalog.findSpecificVersion('foo', 2));
    }

    suite['Find specific version returns undefined if any version not found'] = function() {
      var catalog = new ion.Catalog();
      assert.isUndefined(catalog.findSpecificVersion('foo', 2));
    }

    suite['Finds latest version'] = function() {
      var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
      var version2 = new ion.SharedSymbolTable('foo', 2, ['b']);
      var version3 = new ion.SharedSymbolTable('foo', 3, ['b']);
      var version4 = new ion.SharedSymbolTable('foo', 4, ['b']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(version1);
      catalog.addSymbolTable(version2);
      catalog.addSymbolTable(version3);
      catalog.addSymbolTable(version4);
      var match = catalog.findLatestVersion('foo');
      assert.strictEqual(4, match.version);
    }

    suite['Find latest version returns undefined if no version exists'] = function() {
      var catalog = new ion.Catalog();
      assert.isUndefined(catalog.findLatestVersion('foo'));
    }

    suite['Adding same symbol table twice overwrites original entry'] = function() {
      var version1a = new ion.SharedSymbolTable('foo', 1, ['a']);
      var version1b = new ion.SharedSymbolTable('foo', 1, ['a']);
      var catalog = new ion.Catalog();
      catalog.addSymbolTable(version1a);
      catalog.addSymbolTable(version1b);
      assert.strictEqual(version1b, catalog.findLatestVersion('foo'))
    }

    registerSuite(suite);
  }
);
