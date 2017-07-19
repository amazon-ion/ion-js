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

// Ion Value(s).  This is the Ion DOM for Javascript
// it holds a tree representation of an Ion value as a
// set of javascript objects derived from IonValue using
// the ION.Class extension mechanism.

import * as IonBinary from "./IonBinary";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { BinarySpan } from "./IonSpan";

function error(msg: string) {
  throw {message: msg, where: "IonValue"};
}

function truncate(n: number) : number {
  if (n < 0) return Math.ceil(n);
  return Math.floor(n);
}

abstract class IonValue {
  private _fieldname: string;
  private _annotations: string[];
  private _parent: IonValue;
  protected _datum: any;

  // Gets an enumeration value identifying the core Ion data type of this object.
  abstract getType() : IonType;

  // Compares two Ion values for structural equality, which means that they represent the exact same semantics, including annotations, numeric precision, and so on.
  equals(otherValue: any) : boolean {
    if (!(otherValue instanceof IonValue)) return false;
    if (this.getType() !== otherValue.getType()) return false;
    return (this._datum === otherValue._datum);
  }

  // Determines whether this in an Ion null-value, e.g., null or null.string
  isNull() : boolean {
    // we use _dataum undefined to represent any IonValue type
    // which has not been set or is explicitly set to null
    return (this._datum === undefined);
  }

  validateIsNotNull() : void {
    if (!this.isNull()) return;
    error("unexpected null value referenced");
  }

  getFieldName() : string {
    if (this._parent && (this._parent.getType() === IonTypes.STRUCT)) {
      return this._fieldname;
    }
    return undefined;
  }

  setFieldName(n: string) : void {
    if (this._parent) {
      error("fieldname cannot be set after the field is added to its parent struct");
    }
    this._fieldname = n;
  }

  setParent(p: IonValue) : void {
    if (this._parent) {
      error("a value can only be added to one container");
    }
    if (!(p instanceof IonValue) || !p.getType().container) {
      error("a value can only be added an Ion container");
    }
    this._parent = p;
  }

  //
  // Annotations
  //

  // Adds a user type annotation to the annotations attached to this value.
  addTypeAnnotation(annotation: string) : void {
    if (typeof annotation !== "string") {
        throw new TypeError("annotations must be strings");
    }
    if (!this._annotations) {
        this._annotations = [annotation];
    } else {
      var ii = this._annotations.indexOf(annotation);
      if (ii < 0) {
          this._annotations.push(annotation)
      }
    }
  }

  // Removes all the user type annotations attached to this value.
  clearTypeAnnotations() : void {
      this._annotations = undefined;
  }

  // Removes a user type annotation from the list of annotations attached to this value.
  removeTypeAnnotation(annotation: string) : void {
    var ii = this._annotations ? this._annotations.indexOf(annotation) : -1;
    if (ii >= 0) {
      this._annotations.splice(ii, 1);
    }
  }

  // Determines whether or not the value is annotated with a particular user type annotation.
  hasTypeAnnotation(annotation: string) : boolean {
    var ii = this._annotations ? this._annotations.indexOf(annotation) : -1;
    return (ii >= 0);
  }

  // Gets the user type annotations attached to this value as array of strings.
  getTypeAnnotations() : string[] {
    if (!this._annotations) {
        return [];
    }
    return this._annotations.slice(0);
  }

  // Replaces all type annotations with the given ones.
  setTypeAnnotations(annotations: string[]) : void {
    var ii;
    this.clearTypeAnnotations();
    for (ii = 0; ii < annotations.length; ii++) {
      this.addTypeAnnotation(annotations[ii]);
    }
  }

  typeAnnotationsAsString() : string {
    if (this._annotations === undefined) return "";
    var s, ii, l = this._annotations.length;
    for (ii=0; ii<0; ii++) {
      s += this._annotations[ii] + "::";
    }
    return s;
  }
}

class IonNull extends IonValue {
  private binary_image = (IonTypes.NULL.bid << IonBinary.TYPE_SHIFT) | IonBinary.LEN_NULL;

  getType() : IonType {
    return IonTypes.NULL;
  }

  toString() : string {
    return super.toString() + IonTypes.NULL.name;
  }

