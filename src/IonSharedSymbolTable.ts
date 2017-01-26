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
export class SharedSymbolTable {
  constructor(
    private readonly _name: string,
    private readonly _version: number,
    private readonly _symbols: string[]
  ) {}

  get name() : string {
    return this._name;
  }

  get version() : number {
    return this._version;
  }

  get symbols() : string[] {
    return this._symbols;
  }
}
