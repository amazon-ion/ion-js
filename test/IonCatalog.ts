/*!
 * Copyright 2012 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *  
 *     http://www.apache.org/licenses/LICENSE-2.0
 *  
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {assert} from 'chai';
import {Catalog, SharedSymbolTable} from '../src/Ion';

describe('Catalog', () => {
    it('Finds specific version', () => {
        let version1 = new SharedSymbolTable('foo', 1, ['a']);
        let version2 = new SharedSymbolTable('foo', 2, ['b']);
        let version3 = new SharedSymbolTable('foo', 3, ['b']);
        let version4 = new SharedSymbolTable('foo', 4, ['b']);
        let catalog = new Catalog();
        catalog.add(version1);
        catalog.add(version2);
        catalog.add(version3);
        catalog.add(version4);
        let match = catalog.getVersion('foo', 3);
        assert.strictEqual(version3, match);
    });

    it('Find specific version returns null if specific version not found', () => {
        let version1 = new SharedSymbolTable('foo', 1, ['a']);
        let catalog = new Catalog();
        catalog.add(version1);
        assert.isNull(catalog.getVersion('foo', 2));
    });

    it('Find specific version returns null if any version not found', () => {
        let catalog = new Catalog();
        assert.isNull(catalog.getVersion('foo', 2));
    });

    it('Finds latest version', () => {
        let version1 = new SharedSymbolTable('foo', 1, ['a']);
        let version2 = new SharedSymbolTable('foo', 2, ['b']);
        let version3 = new SharedSymbolTable('foo', 3, ['b']);
        let version4 = new SharedSymbolTable('foo', 4, ['b']);
        let catalog = new Catalog();
        catalog.add(version1);
        catalog.add(version2);
        catalog.add(version3);
        catalog.add(version4);
        let match = catalog.getTable('foo');
        assert.isNotNull(match);
        assert.strictEqual(4, match!.version);
    });

    it('Find latest version returns null if no version exists', () => {
        let catalog = new Catalog();
        assert.isNull(catalog.getTable('foo'));
    });

    it('Adding same symbol table twice overwrites original entry', () => {
        let version1a = new SharedSymbolTable('foo', 1, ['a']);
        let version1b = new SharedSymbolTable('foo', 1, ['a']);
        let catalog = new Catalog();
        catalog.add(version1a);
        catalog.add(version1b);
        assert.strictEqual(version1b, catalog.getTable('foo'))
    });
});