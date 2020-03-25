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
import {LocalSymbolTable} from "../src/IonLocalSymbolTable";
import {Import} from "../src/IonImport";
import {getSystemSymbolTableImport} from "../src/IonSystemSymbolTable";
import {Catalog, defaultLocalSymbolTable, SharedSymbolTable} from "../src/Ion";

let defaultCatalog = function () {
    let catalog = new Catalog();
    catalog.add(new SharedSymbolTable('foo', 1, ['a', 'b']));
    catalog.add(new SharedSymbolTable('bar', 1, ['c', 'd']));
    return catalog;
};


let assertSystemSymbols = function (symbolTable: LocalSymbolTable) {
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

describe('Local symbol table', () => {
    it('Imports system symbol table by default', () => {
        let symbolTable = defaultLocalSymbolTable();
        assertSystemSymbols(symbolTable);
        assert.throws(() => symbolTable.getSymbolText(10));
    });

    it('Imports are added in order', () => {
        let catalog = defaultCatalog();
        let import1 = new Import(getSystemSymbolTableImport(), catalog.getVersion('foo', 1)!);
        let import2 = new Import(import1, catalog.getVersion('bar', 1)!);
        let symbolTable = new LocalSymbolTable(import2);

        assert.isDefined(symbolTable.getSymbolText(13));
        assert.throws(() => symbolTable.getSymbolText(14));
        assertSystemSymbols(symbolTable);
        assert.equal(symbolTable.getSymbolId('a'), 10);
        assert.equal(symbolTable.getSymbolId('b'), 11);
        assert.equal(symbolTable.getSymbolId('c'), 12);
        assert.equal(symbolTable.getSymbolId('d'), 13);
    });

    it('Local symbols are added last', () => {
        let catalog = defaultCatalog();
        let import1 = new Import(getSystemSymbolTableImport(), catalog.getVersion('foo', 1)!);
        let import2 = new Import(import1, catalog.getVersion('bar', 1)!);
        let symbolTable = new LocalSymbolTable(import2, ['e', 'f']);

        assertSystemSymbols(symbolTable);
        assert.equal(symbolTable.getSymbolId('a'), 10);
        assert.equal(symbolTable.getSymbolId('b'), 11);
        assert.equal(symbolTable.getSymbolId('c'), 12);
        assert.equal(symbolTable.getSymbolId('d'), 13);
        assert.equal(symbolTable.getSymbolId('e'), 14);
        assert.equal(symbolTable.getSymbolId('f'), 15);
        assert.throws(() => symbolTable.getSymbolText(16));
    });

    it('MaxId less than symbol table length restricts imports', () => {
        let catalog = defaultCatalog();
        let import1 = new Import(getSystemSymbolTableImport(), catalog.getVersion('foo', 1)!, 1);
        let import2 = new Import(import1, catalog.getVersion('bar', 1)!, 1);
        let symbolTable = new LocalSymbolTable(import2, ['e', 'f']);

        assert.isDefined(symbolTable.getSymbolText(13));
        assert.throws(() => symbolTable.getSymbolText(14));

        assertSystemSymbols(symbolTable);
        assert.equal(symbolTable.getSymbolId('a'), 10);
        assert.isUndefined(symbolTable.getSymbolId('b'));
        assert.equal(symbolTable.getSymbolId('c'), 11);
        assert.isUndefined(symbolTable.getSymbolId('d'));
        assert.equal(symbolTable.getSymbolId('e'), 12);
        assert.equal(symbolTable.getSymbolId('f'), 13);
    });

    it('Maxid greater than symbol table length extends imports', () => {
        let catalog = defaultCatalog();
        let import1 = new Import(getSystemSymbolTableImport(), catalog.getVersion('foo', 1)!, 3);
        let import2 = new Import(import1, catalog.getVersion('bar', 1)!, 3);
        let symbolTable = new LocalSymbolTable(import2, ['e', 'f']);

        assert.isDefined(symbolTable.getSymbolText(17));
        assert.throws(() => symbolTable.getSymbolText(18));

        assertSystemSymbols(symbolTable);
        assert.equal(symbolTable.getSymbolId('a'), 10);
        assert.equal(symbolTable.getSymbolId('b'), 11);
        assert.isUndefined(symbolTable.getSymbolText(12));
        assert.equal(symbolTable.getSymbolId('c'), 13);
        assert.equal(symbolTable.getSymbolId('d'), 14);
        assert.isUndefined(symbolTable.getSymbolText(15));
        assert.equal(symbolTable.getSymbolId('e'), 16);
        assert.equal(symbolTable.getSymbolId('f'), 17);
    });

    it('addSymbol', () => {
        let symbolTable = defaultLocalSymbolTable();
        let symbol = "foo";
        assert.isUndefined(symbolTable.getSymbolId(symbol), "Symbol was already defined");

        let id = symbolTable.addSymbol(symbol);
        assert.isDefined(id, "Unable to add symbol to symbol table");
        assert.equal(id, 10);

        let actualSymbol_ = symbolTable.getSymbolText(id);
        assert.equal(symbol, actualSymbol_, "Symbol names did not match");
    });

    it('Duplicate symbols are not added', () => {
        let symbolTable = defaultLocalSymbolTable();
        let originalLength = symbolTable.symbols.length;

        let symbol = "foo";
        let originalId = symbolTable.addSymbol(symbol);
        assert.equal(originalLength + 1, symbolTable.symbols.length, "Original symbol was not added to symbol table");

        let duplicateId = symbolTable.addSymbol(symbol);
        assert.equal(originalId, duplicateId, "Duplicate symbol was not given original id");
        assert.equal(originalLength + 1, symbolTable.symbols.length, "Duplicate symbol added to symbol table");
    });
});