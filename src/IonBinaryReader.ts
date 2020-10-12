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

// Binary reader.  This is a user reader built on top of
// the IonParserBinaryRaw parser.
//
// Handles system symbols, and conversion from the parsed
// input byte array  to the desired Javascript value (scalar or
// object, such as IonValue).
import JSBI from "jsbi";
import IntSize from "./IntSize";
import { Catalog } from "./IonCatalog";
import { IVM } from "./IonConstants";
import { Decimal } from "./IonDecimal";
import {
  defaultLocalSymbolTable,
  LocalSymbolTable,
} from "./IonLocalSymbolTable";
import { ParserBinaryRaw } from "./IonParserBinaryRaw";
import { Reader } from "./IonReader";
import { BinarySpan } from "./IonSpan";
import { ion_symbol_table_sid, makeSymbolTable } from "./IonSymbols";
import { Timestamp } from "./IonTimestamp";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { JsbiSupport } from "./JsbiSupport";

const BOC = -2; // beginning of container?
const EOF = -1;
const TB_NULL = 0;
const TB_BOOL = 1;
const TB_INT = 2;
const TB_NEG_INT = 3;
const TB_FLOAT = 4;
const TB_DECIMAL = 5;
const TB_TIMESTAMP = 6;
const TB_SYMBOL = 7;
const TB_STRING = 8;
const TB_CLOB = 9;
const TB_BLOB = 10;
const TB_LIST = 11;
const TB_SEXP = 12;
const TB_STRUCT = 13;

function get_ion_type(t: number): IonType | null {
  switch (t) {
    case TB_NULL:
      return IonTypes.NULL;
    case TB_BOOL:
      return IonTypes.BOOL;
    case TB_INT:
      return IonTypes.INT;
    case TB_NEG_INT:
      return IonTypes.INT;
    case TB_FLOAT:
      return IonTypes.FLOAT;
    case TB_DECIMAL:
      return IonTypes.DECIMAL;
    case TB_TIMESTAMP:
      return IonTypes.TIMESTAMP;
    case TB_SYMBOL:
      return IonTypes.SYMBOL;
    case TB_STRING:
      return IonTypes.STRING;
    case TB_CLOB:
      return IonTypes.CLOB;
    case TB_BLOB:
      return IonTypes.BLOB;
    case TB_LIST:
      return IonTypes.LIST;
    case TB_SEXP:
      return IonTypes.SEXP;
    case TB_STRUCT:
      return IonTypes.STRUCT;
    default:
      return null;
  }
}

export class BinaryReader implements Reader {
  private _parser: ParserBinaryRaw;
  private readonly _cat: Catalog;
  private _symtab: LocalSymbolTable;
  private _raw_type: number;
  private _annotations: string[] | null = null;

  constructor(source: BinarySpan, catalog?: Catalog) {
    this._parser = new ParserBinaryRaw(source);
    this._cat = catalog ? catalog : new Catalog();
    this._symtab = defaultLocalSymbolTable();
    this._raw_type = BOC;
  }

  next(): IonType | null {
    this._annotations = null;

    if (this._raw_type === EOF) {
      return null;
    }
    for (
      this._raw_type = this._parser.next();
      this.depth() === 0;
      this._raw_type = this._parser.next()
    ) {
      if (this._raw_type === TB_SYMBOL) {
        const raw: number | null = this._parser._getSid();
        if (raw !== IVM.sid) {
          break;
        }
        this._symtab = defaultLocalSymbolTable();
      } else if (this._raw_type === TB_STRUCT) {
        if (!this._parser.hasAnnotations()) {
          break;
        }
        if (this._parser.getAnnotation(0) !== ion_symbol_table_sid) {
          break;
        }
        this._symtab = makeSymbolTable(this._cat, this);
      } else {
        break;
      }
    }
    return get_ion_type(this._raw_type);
  }

  stepIn(): void {
    if (!get_ion_type(this._raw_type)!.isContainer) {
      throw new Error("Can't step in to a scalar value");
    }
    this._parser.stepIn();
    this._raw_type = BOC;
  }

