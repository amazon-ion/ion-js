import { Decimal, dom, Timestamp } from "../Ion";
import { IonType } from "../IonType";
import { IonTypes } from "../IonTypes";
import { _hasValue } from "../util";
import { Value } from "./Value";

// In ./Boolean.ts and ./String.ts, the native Boolean and String types
// are shadowed by the export class defined in the file, but said class
// definitions still need to reference the original class definitions.
// This provides a mechanism for doing so.
export const _NativeJsBoolean = Boolean;
export const _NativeJsString = String;

// Typescript interfaces can be used to describe classes' static methods; this can
// be a bit surprising as the methods in the interface are not marked 'static' and
// the class definition does not need to indicate that it implements this interface.
//
// This interface describes classes that offer a static constructor that accepts an
// untyped Javascript value and an optional annotations array as its parameter. Because
// the dom.Value mixin provides a default implementation of this method, all dom.Value
// subtypes implicitly implement this interface.
//
// Package visible for testing.
export interface FromJsValue {
  _fromJsValue(jsValue: any, annotations: string[]): Value;
}

// When Typescript is compiling this code, dom/index.ts depends on Value.ts which in turn
// depends on this file. This means that 'dom' is still being defined and we cannot yet
// reference any of the Value subtypes (dom.Integer, dom.String, etc). We can sidestep this
// issue by lazily initializing this mapping, deferring any reference to those types until
// they are first used.
let _domTypesByIonType: Map<IonType, FromJsValue> | null = null;

// Lazily initializes our IonType -> Dom type constructor mapping.
function _getDomTypesByIonTypeMap(): Map<IonType, FromJsValue> {
  if (_domTypesByIonType === null) {
    // Clob, SExpression, and Symbol are not included here as _inferType always
    // favors Blob, List, and String respectively.
    _domTypesByIonType = new Map<IonType, FromJsValue>([
      [IonTypes.NULL, dom.Null],
      [IonTypes.BOOL, dom.Boolean],
      [IonTypes.INT, dom.Integer],
      [IonTypes.FLOAT, dom.Float],
      [IonTypes.DECIMAL, dom.Decimal],
      [IonTypes.TIMESTAMP, dom.Timestamp],
      [IonTypes.STRING, dom.String],
      [IonTypes.BLOB, dom.Blob],
      [IonTypes.LIST, dom.List],
      [IonTypes.STRUCT, dom.Struct],
    ]);
  }
  return _domTypesByIonType;
}

// Returns a dom type constructor for the provided IonType.
// This function is exported to assist in unit testing but is not visible at the library level.
export function _domConstructorFor(ionType: IonType): FromJsValue {
  const domConstructor = _getDomTypesByIonTypeMap().get(ionType)!;
  if (!_hasValue(domConstructor)) {
    throw new Error(
      `No dom type constructor was found for Ion type ${ionType.name}`
    );
  }
  return domConstructor;
}

// Examines the provided JS value and returns the IonType best suited to represent it.
// This function will never return Clob, SExpression, and Symbol; it will always
// favor Blob, List, and String respectively.
function _inferType(value: any): IonType {
  if (value === undefined) {
    throw new Error("Cannot create an Ion value from `undefined`.");
  }
  if (value === null) {
    return IonTypes.NULL;
  }

  const valueType: string = typeof value;
  switch (valueType) {
    case "string":
      return IonTypes.STRING;
    case "number":
      return Number.isInteger(value) ? IonTypes.INT : IonTypes.FLOAT;
    case "boolean":
      return IonTypes.BOOL;
    case "object":
      break;
    case "bigint":
      return IonTypes.INT;
    // TODO: Javascript symbols are not a 1:1 match for Ion symbols, but we may wish
    //       to support them in Value.from() anyway.
    // case "symbol":
    default:
      throw new Error(
        `Value.from() does not support the JS primitive type ${valueType}.`
      );
  }

  if (value instanceof BigInt) {
    return IonTypes.INT;
  }
  if (value instanceof Number) {
    return Number.isInteger(value.valueOf()) ? IonTypes.INT : IonTypes.FLOAT;
  }
  if (value instanceof Boolean) {
    return IonTypes.BOOL;
  }
  if (value instanceof String) {
    return IonTypes.STRING;
  }
  if (value instanceof Decimal) {
    return IonTypes.DECIMAL;
  }
  if (value instanceof Date || value instanceof Timestamp) {
    return IonTypes.TIMESTAMP;
  }
  if (value instanceof Uint8Array) {
    return IonTypes.BLOB;
  }
  if (value instanceof Array) {
    return IonTypes.LIST;
  }
  return IonTypes.STRUCT;
}

// Inspects the provided JS value and constructs a new instance of the appropriate Ion
// type using that value.
export function _ionValueFromJsValue(
  value: any,
  annotations: string[] = []
): Value {
  const ionType = _inferType(value);
  const ionTypeConstructor: FromJsValue = _domConstructorFor(ionType);
  return ionTypeConstructor._fromJsValue(value, annotations);
}