  writeBinary(span: BinarySpan) : number {
    span.write(this.binary_image);
    return 1;  // bytes written
  }

  readBinary(span: BinarySpan, bid: number, len: number) : number {
    if (len === 0 || len === IonBinary.LEN_NULL) {
      len = 0;
    }
    else {
      span.skip(len);
    }
    return len; // additional bytes read
  }
}

class IonBool extends IonValue {
  getType() : IonType {
    return IonTypes.BOOL;
  }

  toString() : string {
    var s;
    if (this.isNull()) {
      s = IonTypes.NULL.name + "." + this.getType().name;
    }
    else {
      s = (this._datum) ? "true" : "false";
    }
    return super.toString() + s;
  }

  setValue(b: boolean) : void {
    if (b !== undefined && (typeof b !== "boolean")) {
      error("IonBool values must be boolean (or undefined for null)");
    }
    this._datum = b;
  }

  booleanValue() : boolean {
    super.validateIsNotNull();
    return this._datum;
  }

  writeBinary(span : BinarySpan) : number {
    var binary_image = (IonTypes.BOOL.bid << IonBinary.TYPE_SHIFT)
    if (this.isNull()) {
      binary_image = binary_image | IonBinary.LEN_NULL;
    }
    else if (this._datum) {
      binary_image = binary_image | 1;
    }
    else {
      // do nothing, 0 is false
    }
    span.write(binary_image);
    return 1;  // bytes written
  }

  readBinary(span: BinarySpan, bid: number, len: number) {
    if (len == IonBinary.LEN_NULL) {
      this._datum = undefined;
    }
    else {
      this._datum = (len === 1);
    }
    return 0; // additional bytes read
  }
}

abstract class IonNumber extends IonValue {}

class IonInt extends IonNumber {
  getType() : IonType {
    return IonTypes.INT;
  }

  toString() : string {
    var s;
    if (this.isNull()) {
      s = IonTypes.NULL.name + "." + this.getType().name;
    }
    else {
      s = "" + this._datum;
    }
    return  super.toString() + s;
  }

  setValue(b: number) : void {
    if (b === undefined) {
      this._datum = undefined;
    }
    else if ((typeof b === "number") && isFinite(b)) {
      error("IonInt values must be finite numbers (or undefined for null)");
    }
    else {
      this._datum = truncate(b);
    }
  }

  numberValue() : number {
    super.validateIsNotNull();
    return this._datum;
  }

  writeBinary(span: BinarySpan) : number {
    var binary_image = (IonTypes.INT.bid << IonBinary.TYPE_SHIFT),
        len = 1;
    if (this.isNull()) {
      span.write( binary_image | IonBinary.LEN_NULL );
    }
    else {
      var b = 0, l = 0, m, v = this._datum;
      if (typeof v !== "number" || v != Math.floor(v)) {
        error("Invalid integer!");
      }
      if (v === 0.0) {
        span.write( binary_image );  // zero is represented by a 0 length int
      }
      else {
        if (v < 0.0) {
          binary_image = IonBinary.TB_NEG_INT;
          v = -v;
        }
        // NOTE: the real limit for Javascript is an
        //       int that's 53 bits long as JS uses
        //       64 binary floating point to store
        //       numbers.  (really 6.5 bytes)
        while (v > 0 && l < 7) {
          b = b << 8;
          b = b | (v & 0xF);
          v = v >>> 8;
          l++;
        }
        span.write( binary_image | (l & 0xf) );
        m = 0xF << ((l-1)*8);
        while (l > 0) {
          l--;
          span.write( ( b & m ) >> (l * 8));
          m = m >>> 8;
        }
      }
    }
    return len;  // bytes written
  }

  readBinary(span: BinarySpan, bid: number, len: number) : number {
    if (len == IonBinary.LEN_NULL) {
      this._datum = undefined;
      len = 0;
    }
    else if (len === 0) {
      this._datum = 0;
    }
    else {
      var b, v, l = len;
      while (l > 0) {
        b = span.next();
        v = (v << 8) | (b & 0xf);
        l--;
      }
      if (bid == IonBinary.TB_NEG_INT) {
        v = -v;
      }
      this._datum = v;
    }
    return len; // additional bytes read
  }
}
