/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { CharCodes } from "./IonText";
import { ClobEscapes } from "./IonText";
import { Decimal } from "./IonDecimal";
import { encodeUtf8 } from "./IonUnicode";
import { isIdentifier } from "./IonText";
import { isNullOrUndefined } from "./IonUtilities";
import { isUndefined } from "./IonUtilities";
import { Timestamp } from "./IonTimestamp";
import { toBase64 } from "./IonText";
import { TypeCodes } from "./IonBinary";
import { Writeable } from "./IonWriteable";
import { Writer } from "./IonWriter";

export class TextWriter implements Writer {
  constructor(private readonly writeable: Writeable) {}

  writeBlob(value: number[], annotations?: string[]) : void {
    if (isNullOrUndefined(value)) {
      this.writeNull(TypeCodes.BLOB, annotations);
      return;
    }

    this.writeAnnotations(annotations);
    this.writeUtf8('{{');
    this.writeable.writeBytes(encodeUtf8(toBase64(value)));
    this.writeUtf8('}}');
  }

  writeBoolean(value: boolean, annotations?: string[]) : void {
    if (isNullOrUndefined(value)) {
      this.writeNull(TypeCodes.BOOL);
      return;
    }

    this.writeAnnotations(annotations);
    this.writeUtf8(value ? "true" : "false");
  }

  writeClob(value: number[], annotations?: string[]) : void {
    if (isNullOrUndefined(value)) {
      this.writeNull(TypeCodes.CLOB);
      return;
    }

    this.writeAnnotations(annotations);
    this.writeUtf8('{{');
    this.writeUtf8('"');
    for (let i : number = 0; i < value.length; i++) {
      let c : number = value[i];
      if (c >= 128) {
        throw new Error(`Illegal clob character ${c} at index ${i}`);
      }
      let escape: number[] = ClobEscapes[c];
      if (isUndefined(escape)) {
        this.writeable.writeByte(c);
      } else {
        this.writeable.writeBytes(escape);
      }
    }
    this.writeUtf8('"');
    this.writeUtf8('}}');
  }

  writeDecimal(value: Decimal, annotations?: string[]) : void {
    if (isNullOrUndefined(value)) {
      this.writeNull(TypeCodes.DECIMAL, annotations);
      return;
    }

    this.writeAnnotations(annotations);
    this.writeUtf8(value.toString());
  }

  writeFieldName(fieldName: string) : void {}
  writeFloat32(value: number, annotations?: string[]) : void {}
  writeFloat64(value: number, annotations?: string[]) : void {}
  writeInt(value: number, annotations?: string[]) : void {}
  writeList(annotations?: string[], isNull?: boolean) : void {}

  writeNull(type_: TypeCodes, annotations?: string[]) : void {
    this.writeAnnotations(annotations);
    let s: string;
    switch (type_) {
      case TypeCodes.NULL:
        s = "null";
        break;
      case TypeCodes.BOOL:
        s = "bool";
        break;
      case TypeCodes.POSITIVE_INT:
      case TypeCodes.NEGATIVE_INT:
        s = "int";
        break;
      case TypeCodes.FLOAT:
        s = "float";
        break;
      case TypeCodes.DECIMAL:
        s = "decimal";
        break;
      case TypeCodes.TIMESTAMP:
        s = "timestamp";
        break;
      case TypeCodes.SYMBOL:
        s = "symbol";
        break;
      case TypeCodes.STRING:
        s = "string";
        break;
      case TypeCodes.CLOB:
        s = "clob";
        break;
      case TypeCodes.BLOB:
        s = "blob";
        break;
      case TypeCodes.LIST:
        s = "list";
        break;
      case TypeCodes.SEXP:
        s = "sexp";
        break;
      case TypeCodes.STRUCT:
        s = "struct";
        break;
      default:
        throw new Error(`Cannot write null for type ${type_}`); 
    }
    this.writeUtf8("null." + s);
  }

  writeSexp(annotations?: string[], isNull?: boolean) : void {}
  writeString(value: string, annotations?: string[]) : void {}
  writeStruct(annotations?: string[], isNull?: boolean) : void {}

  writeSymbol(value: string, annotations?: string[]) : void {
    if (isNullOrUndefined(value)) {
      this.writeNull(TypeCodes.SYMBOL, annotations);
      return;
    }

    this.writeAnnotations(annotations);
    this.writeSymbolToken(value);
  }
  writeTimestamp(value: Timestamp, annotations?: string[]) : void {}

  close() : void {}
  endContainer() : void {}

  private writeUtf8(s: string) : void {
    this.writeable.writeBytes(encodeUtf8(s));
  }

  private writeAnnotations(annotations: string[]) : void {
    if (isNullOrUndefined(annotations)) {
      return;
    }

    for (let annotation of annotations) {
      this.writeSymbolToken(annotation);
      this.writeUtf8('::');
    }
  }


  private writeSymbolToken(s: string) : void {
    if (isIdentifier(s)) {
      this.writeUtf8(s);
    } else {
      this.writeable.writeByte(CharCodes.SINGLE_QUOTE);
      this.writeUtf8(s);
      this.writeable.writeByte(CharCodes.SINGLE_QUOTE);
    }
  }
}