  stepOut(): void {
    this._parser.stepOut();
    this._raw_type = BOC;
  }

  type(): IonType | null {
    return get_ion_type(this._raw_type);
  }

  depth(): number {
    return this._parser.depth();
  }

  fieldName(): string | null {
    return this.getSymbolString(this._parser.getFieldId());
  }

  hasAnnotations(): boolean {
    return this._parser.hasAnnotations();
  }

  annotations(): string[] {
    this._loadAnnotations();
    return this._annotations !== null ? this._annotations : [];
  }

  getAnnotation(index: number): string {
    this._loadAnnotations();
    return this._annotations![index];
  }

  isNull(): boolean {
    return this._raw_type === TB_NULL || this._parser.isNull();
  }

  byteValue(): Uint8Array | null {
    return this._parser.byteValue();
  }

  booleanValue(): boolean | null {
    return this._parser.booleanValue();
  }

  decimalValue(): Decimal | null {
    return this._parser.decimalValue();
  }

  bigIntValue(): JSBI | null {
    return this._parser.bigIntValue();
  }

  intSize(): IntSize {
    if (JsbiSupport.isSafeInteger(this.bigIntValue()!)) {
      return IntSize.Number;
    }
    return IntSize.BigInt;
  }

  numberValue(): number | null {
    return this._parser.numberValue();
  }

  stringValue(): string | null {
    const t: BinaryReader = this;
    const p = t._parser;
    switch (get_ion_type(t._raw_type)) {
      case IonTypes.NULL:
        return null;
      case IonTypes.STRING:
        if (this.isNull()) {
          return null;
        }
        return p.stringValue();
      case IonTypes.SYMBOL:
        if (this.isNull()) {
          return null;
        }
        const sid = p._getSid();
        if (sid !== null) {
          return this.getSymbolString(sid);
        }
    }
    throw new Error("Current value is not a string or symbol.");
  }

  timestampValue(): Timestamp | null {
    return this._parser.timestampValue();
  }

  value(): any {
    const type = this.type();
    if (type && type.isContainer) {
      if (this.isNull()) {
        return null;
      }
      throw new Error(
        "Unable to provide a value for " + type.name + " containers."
      );
    }
    switch (type) {
      case IonTypes.NULL:
        return null;
      case IonTypes.BLOB:
      case IonTypes.CLOB:
        return this.byteValue();
      case IonTypes.BOOL:
        return this.booleanValue();
      case IonTypes.DECIMAL:
        return this.decimalValue();
      case IonTypes.INT:
        return this.bigIntValue();
      case IonTypes.FLOAT:
        return this.numberValue();
      case IonTypes.STRING:
      case IonTypes.SYMBOL:
        return this.stringValue();
      case IonTypes.TIMESTAMP:
        return this.timestampValue();
      default:
        throw new Error("There is no current value.");
    }
  }

  private _loadAnnotations(): void {
    if (this._annotations === null) {
      this._annotations = [];
      this._parser.getAnnotations().forEach((id) => {
        this._annotations!.push(this.getSymbolString(id)!);
      });
    }
  }

  private getSymbolString(symbolId: number | null): string | null {
    let s: string | null = null;
    if (symbolId === null) {
      return null;
    }
    if (symbolId > 0) {
      if (symbolId > this._symtab.maxId) {
        throw new Error(
          "Symbol $" + symbolId.toString() + " greater than maxID."
        );
      }
      s = this._symtab.getSymbolText(symbolId);
      if (s === undefined) {
        throw new Error("symbol is unresolvable");
        // s = "$" + symbolId.toString();
        // todo turn this back on once symbol table imports are supported and lst context transfer is supported.
      }
    } else if (symbolId === 0) {
      throw new Error("Symbol ID zero is unsupported");
    } else if (symbolId < 0) {
      throw new Error("Negative symbol ID: " + symbolId + " is illegal.");
    }
    return s;
  }
}
