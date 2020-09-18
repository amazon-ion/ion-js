import * as ion from "../Ion";
import { IntSize, IonTypes, makeReader, Reader, ReaderBuffer } from "../Ion";
import { Value } from "./Value";
import { Struct } from "./Struct";
import { List } from "./List";
import { SExpression } from "./SExpression";
import { Null } from "./Null";
import { Boolean } from "./Boolean";
import { Integer } from "./Integer";
import { Float } from "./Float";
import { Decimal } from "./Decimal";
import { Timestamp } from "./Timestamp";
import { Symbol } from "./Symbol";
import { String } from "./String";
import { Clob } from "./Clob";
import { Blob } from "./Blob";
import { TextReader } from "../IonTextReader";
import { BinaryReader } from "../IonBinaryReader";

/**
 * Reads the provided Ion data source into memory, constructing Value objects to represent
 * each value found in the stream.
 *
 * This approach to reading is less efficient at runtime than using the streaming Reader API
 * (next(), stepIn(), stepOut(), etc), but is often much simpler to use.
 *
 * If `ionData` is a ReaderBuffer, a new Reader will be created to process it.
 * If it is already a Reader, it will be consumed fully.
 *
 * If `ionData` does not contain any values, an empty array will be returned.
 *
 * @param ionData   A source of Ion data (text or binary) to load into memory.
 * @returns         An array of Value objects representing the values found in the stream.
 */
export function loadAll(ionData: ReaderBuffer | Reader): Value[] {
  let reader = _createReader(ionData);
  let ionValues: Value[] = [];
  while (reader.next()) {
    ionValues.push(_loadValue(reader));
  }
  return ionValues;
}

/**
 * Reads the first value from the provided Ion data source into memory, constructing
 * a Value object to represent it.
 *
 * This approach to reading is less efficient at runtime than using the streaming Reader API
 * (next(), stepIn(), stepOut(), etc), but is often much simpler to use.
 *
 * If `ionData` is a ReaderBuffer, a new Reader will be created to process it.
 * If `ionData` is already a Reader, it will be used as-is.
 *
 * `load` will check to see if the Reader is already positioned over a value. If it is,
 * that value will be loaded. If it is not, `load` will call `next()` once.
 *
 * If no value is found, `load` will return null.
 *
 * @param ionData   A source of Ion data (text or binary) to load into memory.
 * @returns         A Value object representing the first value found in the stream
 *                  or null if the stream is empty.
 */
export function load(ionData: ReaderBuffer | Reader): Value | null {
  let reader = _createReader(ionData);
  if (reader.type() === null) {
    reader.next();
  }
  return reader.type() === null ? null : _loadValue(reader);
}

function _createReader(ionData: ReaderBuffer | Reader): Reader {
  // If the provided parameter is already a reader, no new work is required.
  // However, we cannot simply test `ionData instanceof Reader` because `Reader`
  // is an interface.
  if (ionData instanceof TextReader || ionData instanceof BinaryReader) {
    return ionData as Reader;
  }
  return makeReader(ionData as ReaderBuffer);
}

// Loads the Reader's current value, returning it as a DOM Value
function _loadValue(reader: Reader): Value {
  let ionType = reader.type();
  if (ionType === null) {
    throw new Error(
      "loadValue() called when no further values were available to read."
    );
  }
  let annotations: string[] = reader.annotations();
  if (reader.isNull()) {
    return new Null(reader.type()!, annotations);
  }
  switch (ionType) {
    case IonTypes.NULL:
      return new Null(IonTypes.NULL, annotations);
    case IonTypes.BOOL:
      return new ion.dom.Boolean(reader.booleanValue()!, annotations);
    case IonTypes.INT:
      return reader.intSize() == IntSize.Number
        ? new Integer(reader.numberValue()!, annotations)
        : new Integer(reader.bigIntValue()!, annotations);
    case IonTypes.FLOAT:
      return new Float(reader.numberValue()!, annotations);
    case IonTypes.DECIMAL:
      return new Decimal(reader.decimalValue()!, annotations);
    case IonTypes.TIMESTAMP:
      return new Timestamp(reader.timestampValue()!, annotations);
    case IonTypes.SYMBOL:
      return new Symbol(reader.stringValue()!, annotations);
    case IonTypes.STRING:
      return new ion.dom.String(reader.stringValue()!, annotations);
    case IonTypes.CLOB:
      return new Clob(reader.byteValue()!, annotations);
    case IonTypes.BLOB:
      return new Blob(reader.byteValue()!, annotations);
    // Containers
    case IonTypes.LIST:
      return _loadList(reader);
    case IonTypes.SEXP:
      return _loadSExpression(reader);
    case IonTypes.STRUCT:
      return _loadStruct(reader);
    default:
      throw new Error(`Unrecognized IonType '${ionType}' found.`);
  }
}

function _loadStruct(reader: Reader): Struct {
  let children: Map<string, Value> = new Map();
  let annotations: string[] = reader.annotations();
  reader.stepIn();
  while (reader.next()) {
    children.set(reader.fieldName()!, _loadValue(reader));
  }
  reader.stepOut();
  return new Struct(children.entries(), annotations);
}

function _loadList(reader: Reader): List {
  let annotations = reader.annotations();
  return new List(_loadSequence(reader), annotations);
}

function _loadSExpression(reader: Reader): SExpression {
  let annotations = reader.annotations();
  return new SExpression(_loadSequence(reader), annotations);
}

function _loadSequence(reader: Reader): Value[] {
  let children: Value[] = [];
  reader.stepIn();
  while (reader.next()) {
    children.push(_loadValue(reader));
  }
  reader.stepOut();
  return children;
}

export { Value, PathElement } from "./Value";
export { Null } from "./Null";
export { Boolean } from "./Boolean";
export { Integer } from "./Integer";
export { Float } from "./Float";
export { Decimal } from "./Decimal";
export { Timestamp } from "./Timestamp";
export { String } from "./String";
export { Symbol } from "./Symbol";
export { Blob } from "./Blob";
export { Clob } from "./Clob";
export { Struct } from "./Struct";
export { List } from "./List";
export { SExpression } from "./SExpression";
