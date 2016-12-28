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
import { Import } from "./IonImport";
import { isUndefined } from "./IonUtilities";
import { max } from "./IonUtilities";
import { SharedSymbolTable } from "./IonSharedSymbolTable";

interface SymbolTableIndex { [name: string]: SharedSymbolTable[] }

function byVersion(x: SharedSymbolTable, y: SharedSymbolTable) : number {
  return x.getVersion() - y.getVersion();
}

export class Catalog {
  private symbolTables: SymbolTableIndex = {};

  constructor() {
    this.addSymbolTable(getSystemSymbolTable());
  }

  addSymbolTable(symbolTable: SharedSymbolTable) : void {
    let versions: SharedSymbolTable[] = this.symbolTables[symbolTable.getName()];
    if (isUndefined(versions)) {
      versions = [];
      this.symbolTables[symbolTable.getName()] = versions;
    }

    versions[symbolTable.getVersion()] = symbolTable;
  }

  findSpecificVersion(name: string, version: number) : SharedSymbolTable {
    let versions: SharedSymbolTable[] = this.symbolTables[name];
    return (versions && versions[version]) || undefined;
  }

  findLatestVersion(name: string) : SharedSymbolTable {
    return max(this.symbolTables[name], byVersion);
  }
}
