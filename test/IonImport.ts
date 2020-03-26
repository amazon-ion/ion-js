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
import {SharedSymbolTable} from "../src/IonSharedSymbolTable";
import {Import} from "../src/IonImport";

describe('Import', () => {
    it('Orphan import has offset of 1', () => {
        let symbolTable = new SharedSymbolTable('foo', 1, ['a']);
        let import_ = new Import(null, symbolTable);
        assert.equal(import_.getSymbolId('a'), 1);
    });

    it('Child symbol ids start after parent', () => {
        let parentSymbolTable = new SharedSymbolTable('foo', 1, ['a', 'b']);
        let parentImport = new Import(null, parentSymbolTable);
        let childSymbolTable = new SharedSymbolTable('bar', 1, ['c']);
        let childImport = new Import(parentImport, childSymbolTable);

        assert.equal(childImport.getSymbolId('a'), 1);
        assert.equal(childImport.getSymbolId('b'), 2);
        assert.equal(childImport.getSymbolId('c'), 3);
    });

    it('Child import consults parent import first', () => {
        let symbolTable = new SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
        let parent = new Import(null, symbolTable);
        let child = new Import(parent, symbolTable);

        // Sanity check the parent
        assert.equal(parent.getSymbolId('a'), 1);
        assert.equal(parent.getSymbolId('b'), 2);
        assert.equal(parent.getSymbolId('c'), 3);

        // Verify that child ids match parent ids
        assert.equal(child.getSymbolId('a'), 1);
        assert.equal(child.getSymbolId('b'), 2);
        assert.equal(child.getSymbolId('c'), 3);

        // Verify that duplicate symbols are accessible
        assert.equal(child.getSymbolText(4), 'a');
        assert.equal(child.getSymbolText(5), 'b');
        assert.equal(child.getSymbolText(6), 'c');
    });

    it('Short length omits symbols', () => {
        let symbolTable = new SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
        let parent = new Import(null, symbolTable, 1);
        let child = new Import(parent, symbolTable);

        assert.equal(child.getSymbolText(1), 'a');
        assert.equal(child.getSymbolText(2), 'a');
        assert.equal(child.getSymbolText(3), 'b');
        assert.equal(child.getSymbolText(4), 'c');
    });

    it('Long length pads symbols', () => {
        let symbolTable = new SharedSymbolTable('foo', 1, ['a', 'b', 'c']);
        let parent = new Import(null, symbolTable, 4);
        let child = new Import(parent, symbolTable);

        assert.equal(child.getSymbolText(1), 'a');
        assert.equal(child.getSymbolText(2), 'b');
        assert.equal(child.getSymbolText(3), 'c');
        assert.isUndefined(child.getSymbolText(4));
        assert.equal(child.getSymbolText(5), 'a');
        assert.equal(child.getSymbolText(6), 'b');
        assert.equal(child.getSymbolText(7), 'c');
    });
});