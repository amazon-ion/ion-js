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
import { Index } from "./IonIndex";
import { Symbol } from "./IonSymbol";
import { SymbolTable } from "./IonSymbolTable";
import { UserSymbolTable } from "./IonUserSymbolTable";

class SystemSymbolTable implements SymbolTable {
  private delegate: UserSymbolTable;

  constructor(delegate: UserSymbolTable) {
    this.delegate = delegate;
  }

  private no_change() : never {
    throw new Error("can't change the system symbol table");
  }

  addName(name: string) : number {
    this.no_change();
    return undefined;
  }

  addSymbol(sym: Symbol) : number {
    this.no_change();
    return undefined;
  }

  getId(name: string) : number {
    return this.delegate.getId(name);
  }

  getSymbol(id: number) : string {
    return this.delegate.getSymbol(id);
  }

  getIndex() : Index {
    return this.delegate.getIndex();
  }

  getSymbols() : Symbol[] {
    return this.delegate.getSymbols();
  }
}

const systemSymbolTable: SystemSymbolTable = new SystemSymbolTable(
  new UserSymbolTable(
    "$ion",
    1,
    [], // no imports
    [
      "$ion",
      "$ion_1_0",
      "$ion_symbol_table",
      "name",
      "version",
      "imports",
      "symbols",
      "max_id",
      "$ion_shared_symbol_table",
    ],
    undefined
  )
);

export function getSystemSymbolTable() : SymbolTable {
  return systemSymbolTable;
}
