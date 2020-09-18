/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/**
 * An Ion symbol token (used to represent field names, annotations,
 * and symbol values) providing both the symbol text and the assigned
 * symbol ID.
 */
export class SymbolToken {
  private static _UNKNOWN_SYMBOL_ID = -1;

  constructor(
    private text: string | null,
    private sid: number = SymbolToken._UNKNOWN_SYMBOL_ID
  ) {}

  /**
   * Returns the text of this symbol, or null if the text is unknown.
   */
  public getText(): string | null {
    return this.text;
  }

  /**
   * Returns the symbol ID (sid) of this symbol, or -1 if the sid is unknown.
   */
  public getSid(): number {
    return this.sid;
  }
}
