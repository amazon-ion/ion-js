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
import { SymbolTable } from "./IonSymbolTable";

export class Import {
  private name: string;
  private version: number;
  private maxId: number;

  constructor(name: string, version: number, maxId?: number) {
    this.name = name;
    this.version = version;
    this.maxId = maxId;
  }

  getName() : string {
    return this.name;
  }

  getVersion() : number {
    return this.version;
  }

  getMaxId() : number {
    return this.maxId;
  }
}
