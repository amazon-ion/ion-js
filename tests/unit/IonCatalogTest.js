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
define([
        'intern',
        'intern!object',
        'intern/chai!assert',
        'dist/amd/es6/IonTests',
    ],
    function(intern, registerSuite, assert, ion) {

        var suite = {
            name: 'Catalog'
        };

        suite['Finds specific version'] = function() {
            var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
            var version2 = new ion.SharedSymbolTable('foo', 2, ['b']);
            var version3 = new ion.SharedSymbolTable('foo', 3, ['b']);
            var version4 = new ion.SharedSymbolTable('foo', 4, ['b']);
            var catalog = new ion.Catalog();
            catalog.add(version1);
            catalog.add(version2);
            catalog.add(version3);
            catalog.add(version4);
            var match = catalog.getVersion('foo', 3);
            assert.strictEqual(version3, match);
        }

        suite['Find specific version returns null if specific version not found'] = function() {
            var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
            var catalog = new ion.Catalog();
            catalog.add(version1);
            assert.isNull(catalog.getVersion('foo', 2));
        }

        suite['Find specific version returns null if any version not found'] = function() {
            var catalog = new ion.Catalog();
            assert.isNull(catalog.getVersion('foo', 2));
        }

        suite['Finds latest version'] = function() {
            var version1 = new ion.SharedSymbolTable('foo', 1, ['a']);
            var version2 = new ion.SharedSymbolTable('foo', 2, ['b']);
            var version3 = new ion.SharedSymbolTable('foo', 3, ['b']);
            var version4 = new ion.SharedSymbolTable('foo', 4, ['b']);
            var catalog = new ion.Catalog();
            catalog.add(version1);
            catalog.add(version2);
            catalog.add(version3);
            catalog.add(version4);
            var match = catalog.getTable('foo');
            assert.strictEqual(4, match.version);
        }

        suite['Find latest version returns null if no version exists'] = function() {
            var catalog = new ion.Catalog();
            assert.isNull(catalog.getTable('foo'));
        }

        suite['Adding same symbol table twice overwrites original entry'] = function() {
            var version1a = new ion.SharedSymbolTable('foo', 1, ['a']);
            var version1b = new ion.SharedSymbolTable('foo', 1, ['a']);
            var catalog = new ion.Catalog();
            catalog.add(version1a);
            catalog.add(version1b);
            assert.strictEqual(version1b, catalog.getTable('foo'))
        }

        registerSuite(suite);
    }
);
