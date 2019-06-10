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
import { getSystemSymbolTable } from "./IonSystemSymbolTable";
import { SharedSymbolTable } from "./IonSharedSymbolTable";

    interface SymbolTableIndex { [name: string]: SharedSymbolTable[] }

    function byVersion(x: SharedSymbolTable, y: SharedSymbolTable) : number {
        return x.version - y.version;
    }

    /**
    * A catalog holds available shared symbol tables and always includes the system symbol table.
    * @see http://amzn.github.io/ion-docs/symbols.html#the-catalog
    */
    export class Catalog {
        private symbolTables: SymbolTableIndex;

        constructor() {
            this.symbolTables = {};
            this.add(getSystemSymbolTable());
        }

        add(symbolTable: SharedSymbolTable) : void {
            if(symbolTable.name === undefined || symbolTable.name === null) throw new Error("SymbolTable name must be defined.");
            let versions = this.symbolTables[symbolTable.name];
            if (versions === undefined) this.symbolTables[symbolTable.name] = [];
            this.symbolTables[symbolTable.name][symbolTable.version] = symbolTable;
        }

        getVersion(name: string, version: number) : SharedSymbolTable {
            let tables : SharedSymbolTable[] = this.symbolTables[name];
            if(!tables) return null;
            let table = tables[version];
            if(!table) table = tables[tables.length];
            return table? table : null;
        }

        getTable(name: string) : SharedSymbolTable {
            let versions = this.symbolTables[name], table;
            if(versions === undefined) return null;
            return versions[versions.length - 1];
        }
    }
