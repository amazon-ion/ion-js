(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ion = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AbstractWriter = void 0;
const IonTypes_1 = require("./IonTypes");
class AbstractWriter {
  constructor() {
    this._annotations = [];
  }
  addAnnotation(annotation) {
    if (!this._isString(annotation)) {
      throw new Error("Annotation must be of type string.");
    }
    this._annotations.push(annotation);
  }
  setAnnotations(annotations) {
    if (annotations === undefined || annotations === null) {
      throw new Error("Annotations were undefined or null.");
    } else if (!this._validateAnnotations(annotations)) {
      throw new Error("Annotations must be of type string[].");
    } else {
      this._annotations = annotations;
    }
  }
  writeValues(reader) {
    this._writeValues(reader);
  }
  writeValue(reader) {
    this._writeValue(reader);
  }
  _clearAnnotations() {
    this._annotations = [];
  }
  _writeValues(reader) {
    let type = reader.type();
    if (type === null) {
      type = reader.next();
    }
    while (type !== null) {
      this._writeValue(reader);
      type = reader.next();
    }
  }
  _writeValue(reader) {
    const type = reader.type();
    if (type === null) {
      return;
    }
    if (this._isInStruct()) {
      const fieldName = reader.fieldName();
      if (fieldName === null) {
        throw new Error("Cannot call writeValue() when the Writer is in a Struct but the Reader is not.");
      }
      this.writeFieldName(fieldName);
    }
    this.setAnnotations(reader.annotations());
    if (reader.isNull()) {
      this.writeNull(type);
      return;
    }
    switch (type) {
      case IonTypes_1.IonTypes.BOOL:
        this.writeBoolean(reader.booleanValue());
        break;
      case IonTypes_1.IonTypes.INT:
        this.writeInt(reader.bigIntValue());
        break;
      case IonTypes_1.IonTypes.FLOAT:
        this.writeFloat64(reader.numberValue());
        break;
      case IonTypes_1.IonTypes.DECIMAL:
        this.writeDecimal(reader.decimalValue());
        break;
      case IonTypes_1.IonTypes.TIMESTAMP:
        this.writeTimestamp(reader.timestampValue());
        break;
      case IonTypes_1.IonTypes.SYMBOL:
        this.writeSymbol(reader.stringValue());
        break;
      case IonTypes_1.IonTypes.STRING:
        this.writeString(reader.stringValue());
        break;
      case IonTypes_1.IonTypes.CLOB:
        this.writeClob(reader.uInt8ArrayValue());
        break;
      case IonTypes_1.IonTypes.BLOB:
        this.writeBlob(reader.uInt8ArrayValue());
        break;
      case IonTypes_1.IonTypes.LIST:
        this.stepIn(IonTypes_1.IonTypes.LIST);
        break;
      case IonTypes_1.IonTypes.SEXP:
        this.stepIn(IonTypes_1.IonTypes.SEXP);
        break;
      case IonTypes_1.IonTypes.STRUCT:
        this.stepIn(IonTypes_1.IonTypes.STRUCT);
        break;
      default:
        throw new Error("Unrecognized type " + (type !== null ? type.name : type));
    }
    if (type.isContainer) {
      reader.stepIn();
      this._writeValues(reader);
      this.stepOut();
      reader.stepOut();
    }
  }
  _validateAnnotations(input) {
    if (!Array.isArray(input)) {
      return false;
    }
    for (let i = 0; i < input.length; i++) {
      if (!this._isString(input[i])) {
        return false;
      }
    }
    return true;
  }
  _isString(input) {
    return typeof input === "string";
  }
}
exports.AbstractWriter = AbstractWriter;

},{"./IonTypes":29}],2:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BigIntSerde = void 0;
class BigIntSerde {
  static toSignedIntBytes(value, isNegative) {
    let bytes = this.toUnsignedIntBytes(value);
    if (bytes[0] >= 128) {
      const extendedBytes = new Uint8Array(bytes.length + 1);
      extendedBytes.set(bytes, 1);
      bytes = extendedBytes;
    }
    if (isNegative) {
      bytes[0] += 0x80;
    }
    return bytes;
  }
  static fromUnsignedBytes(bytes) {
    let magnitude = 0n;
    for (let m = 0; m < bytes.length; m++) {
      const byte = BigInt(bytes[m]);
      magnitude = magnitude << this.BITS_PER_BYTE;
      magnitude = magnitude | byte;
    }
    return magnitude;
  }
  static toUnsignedIntBytes(value) {
    if (value < 0n) {
      value = -value;
    }
    const sizeInBytes = this.getUnsignedIntSizeInBytes(value);
    const bytes = new Uint8Array(sizeInBytes);
    for (let m = sizeInBytes - 1; m >= 0; m--) {
      const lastByte = Number(value & this.BYTE_MAX_VALUE);
      value = value >> this.BITS_PER_BYTE;
      bytes[m] = lastByte;
    }
    return bytes;
  }
  static getUnsignedIntSizeInBytes(value) {
    for (let m = 0; m < this.SIZE_THRESHOLDS.length; m++) {
      const threshold = this.SIZE_THRESHOLDS[m];
      if (value <= threshold) {
        return m + 1;
      }
    }
    let sizeInBytes = this.SIZE_THRESHOLDS.length;
    let threshold = this.calculateSizeThreshold(sizeInBytes);
    while (value > threshold) {
      sizeInBytes++;
      threshold = this.calculateSizeThreshold(sizeInBytes);
    }
    return sizeInBytes;
  }
  static calculateSizeThresholds() {
    const thresholds = [];
    for (let m = 1; m <= this.SERIALIZED_BIGINT_SIZES_TO_PRECOMPUTE; m++) {
      thresholds.push(this.calculateSizeThreshold(m));
    }
    return thresholds;
  }
  static calculateSizeThreshold(numberOfBytes) {
    const exponent = BigInt(numberOfBytes) * this.BITS_PER_BYTE;
    const threshold = 2n ** exponent;
    return threshold - 1n;
  }
}
exports.BigIntSerde = BigIntSerde;
BigIntSerde.SERIALIZED_BIGINT_SIZES_TO_PRECOMPUTE = 64;
BigIntSerde.BITS_PER_BYTE = 8n;
BigIntSerde.BYTE_MAX_VALUE = BigInt(0xff);
BigIntSerde.SIZE_THRESHOLDS = BigIntSerde.calculateSizeThresholds();

},{}],3:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ComparisonResult = exports.ComparisonResultType = void 0;
var ComparisonResultType;
(function (ComparisonResultType) {
  ComparisonResultType["EQUAL"] = "EQUAL";
  ComparisonResultType["NOT_EQUAL"] = "NOT_EQUAL";
  ComparisonResultType["ERROR"] = "ERROR";
})(ComparisonResultType = exports.ComparisonResultType || (exports.ComparisonResultType = {}));
class ComparisonResult {
  constructor() {
    let result = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ComparisonResultType.EQUAL;
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
    let actualIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    let expectedIndex = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    this.result = result;
    this.message = message;
    this.actualIndex = actualIndex;
    this.expectedIndex = expectedIndex;
  }
}
exports.ComparisonResult = ComparisonResult;

},{}],4:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IntSize = void 0;
var IntSize;
(function (IntSize) {
  IntSize[IntSize["Number"] = 0] = "Number";
  IntSize[IntSize["BigInt"] = 1] = "BigInt";
})(IntSize = exports.IntSize || (exports.IntSize = {}));
exports.default = IntSize;

},{}],5:[function(require,module,exports){
"use strict";

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
var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dom = exports.IntSize = exports.dumpPrettyText = exports.dumpText = exports.dumpBinary = exports.makeBinaryWriter = exports.makePrettyWriter = exports.makeTextWriter = exports.makeReader = void 0;
const IntSize_1 = __importDefault(require("./IntSize"));
exports.IntSize = IntSize_1.default;
const IonBinaryReader_1 = require("./IonBinaryReader");
const IonBinaryWriter_1 = require("./IonBinaryWriter");
const IonConstants_1 = require("./IonConstants");
const IonLocalSymbolTable_1 = require("./IonLocalSymbolTable");
const IonPrettyTextWriter_1 = require("./IonPrettyTextWriter");
const IonSpan_1 = require("./IonSpan");
const IonTextReader_1 = require("./IonTextReader");
const IonTextWriter_1 = require("./IonTextWriter");
const IonUnicode_1 = require("./IonUnicode");
const IonWriteable_1 = require("./IonWriteable");
function isBinary(buffer) {
  if (buffer.length < 4) {
    return false;
  }
  for (let i = 0; i < 4; i++) {
    if (buffer[i] !== IonConstants_1.IVM.binary[i]) {
      return false;
    }
  }
  return true;
}
function makeReader(buf, catalog) {
  if (typeof buf === "string") {
    return new IonTextReader_1.TextReader(new IonSpan_1.StringSpan(buf), catalog);
  }
  const bufArray = new Uint8Array(buf);
  if (isBinary(bufArray)) {
    return new IonBinaryReader_1.BinaryReader(new IonSpan_1.BinarySpan(bufArray), catalog);
  } else {
    return new IonTextReader_1.TextReader(new IonSpan_1.StringSpan(IonUnicode_1.decodeUtf8(bufArray)), catalog);
  }
}
exports.makeReader = makeReader;
function makeTextWriter() {
  return new IonTextWriter_1.TextWriter(new IonWriteable_1.Writeable());
}
exports.makeTextWriter = makeTextWriter;
function makePrettyWriter(indentSize) {
  return new IonPrettyTextWriter_1.PrettyTextWriter(new IonWriteable_1.Writeable(), indentSize);
}
exports.makePrettyWriter = makePrettyWriter;
function makeBinaryWriter() {
  const localSymbolTable = IonLocalSymbolTable_1.defaultLocalSymbolTable();
  return new IonBinaryWriter_1.BinaryWriter(localSymbolTable, new IonWriteable_1.Writeable());
}
exports.makeBinaryWriter = makeBinaryWriter;
function _writeAllTo(writer, values) {
  for (const value of values) {
    dom.Value.from(value).writeTo(writer);
  }
  writer.close();
  return writer.getBytes();
}
function dumpBinary() {
  for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
    values[_key] = arguments[_key];
  }
  return _writeAllTo(makeBinaryWriter(), values);
}
exports.dumpBinary = dumpBinary;
function dumpText() {
  for (var _len2 = arguments.length, values = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    values[_key2] = arguments[_key2];
  }
  return IonUnicode_1.decodeUtf8(_writeAllTo(makeTextWriter(), values));
}
exports.dumpText = dumpText;
function dumpPrettyText() {
  for (var _len3 = arguments.length, values = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    values[_key3] = arguments[_key3];
  }
  return IonUnicode_1.decodeUtf8(_writeAllTo(makePrettyWriter(), values));
}
exports.dumpPrettyText = dumpPrettyText;
var IonCatalog_1 = require("./IonCatalog");
Object.defineProperty(exports, "Catalog", {
  enumerable: true,
  get: function () {
    return IonCatalog_1.Catalog;
  }
});
var IonDecimal_1 = require("./IonDecimal");
Object.defineProperty(exports, "Decimal", {
  enumerable: true,
  get: function () {
    return IonDecimal_1.Decimal;
  }
});
var IonLocalSymbolTable_2 = require("./IonLocalSymbolTable");
Object.defineProperty(exports, "defaultLocalSymbolTable", {
  enumerable: true,
  get: function () {
    return IonLocalSymbolTable_2.defaultLocalSymbolTable;
  }
});
var IonType_1 = require("./IonType");
Object.defineProperty(exports, "IonType", {
  enumerable: true,
  get: function () {
    return IonType_1.IonType;
  }
});
var IonTypes_1 = require("./IonTypes");
Object.defineProperty(exports, "IonTypes", {
  enumerable: true,
  get: function () {
    return IonTypes_1.IonTypes;
  }
});
var IonSharedSymbolTable_1 = require("./IonSharedSymbolTable");
Object.defineProperty(exports, "SharedSymbolTable", {
  enumerable: true,
  get: function () {
    return IonSharedSymbolTable_1.SharedSymbolTable;
  }
});
var IonTimestamp_1 = require("./IonTimestamp");
Object.defineProperty(exports, "TimestampPrecision", {
  enumerable: true,
  get: function () {
    return IonTimestamp_1.TimestampPrecision;
  }
});
Object.defineProperty(exports, "Timestamp", {
  enumerable: true,
  get: function () {
    return IonTimestamp_1.Timestamp;
  }
});
var IonText_1 = require("./IonText");
Object.defineProperty(exports, "toBase64", {
  enumerable: true,
  get: function () {
    return IonText_1.toBase64;
  }
});
var IonUnicode_2 = require("./IonUnicode");
Object.defineProperty(exports, "decodeUtf8", {
  enumerable: true,
  get: function () {
    return IonUnicode_2.decodeUtf8;
  }
});
const dom = __importStar(require("./dom"));
exports.dom = dom;
var dom_1 = require("./dom");
Object.defineProperty(exports, "load", {
  enumerable: true,
  get: function () {
    return dom_1.load;
  }
});
Object.defineProperty(exports, "loadAll", {
  enumerable: true,
  get: function () {
    return dom_1.loadAll;
  }
});
var IonEvent_1 = require("./events/IonEvent");
Object.defineProperty(exports, "IonEventType", {
  enumerable: true,
  get: function () {
    return IonEvent_1.IonEventType;
  }
});
Object.defineProperty(exports, "IonEventFactory", {
  enumerable: true,
  get: function () {
    return IonEvent_1.IonEventFactory;
  }
});
var IonEventStream_1 = require("./events/IonEventStream");
Object.defineProperty(exports, "IonEventStream", {
  enumerable: true,
  get: function () {
    return IonEventStream_1.IonEventStream;
  }
});
var EventStreamError_1 = require("./events/EventStreamError");
Object.defineProperty(exports, "EventStreamError", {
  enumerable: true,
  get: function () {
    return EventStreamError_1.EventStreamError;
  }
});
var ComparisonResult_1 = require("./ComparisonResult");
Object.defineProperty(exports, "ComparisonResult", {
  enumerable: true,
  get: function () {
    return ComparisonResult_1.ComparisonResult;
  }
});
Object.defineProperty(exports, "ComparisonResultType", {
  enumerable: true,
  get: function () {
    return ComparisonResult_1.ComparisonResultType;
  }
});

},{"./ComparisonResult":3,"./IntSize":4,"./IonBinaryReader":7,"./IonBinaryWriter":8,"./IonCatalog":9,"./IonConstants":10,"./IonDecimal":11,"./IonLocalSymbolTable":13,"./IonPrettyTextWriter":17,"./IonSharedSymbolTable":18,"./IonSpan":19,"./IonText":24,"./IonTextReader":25,"./IonTextWriter":26,"./IonTimestamp":27,"./IonType":28,"./IonTypes":29,"./IonUnicode":30,"./IonWriteable":31,"./dom":51,"./events/EventStreamError":52,"./events/IonEvent":53,"./events/IonEventStream":54}],6:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TB_ANNOTATION = exports.TB_STRUCT = exports.TB_SEXP = exports.TB_LIST = exports.TB_BLOB = exports.TB_CLOB = exports.TB_STRING = exports.TB_SYMBOL = exports.TB_TIMESTAMP = exports.TB_DECIMAL = exports.TB_FLOAT = exports.TB_NEG_INT = exports.TB_INT = exports.TB_BOOL = exports.TB_NULL = exports.LEN_NULL = exports.LEN_VAR = exports.LEN_MASK = exports.BYTE_SHIFT = exports.TYPE_SHIFT = exports.BYTE_MASK = exports.NIBBLE_MASK = void 0;
exports.NIBBLE_MASK = 0xf;
exports.BYTE_MASK = 0xff;
exports.TYPE_SHIFT = 4;
exports.BYTE_SHIFT = 8;
exports.LEN_MASK = 0xf;
exports.LEN_VAR = 14;
exports.LEN_NULL = 15;
exports.TB_NULL = 0;
exports.TB_BOOL = 1;
exports.TB_INT = 2;
exports.TB_NEG_INT = 3;
exports.TB_FLOAT = 4;
exports.TB_DECIMAL = 5;
exports.TB_TIMESTAMP = 6;
exports.TB_SYMBOL = 7;
exports.TB_STRING = 8;
exports.TB_CLOB = 9;
exports.TB_BLOB = 10;
exports.TB_LIST = 11;
exports.TB_SEXP = 12;
exports.TB_STRUCT = 13;
exports.TB_ANNOTATION = 14;

},{}],7:[function(require,module,exports){
"use strict";

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
var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BinaryReader = void 0;
const IntSize_1 = __importDefault(require("./IntSize"));
const IonCatalog_1 = require("./IonCatalog");
const IonConstants_1 = require("./IonConstants");
const IonLocalSymbolTable_1 = require("./IonLocalSymbolTable");
const IonParserBinaryRaw_1 = require("./IonParserBinaryRaw");
const IonSymbols_1 = require("./IonSymbols");
const IonTypes_1 = require("./IonTypes");
const util_1 = require("./util");
const BOC = -2;
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
function get_ion_type(t) {
  switch (t) {
    case TB_NULL:
      return IonTypes_1.IonTypes.NULL;
    case TB_BOOL:
      return IonTypes_1.IonTypes.BOOL;
    case TB_INT:
      return IonTypes_1.IonTypes.INT;
    case TB_NEG_INT:
      return IonTypes_1.IonTypes.INT;
    case TB_FLOAT:
      return IonTypes_1.IonTypes.FLOAT;
    case TB_DECIMAL:
      return IonTypes_1.IonTypes.DECIMAL;
    case TB_TIMESTAMP:
      return IonTypes_1.IonTypes.TIMESTAMP;
    case TB_SYMBOL:
      return IonTypes_1.IonTypes.SYMBOL;
    case TB_STRING:
      return IonTypes_1.IonTypes.STRING;
    case TB_CLOB:
      return IonTypes_1.IonTypes.CLOB;
    case TB_BLOB:
      return IonTypes_1.IonTypes.BLOB;
    case TB_LIST:
      return IonTypes_1.IonTypes.LIST;
    case TB_SEXP:
      return IonTypes_1.IonTypes.SEXP;
    case TB_STRUCT:
      return IonTypes_1.IonTypes.STRUCT;
    default:
      return null;
  }
}
class BinaryReader {
  constructor(source, catalog) {
    this._annotations = null;
    this._parser = new IonParserBinaryRaw_1.ParserBinaryRaw(source);
    this._cat = catalog ? catalog : new IonCatalog_1.Catalog();
    this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
    this._raw_type = BOC;
  }
  position() {
    return this._parser.source().position();
  }
  next() {
    this._annotations = null;
    if (this._raw_type === EOF) {
      return null;
    }
    for (this._raw_type = this._parser.next(); this.depth() === 0; this._raw_type = this._parser.next()) {
      if (this._raw_type === TB_SYMBOL) {
        const raw = this._parser._getSid();
        if (raw !== IonConstants_1.IVM.sid) {
          break;
        }
        this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
      } else if (this._raw_type === TB_STRUCT) {
        if (!this._parser.hasAnnotations()) {
          break;
        }
        if (this._parser.getAnnotation(0) !== IonSymbols_1.ion_symbol_table_sid) {
          break;
        }
        this._symtab = IonSymbols_1.makeSymbolTable(this._cat, this, this._symtab);
      } else {
        break;
      }
    }
    return get_ion_type(this._raw_type);
  }
  stepIn() {
    if (!get_ion_type(this._raw_type).isContainer) {
      throw new Error("Can't step in to a scalar value");
    }
    this._parser.stepIn();
    this._raw_type = BOC;
  }
  stepOut() {
    this._parser.stepOut();
    this._raw_type = BOC;
  }
  type() {
    return get_ion_type(this._raw_type);
  }
  depth() {
    return this._parser.depth();
  }
  fieldName() {
    return this.getSymbolString(this._parser.getFieldId());
  }
  hasAnnotations() {
    return this._parser.hasAnnotations();
  }
  annotations() {
    this._loadAnnotations();
    return this._annotations !== null ? this._annotations : [];
  }
  getAnnotation(index) {
    this._loadAnnotations();
    return this._annotations[index];
  }
  isNull() {
    return this._raw_type === TB_NULL || this._parser.isNull();
  }
  uInt8ArrayValue() {
    return this._parser.uInt8ArrayValue();
  }
  booleanValue() {
    return this._parser.booleanValue();
  }
  decimalValue() {
    return this._parser.decimalValue();
  }
  bigIntValue() {
    return this._parser.bigIntValue();
  }
  intSize() {
    if (util_1.isSafeInteger(this.bigIntValue())) {
      return IntSize_1.default.Number;
    }
    return IntSize_1.default.BigInt;
  }
  numberValue() {
    return this._parser.numberValue();
  }
  stringValue() {
    const t = this;
    const p = t._parser;
    switch (get_ion_type(t._raw_type)) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.STRING:
        if (this.isNull()) {
          return null;
        }
        return p.stringValue();
      case IonTypes_1.IonTypes.SYMBOL:
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
  timestampValue() {
    return this._parser.timestampValue();
  }
  value() {
    const type = this.type();
    if (type && type.isContainer) {
      if (this.isNull()) {
        return null;
      }
      throw new Error("Unable to provide a value for " + type.name + " containers.");
    }
    switch (type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.BLOB:
      case IonTypes_1.IonTypes.CLOB:
        return this.uInt8ArrayValue();
      case IonTypes_1.IonTypes.BOOL:
        return this.booleanValue();
      case IonTypes_1.IonTypes.DECIMAL:
        return this.decimalValue();
      case IonTypes_1.IonTypes.INT:
        return this.bigIntValue();
      case IonTypes_1.IonTypes.FLOAT:
        return this.numberValue();
      case IonTypes_1.IonTypes.STRING:
      case IonTypes_1.IonTypes.SYMBOL:
        return this.stringValue();
      case IonTypes_1.IonTypes.TIMESTAMP:
        return this.timestampValue();
      default:
        throw new Error("There is no current value.");
    }
  }
  _loadAnnotations() {
    if (this._annotations === null) {
      this._annotations = [];
      this._parser.getAnnotations().forEach(id => {
        this._annotations.push(this.getSymbolString(id));
      });
    }
  }
  getSymbolString(symbolId) {
    let s = null;
    if (symbolId === null) {
      return null;
    }
    if (symbolId > 0) {
      s = this._symtab.getSymbolText(symbolId);
      if (s === undefined) {
        throw new Error("symbol is unresolvable");
      }
    } else if (symbolId === 0) {
      throw new Error("Symbol ID zero is unsupported");
    } else if (symbolId < 0) {
      throw new Error("Negative symbol ID: " + symbolId + " is illegal.");
    }
    return s;
  }
}
exports.BinaryReader = BinaryReader;

},{"./IntSize":4,"./IonCatalog":9,"./IonConstants":10,"./IonLocalSymbolTable":13,"./IonParserBinaryRaw":15,"./IonSymbols":22,"./IonTypes":29,"./util":55}],8:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NullNode = exports.LeafNode = exports.AbstractNode = exports.BinaryWriter = void 0;
const AbstractWriter_1 = require("./AbstractWriter");
const BigIntSerde_1 = require("./BigIntSerde");
const IonLowLevelBinaryWriter_1 = require("./IonLowLevelBinaryWriter");
const IonTimestamp_1 = require("./IonTimestamp");
const IonTypes_1 = require("./IonTypes");
const IonUnicode_1 = require("./IonUnicode");
const IonWriteable_1 = require("./IonWriteable");
const util_1 = require("./util");
const MAJOR_VERSION = 1;
const MINOR_VERSION = 0;
const MAX_VALUE_LENGTH = 14;
const MAX_VALUE_LENGTH_FLAG = 14;
const NULL_VALUE_FLAG = 15;
const TYPE_DESCRIPTOR_LENGTH = 1;
const EMPTY_UINT8ARRAY = new Uint8Array();
var States;
(function (States) {
  States[States["VALUE"] = 0] = "VALUE";
  States[States["STRUCT_FIELD"] = 1] = "STRUCT_FIELD";
  States[States["STRUCT_VALUE"] = 2] = "STRUCT_VALUE";
  States[States["CLOSED"] = 3] = "CLOSED";
})(States || (States = {}));
var TypeCodes;
(function (TypeCodes) {
  TypeCodes[TypeCodes["NULL"] = 0] = "NULL";
  TypeCodes[TypeCodes["BOOL"] = 1] = "BOOL";
  TypeCodes[TypeCodes["POSITIVE_INT"] = 2] = "POSITIVE_INT";
  TypeCodes[TypeCodes["NEGATIVE_INT"] = 3] = "NEGATIVE_INT";
  TypeCodes[TypeCodes["FLOAT"] = 4] = "FLOAT";
  TypeCodes[TypeCodes["DECIMAL"] = 5] = "DECIMAL";
  TypeCodes[TypeCodes["TIMESTAMP"] = 6] = "TIMESTAMP";
  TypeCodes[TypeCodes["SYMBOL"] = 7] = "SYMBOL";
  TypeCodes[TypeCodes["STRING"] = 8] = "STRING";
  TypeCodes[TypeCodes["CLOB"] = 9] = "CLOB";
  TypeCodes[TypeCodes["BLOB"] = 10] = "BLOB";
  TypeCodes[TypeCodes["LIST"] = 11] = "LIST";
  TypeCodes[TypeCodes["SEXP"] = 12] = "SEXP";
  TypeCodes[TypeCodes["STRUCT"] = 13] = "STRUCT";
  TypeCodes[TypeCodes["ANNOTATION"] = 14] = "ANNOTATION";
})(TypeCodes || (TypeCodes = {}));
class BinaryWriter extends AbstractWriter_1.AbstractWriter {
  constructor(symbolTable, writeable) {
    super();
    this.datagram = [];
    this.containers = [];
    this.state = States.VALUE;
    this.symbolTable = symbolTable;
    this.writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(writeable);
  }
  getBytes() {
    return this.writer.getBytes();
  }
  writeBlob(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.BLOB);
      return;
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.BLOB, this.encodeAnnotations(this._annotations), value));
  }
  writeBoolean(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.BOOL);
      return;
    }
    this.addNode(new BooleanNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations), value));
  }
  writeClob(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.CLOB);
      return;
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.CLOB, this.encodeAnnotations(this._annotations), value));
  }
  writeDecimal(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.DECIMAL);
      return;
    }
    const exponent = value.getExponent();
    const coefficient = value.getCoefficient();
    const isPositiveZero = coefficient === 0n && !value.isNegative();
    if (isPositiveZero && exponent === 0 && util_1._sign(exponent) === 1) {
      this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.DECIMAL, this.encodeAnnotations(this._annotations), new Uint8Array(0)));
      return;
    }
    const isNegative = value.isNegative();
    const writeCoefficient = isNegative || coefficient !== 0n;
    const coefficientBytes = writeCoefficient ? BigIntSerde_1.BigIntSerde.toSignedIntBytes(coefficient, isNegative) : EMPTY_UINT8ARRAY;
    const bufLen = IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthSignedIntSize(exponent) + (writeCoefficient ? coefficientBytes.length : 0);
    const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(new IonWriteable_1.Writeable(bufLen));
    writer.writeVariableLengthSignedInt(exponent);
    if (writeCoefficient) {
      writer.writeBytes(coefficientBytes);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.DECIMAL, this.encodeAnnotations(this._annotations), writer.getBytes()));
  }
  writeFloat32(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.FLOAT);
      return;
    }
    let bytes;
    if (Object.is(value, 0)) {
      bytes = new Uint8Array(0);
    } else {
      const buffer = new ArrayBuffer(4);
      const dataview = new DataView(buffer);
      dataview.setFloat32(0, value, false);
      bytes = new Uint8Array(buffer);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.FLOAT, this.encodeAnnotations(this._annotations), bytes));
  }
  writeFloat64(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.FLOAT);
      return;
    }
    let bytes;
    if (Object.is(value, 0)) {
      bytes = new Uint8Array(0);
    } else {
      const buffer = new ArrayBuffer(8);
      const dataview = new DataView(buffer);
      dataview.setFloat64(0, value, false);
      bytes = new Uint8Array(buffer);
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.FLOAT, this.encodeAnnotations(this._annotations), bytes));
  }
  writeInt(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.INT);
      return;
    }
    this.addNode(new IntNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations), value));
  }
  writeNull(type) {
    if (type === undefined || type === null) {
      type = IonTypes_1.IonTypes.NULL;
    }
    this.checkWriteValue();
    this.addNode(new NullNode(this.writer, this.getCurrentContainer(), type, this.encodeAnnotations(this._annotations)));
  }
  writeString(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.STRING);
      return;
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.STRING, this.encodeAnnotations(this._annotations), IonUnicode_1.encodeUtf8(value)));
  }
  writeSymbol(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.SYMBOL);
    } else {
      const symbolId = this.symbolTable.addSymbol(value);
      const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(new IonWriteable_1.Writeable(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(symbolId)));
      writer.writeUnsignedInt(symbolId);
      this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.SYMBOL, this.encodeAnnotations(this._annotations), writer.getBytes()));
    }
  }
  writeTimestamp(value) {
    util_1._assertDefined(value);
    this.checkWriteValue();
    if (value === null) {
      this.writeNull(IonTypes_1.IonTypes.TIMESTAMP);
      return;
    }
    const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(new IonWriteable_1.Writeable(12));
    writer.writeVariableLengthSignedInt(value.getLocalOffset());
    const date = value.getDate();
    writer.writeVariableLengthUnsignedInt(date.getUTCFullYear());
    if (value.getPrecision() >= IonTimestamp_1.TimestampPrecision.MONTH) {
      writer.writeVariableLengthUnsignedInt(date.getUTCMonth() + 1);
    }
    if (value.getPrecision() >= IonTimestamp_1.TimestampPrecision.DAY) {
      writer.writeVariableLengthUnsignedInt(date.getUTCDate());
    }
    if (value.getPrecision() >= IonTimestamp_1.TimestampPrecision.HOUR_AND_MINUTE) {
      writer.writeVariableLengthUnsignedInt(date.getUTCHours());
      writer.writeVariableLengthUnsignedInt(date.getUTCMinutes());
    }
    if (value.getPrecision() >= IonTimestamp_1.TimestampPrecision.SECONDS) {
      writer.writeVariableLengthUnsignedInt(value.getSecondsInt());
      const fractionalSeconds = value._getFractionalSeconds();
      if (fractionalSeconds.getExponent() !== 0) {
        writer.writeVariableLengthSignedInt(fractionalSeconds.getExponent());
        if (fractionalSeconds.getCoefficient() !== 0n) {
          writer.writeBytes(BigIntSerde_1.BigIntSerde.toSignedIntBytes(fractionalSeconds.getCoefficient(), fractionalSeconds.isNegative()));
        }
      }
    }
    this.addNode(new BytesNode(this.writer, this.getCurrentContainer(), IonTypes_1.IonTypes.TIMESTAMP, this.encodeAnnotations(this._annotations), writer.getBytes()));
  }
  stepIn(type) {
    this.checkWriteValue();
    switch (type) {
      case IonTypes_1.IonTypes.LIST:
      case IonTypes_1.IonTypes.SEXP:
        this.addNode(new SequenceNode(this.writer, this.getCurrentContainer(), type, this.encodeAnnotations(this._annotations)));
        break;
      case IonTypes_1.IonTypes.STRUCT:
        this.addNode(new StructNode(this.writer, this.getCurrentContainer(), this.encodeAnnotations(this._annotations)));
        this.state = States.STRUCT_FIELD;
        break;
      default:
        throw new Error("Unrecognized container type");
    }
  }
  stepOut() {
    if (this.depth() === 0) {
      throw new Error("Not currently in a container");
    }
    if (this.state === States.STRUCT_VALUE) {
      throw new Error("Cannot exit a struct with a partially written field");
    }
    this.containers.pop();
    if (this.depth() > 0) {
      this.state = this.getCurrentContainer() instanceof StructNode ? States.STRUCT_FIELD : States.VALUE;
    } else {
      this.state = States.VALUE;
    }
  }
  _isInStruct() {
    return this.getCurrentContainer() instanceof StructNode;
  }
  writeFieldName(fieldName) {
    util_1._assertDefined(fieldName);
    if (this.state !== States.STRUCT_FIELD) {
      throw new Error("Cannot write a field name outside of a struct");
    }
    this.fieldName = this.encodeAnnotations([fieldName]);
    this.state = States.STRUCT_VALUE;
  }
  depth() {
    return this.containers.length;
  }
  close() {
    this.checkClosed();
    if (this.depth() > 0) {
      throw new Error("Writer has one or more open containers; call stepOut() for each container prior to close()");
    }
    this.writeIvm();
    const datagram = this.datagram;
    this.datagram = [];
    this.writeSymbolTable();
    for (const node of datagram) {
      node.write();
    }
    this.state = States.CLOSED;
  }
  writeIvm() {
    this.writer.writeByte(0xe0);
    this.writer.writeByte(MAJOR_VERSION);
    this.writer.writeByte(MINOR_VERSION);
    this.writer.writeByte(0xea);
  }
  encodeAnnotations(annotations) {
    if (annotations.length === 0) {
      return new Uint8Array(0);
    }
    const writeable = new IonWriteable_1.Writeable();
    const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(writeable);
    for (const annotation of annotations) {
      const symbolId = this.symbolTable.addSymbol(annotation);
      writer.writeVariableLengthUnsignedInt(symbolId);
    }
    this._clearAnnotations();
    return writeable.getBytes();
  }
  getCurrentContainer() {
    return this.containers[this.containers.length - 1];
  }
  addNode(node) {
    if (this.depth() === 0) {
      this.datagram.push(node);
    } else {
      if (this.state === States.STRUCT_VALUE) {
        this.getCurrentContainer().addChild(node, this.fieldName);
        this.state = States.STRUCT_FIELD;
      } else {
        this.getCurrentContainer().addChild(node);
      }
    }
    if (node.isContainer()) {
      this.containers.push(node);
      this.state = States.VALUE;
    }
  }
  checkWriteValue() {
    this.checkClosed();
    if (this.state === States.STRUCT_FIELD) {
      throw new Error("Expected a struct field name instead of a value, call writeFieldName(string) with the desired name before calling stepIn(IonType) or writeIonType()");
    }
  }
  checkClosed() {
    if (this.state === States.CLOSED) {
      throw new Error("Writer is closed, no further operations are available");
    }
  }
  writeSymbolTable() {
    const hasImports = this.symbolTable.import.symbolTable.name != "$ion";
    const hasLocalSymbols = this.symbolTable.symbols.length > 0;
    if (!(hasImports || hasLocalSymbols)) {
      return;
    }
    this.setAnnotations(["$ion_symbol_table"]);
    this.stepIn(IonTypes_1.IonTypes.STRUCT);
    if (hasImports) {
      this.writeFieldName("imports");
      this.stepIn(IonTypes_1.IonTypes.LIST);
      this.writeImport(this.symbolTable.import);
      this.stepOut();
    }
    if (hasLocalSymbols) {
      this.writeFieldName("symbols");
      this.stepIn(IonTypes_1.IonTypes.LIST);
      for (const symbol_ of this.symbolTable.symbols) {
        if (symbol_ !== undefined) {
          this.writeString(symbol_);
        }
      }
      this.stepOut();
    }
    this.stepOut();
    this.datagram[0].write();
  }
  writeImport(import_) {
    if (!import_) {
      return;
    }
    this.writeImport(import_.parent);
    this.stepIn(IonTypes_1.IonTypes.STRUCT);
    this.writeFieldName("name");
    this.writeString(import_.symbolTable.name);
    this.writeFieldName("version");
    this.writeInt(import_.symbolTable.version);
    this.writeFieldName("max_id");
    this.writeInt(import_.length);
    this.stepOut();
  }
}
exports.BinaryWriter = BinaryWriter;
class AbstractNode {
  constructor(_writer, parent, _type, annotations) {
    this._writer = _writer;
    this.parent = parent;
    this._type = _type;
    this.annotations = annotations;
  }
  get typeCode() {
    return this._type.binaryTypeId;
  }
  get writer() {
    return this._writer;
  }
  static getLengthLength(length) {
    if (length < MAX_VALUE_LENGTH) {
      return 0;
    } else {
      return IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(length);
    }
  }
  writeTypeDescriptorAndLength(typeCode, isNull, length) {
    let typeDescriptor = typeCode << 4;
    if (isNull) {
      typeDescriptor |= NULL_VALUE_FLAG;
      this.writer.writeByte(typeDescriptor);
    } else if (length < MAX_VALUE_LENGTH) {
      typeDescriptor |= length;
      this.writer.writeByte(typeDescriptor);
    } else {
      typeDescriptor |= MAX_VALUE_LENGTH_FLAG;
      this.writer.writeByte(typeDescriptor);
      this.writer.writeVariableLengthUnsignedInt(length);
    }
  }
  getContainedValueLength() {
    const valueLength = this.getValueLength();
    const valueLengthLength = AbstractNode.getLengthLength(valueLength);
    return TYPE_DESCRIPTOR_LENGTH + valueLengthLength + valueLength;
  }
  getAnnotatedContainerLength() {
    const annotationsLength = this.annotations.length;
    const annotationsLengthLength = IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
    const containedValueLength = this.getContainedValueLength();
    return annotationsLength + annotationsLengthLength + containedValueLength;
  }
  getAnnotationsLength() {
    if (this.hasAnnotations()) {
      const annotationsLength = this.annotations.length;
      const annotationsLengthLength = IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(annotationsLength);
      const containedValueLength = this.getContainedValueLength();
      const annotationsWrapperLengthLength = AbstractNode.getLengthLength(containedValueLength + annotationsLength + annotationsLengthLength);
      return TYPE_DESCRIPTOR_LENGTH + annotationsWrapperLengthLength + annotationsLengthLength + annotationsLength;
    }
    return 0;
  }
  getLength() {
    const annotationsLength = this.getAnnotationsLength();
    const containedValueLength = this.getContainedValueLength();
    return annotationsLength + containedValueLength;
  }
  writeAnnotations() {
    if (!this.hasAnnotations()) {
      return;
    }
    const annotatedContainerLength = this.getAnnotatedContainerLength();
    this.writeTypeDescriptorAndLength(TypeCodes.ANNOTATION, false, annotatedContainerLength);
    this.writer.writeVariableLengthUnsignedInt(this.annotations.length);
    this.writer.writeBytes(new Uint8Array(this.annotations));
  }
  hasAnnotations() {
    return this.annotations.length > 0;
  }
}
exports.AbstractNode = AbstractNode;
class ContainerNode extends AbstractNode {
  constructor(writer, parent, type, annotations) {
    super(writer, parent, type, annotations);
  }
  isContainer() {
    return true;
  }
}
class SequenceNode extends ContainerNode {
  constructor(writer, parent, type, annotations) {
    super(writer, parent, type, annotations);
    this.children = [];
  }
  addChild(child, name) {
    this.children.push(child);
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
    for (const child of this.children) {
      child.write();
    }
  }
  getValueLength() {
    let valueLength = 0;
    for (const child of this.children) {
      valueLength += child.getLength();
    }
    return valueLength;
  }
  getLength() {
    if (this.length === undefined) {
      this.length = super.getLength();
    }
    return this.length;
  }
}
class StructNode extends ContainerNode {
  constructor(writer, parent, annotations) {
    super(writer, parent, IonTypes_1.IonTypes.STRUCT, annotations);
    this.fields = [];
  }
  addChild(child, fieldName) {
    if (fieldName === null || fieldName === undefined) {
      throw new Error("Cannot add a value to a struct without a field name");
    }
    this.fields.push({
      name: fieldName,
      value: child
    });
  }
  getValueLength() {
    let valueLength = 0;
    for (const field of this.fields) {
      valueLength += field.name.length;
      valueLength += field.value.getLength();
    }
    return valueLength;
  }
  getLength() {
    if (this.length === undefined) {
      this.length = super.getLength();
    }
    return this.length;
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.getValueLength());
    for (const field of this.fields) {
      this.writer.writeBytes(new Uint8Array(field.name));
      field.value.write();
    }
  }
}
class LeafNode extends AbstractNode {
  addChild(child, name) {
    throw new Error("Cannot add a child to a leaf node");
  }
  isContainer() {
    return false;
  }
}
exports.LeafNode = LeafNode;
class BooleanNode extends LeafNode {
  constructor(writer, parent, annotations, value) {
    super(writer, parent, IonTypes_1.IonTypes.BOOL, annotations);
    this.value = value;
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.value ? 1 : 0);
  }
  getValueLength() {
    return 0;
  }
}
class IntNode extends LeafNode {
  constructor(writer, parent, annotations, value) {
    super(writer, parent, IonTypes_1.IonTypes.INT, annotations);
    this.value = value;
    if (!(typeof this.value === "number" || typeof this.value === "bigint")) {
      throw new Error("Expected " + this.value + " to be a number or bigint");
    }
    if (this.value > 0n) {
      this.intTypeCode = TypeCodes.POSITIVE_INT;
      const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(new IonWriteable_1.Writeable(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(this.value)));
      writer.writeUnsignedInt(this.value);
      this.bytes = writer.getBytes();
    } else if (this.value < 0n) {
      this.intTypeCode = TypeCodes.NEGATIVE_INT;
      let magnitude;
      if (typeof value === "bigint") {
        if (value < 0n) {
          magnitude = -value;
        } else {
          magnitude = value;
        }
      } else {
        magnitude = Math.abs(value);
      }
      const writer = new IonLowLevelBinaryWriter_1.LowLevelBinaryWriter(new IonWriteable_1.Writeable(IonLowLevelBinaryWriter_1.LowLevelBinaryWriter.getUnsignedIntSize(magnitude)));
      writer.writeUnsignedInt(magnitude);
      this.bytes = writer.getBytes();
    } else {
      this.intTypeCode = TypeCodes.POSITIVE_INT;
      this.bytes = new Uint8Array(0);
    }
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.intTypeCode, false, this.bytes.length);
    this.writer.writeBytes(this.bytes);
  }
  getValueLength() {
    return this.bytes.length;
  }
}
class BytesNode extends LeafNode {
  constructor(writer, parent, type, annotations, value) {
    super(writer, parent, type, annotations);
    this.value = value;
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, false, this.value.length);
    this.writer.writeBytes(this.value);
  }
  getValueLength() {
    return this.value.length;
  }
}
class NullNode extends LeafNode {
  constructor(writer, parent, type, annotations) {
    super(writer, parent, type, annotations);
  }
  write() {
    this.writeAnnotations();
    this.writeTypeDescriptorAndLength(this.typeCode, true, 0);
  }
  getValueLength() {
    return 0;
  }
}
exports.NullNode = NullNode;

},{"./AbstractWriter":1,"./BigIntSerde":2,"./IonLowLevelBinaryWriter":14,"./IonTimestamp":27,"./IonTypes":29,"./IonUnicode":30,"./IonWriteable":31,"./util":55}],9:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Catalog = void 0;
const IonSystemSymbolTable_1 = require("./IonSystemSymbolTable");
function byVersion(x, y) {
  return x.version - y.version;
}
class Catalog {
  constructor() {
    this.symbolTables = {};
    this.add(IonSystemSymbolTable_1.getSystemSymbolTable());
  }
  add(symbolTable) {
    if (symbolTable.name === undefined || symbolTable.name === null) {
      throw new Error("SymbolTable name must be defined.");
    }
    const versions = this.symbolTables[symbolTable.name];
    if (versions === undefined) {
      this.symbolTables[symbolTable.name] = [];
    }
    this.symbolTables[symbolTable.name][symbolTable.version] = symbolTable;
  }
  getVersion(name, version) {
    const tables = this.symbolTables[name];
    if (!tables) {
      return null;
    }
    let table = tables[version];
    if (!table) {
      table = tables[tables.length];
    }
    return table ? table : null;
  }
  getTable(name) {
    const versions = this.symbolTables[name];
    if (versions === undefined) {
      return null;
    }
    return versions[versions.length - 1];
  }
}
exports.Catalog = Catalog;

},{"./IonSystemSymbolTable":23}],10:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IVM = exports.EOF = void 0;
exports.EOF = -1;
exports.IVM = {
  text: "$ion_1_0",
  binary: new Uint8Array([0xe0, 0x01, 0x00, 0xea]),
  sid: 2
};

},{}],11:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Decimal = void 0;
const util_1 = require("./util");
class Decimal {
  constructor(coefficient, exponent) {
    let isNegative = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    if (typeof coefficient === "string") {
      return Decimal.parse(coefficient);
    }
    if (!util_1._hasValue(exponent)) {
      throw new Error("Decimal's constructor was called with a numeric coefficient but no exponent.");
    }
    if (typeof coefficient === "number") {
      return Decimal._fromNumberCoefficient(coefficient, exponent);
    }
    if (typeof coefficient === "bigint") {
      if (!util_1._hasValue(isNegative)) {
        isNegative = coefficient < 0n;
      } else if (isNegative != coefficient < 0n) {
        coefficient *= -1n;
      }
      return Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
    }
    throw new Error(`Unsupported parameter set (${coefficient}, ${exponent}, ${isNegative} passed to Decimal constructor.`);
  }
  static _fromNumberCoefficient(coefficient, exponent) {
    if (!Number.isInteger(coefficient)) {
      throw new Error("The provided coefficient was not an integer. (" + coefficient + ")");
    }
    const isNegative = coefficient < 0 || Object.is(coefficient, -0);
    return this._fromBigIntCoefficient(isNegative, BigInt(coefficient), exponent);
  }
  static _fromBigIntCoefficient(isNegative, coefficient, exponent) {
    const value = Object.create(this.prototype);
    value._initialize(isNegative, coefficient, exponent);
    return value;
  }
  static parse(str) {
    let exponent = 0;
    if (str === "null" || str === "null.decimal") {
      return null;
    }
    const d = str.match("[d|D]");
    let exponentDelimiterIndex = str.length;
    if (d !== undefined && d !== null) {
      exponent = Number(str.substring(d.index + 1, str.length));
      exponentDelimiterIndex = d.index;
    }
    const f = str.match("\\.");
    let coefficientText;
    if (f) {
      const exponentShift = d ? d.index - 1 - f.index : str.length - 1 - f.index;
      exponent -= exponentShift;
      coefficientText = str.substring(0, f.index) + str.substring(f.index + 1, exponentDelimiterIndex);
    } else {
      coefficientText = str.substring(0, exponentDelimiterIndex);
    }
    const coefficient = BigInt(coefficientText);
    const isNegative = coefficient < 0n || coefficientText.startsWith("-0");
    return Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
  }
  isNegative() {
    return this._isNegative;
  }
  numberValue() {
    if (this._isNegativeZero()) {
      return -0;
    }
    return Number(this._coefficient) * Math.pow(10, this._exponent);
  }
  intValue() {
    return Math.trunc(this.numberValue());
  }
  toString() {
    let cStr = this._coefficient.toString();
    if (cStr[0] === "-") {
      cStr = cStr.substring(1, cStr.length);
    }
    const precision = cStr.length;
    const adjustedExponent = this._exponent + (precision - 1);
    let s = "";
    if (this._exponent <= 0 && adjustedExponent >= -6) {
      if (this._exponent === 0) {
        s += cStr;
      } else {
        if (cStr.length <= -this._exponent) {
          cStr = "0".repeat(-this._exponent - cStr.length + 1) + cStr;
          s += cStr.substring(0, 1) + "." + cStr.substring(1);
        } else {
          s += cStr.substring(0, precision + this._exponent) + "." + cStr.substring(precision + this._exponent);
        }
      }
    } else {
      s += cStr[0];
      if (cStr.length > 1) {
        s += "." + cStr.substring(1);
      }
      s += "E" + (adjustedExponent > 0 ? "+" : "") + adjustedExponent;
    }
    return (this.isNegative() ? "-" : "") + s;
  }
  toJSON() {
    return this.numberValue();
  }
  getCoefficient() {
    return this._coefficient;
  }
  getExponent() {
    return this._exponent;
  }
  equals(that) {
    return this.getExponent() === that.getExponent() && util_1._sign(this.getExponent()) === util_1._sign(that.getExponent()) && this.isNegative() === that.isNegative() && this.getCoefficient() === that.getCoefficient();
  }
  compareTo(that) {
    if (this._coefficient === 0n && that._coefficient === 0n) {
      return 0;
    }
    const neg = this.isNegative();
    if (neg !== that.isNegative()) {
      return neg ? -1 : 1;
    }
    let [thisCoefficientStr, thisPrecision, thisMagnitude] = this._compareToParams();
    let [thatCoefficientStr, thatPrecision, thatMagnitude] = that._compareToParams();
    if (thisMagnitude > thatMagnitude) {
      return neg ? -1 : 1;
    } else if (thisMagnitude < thatMagnitude) {
      return neg ? 1 : -1;
    }
    if (thisCoefficientStr.length < thatCoefficientStr.length) {
      thisCoefficientStr += "0".repeat(thatPrecision - thisPrecision);
    } else if (thisCoefficientStr.length > thatCoefficientStr.length) {
      thatCoefficientStr += "0".repeat(thisPrecision - thatPrecision);
    }
    const thisBigInt = BigInt(thisCoefficientStr);
    const thatBigInt = BigInt(thatCoefficientStr);
    if (thisBigInt > thatBigInt) {
      return neg ? -1 : 1;
    } else if (thisBigInt < thatBigInt) {
      return neg ? 1 : -1;
    }
    return 0;
  }
  _initialize(isNegative, coefficient, exponent) {
    this._isNegative = isNegative;
    this._coefficient = coefficient;
    if (Object.is(-0, exponent)) {
      exponent = 0;
    }
    this._exponent = exponent;
  }
  _isNegativeZero() {
    return this.isNegative() && this._coefficient == 0n;
  }
  _compareToParams() {
    const coefficientStr = this.isNegative() ? this._coefficient.toString().substring(1) : this._coefficient.toString();
    const precision = coefficientStr.length;
    let magnitude = precision + this._exponent;
    if (magnitude <= 0) {
      magnitude -= 1;
    }
    if (this._coefficient === 0n) {
      magnitude = -Infinity;
    }
    return [coefficientStr, precision, magnitude];
  }
}
exports.Decimal = Decimal;
Decimal.ZERO = new Decimal(0, 0);
Decimal.ONE = new Decimal(1, 0);

},{"./util":55}],12:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Import = void 0;
class Import {
  constructor(parent, symbolTable, length) {
    this._parent = parent;
    this._symbolTable = symbolTable;
    this._offset = this.parent ? this.parent.offset + this.parent.length : 1;
    this._length = length || this.symbolTable.numberOfSymbols;
  }
  get parent() {
    return this._parent;
  }
  get offset() {
    return this._offset;
  }
  get length() {
    return this._length;
  }
  get symbolTable() {
    return this._symbolTable;
  }
  getSymbolText(symbolId) {
    if (this.parent === undefined) {
      throw new Error("Illegal parent state.");
    }
    if (this.parent !== null) {
      const parentSymbol = this.parent.getSymbolText(symbolId);
      if (parentSymbol) {
        return parentSymbol;
      }
    }
    const index = symbolId - this.offset;
    if (index >= 0 && index < this.length) {
      return this.symbolTable.getSymbolText(index);
    }
    return undefined;
  }
  getSymbolId(symbolText) {
    let symbolId;
    if (this.parent !== null) {
      symbolId = this.parent.getSymbolId(symbolText);
      if (symbolId) {
        return symbolId;
      }
    }
    symbolId = this.symbolTable.getSymbolId(symbolText);
    if (symbolId !== null && symbolId !== undefined && symbolId < this.length) {
      return symbolId + this.offset;
    }
    return undefined;
  }
}
exports.Import = Import;

},{}],13:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultLocalSymbolTable = exports.LocalSymbolTable = void 0;
const IonSystemSymbolTable_1 = require("./IonSystemSymbolTable");
class LocalSymbolTable {
  constructor(theImport) {
    let symbols = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    this.index = Object.create(null);
    this._symbols = [];
    if (theImport === null) {
      this._import = IonSystemSymbolTable_1.getSystemSymbolTableImport();
    } else {
      this._import = theImport;
    }
    this.offset = this._import.offset + this._import.length;
    for (const symbol_ of symbols) {
      this.assignSymbolId(symbol_);
    }
  }
  get symbols() {
    return this._symbols;
  }
  get maxId() {
    return this.offset + this._symbols.length - 1;
  }
  get import() {
    return this._import;
  }
  getSymbolId(symbol_) {
    return this._import.getSymbolId(symbol_) || this.index[symbol_];
  }
  addSymbol(symbol_) {
    if (symbol_ !== null) {
      const existingSymbolId = this.getSymbolId(symbol_);
      if (existingSymbolId !== undefined) {
        return existingSymbolId;
      }
    }
    const symbolId = this.offset + this.symbols.length;
    this.symbols.push(symbol_);
    if (symbol_ !== null) {
      this.index[symbol_] = symbolId;
    }
    return symbolId;
  }
  assignSymbolId(symbol) {
    const symbolId = this.offset + this.symbols.length;
    this.symbols.push(symbol);
    if (symbol !== null && this.getSymbolId(symbol) === undefined) {
      this.index[symbol] = symbolId;
    }
    return symbolId;
  }
  getSymbolText(symbolId) {
    if (symbolId > this.maxId) {
      throw new Error("Symbol $" + symbolId.toString() + " greater than maxID.");
    }
    const importedSymbol = this.import.getSymbolText(symbolId);
    if (importedSymbol !== undefined) {
      return importedSymbol;
    }
    const index = symbolId - this.offset;
    return this.symbols[index];
  }
  numberOfSymbols() {
    return this._symbols.length;
  }
}
exports.LocalSymbolTable = LocalSymbolTable;
function defaultLocalSymbolTable() {
  return new LocalSymbolTable(IonSystemSymbolTable_1.getSystemSymbolTableImport());
}
exports.defaultLocalSymbolTable = defaultLocalSymbolTable;

},{"./IonSystemSymbolTable":23}],14:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LowLevelBinaryWriter = void 0;
const BigIntSerde_1 = require("./BigIntSerde");
class LowLevelBinaryWriter {
  constructor(writeable) {
    this.writeable = writeable;
  }
  static getSignedIntSize(value) {
    if (value === 0) {
      return 1;
    }
    const numberOfSignBits = 1;
    const magnitude = Math.abs(value);
    const numberOfMagnitudeBits = Math.ceil(Math.log2(magnitude + 1));
    const numberOfBits = numberOfMagnitudeBits + numberOfSignBits;
    return Math.ceil(numberOfBits / 8);
  }
  static getUnsignedIntSize(value) {
    if (typeof value === "bigint") {
      return BigIntSerde_1.BigIntSerde.getUnsignedIntSizeInBytes(value);
    }
    if (value === 0) {
      return 1;
    }
    const numberOfBits = Math.floor(Math.log2(value)) + 1;
    const numberOfBytes = Math.ceil(numberOfBits / 8);
    return numberOfBytes;
  }
  static getVariableLengthSignedIntSize(value) {
    const absoluteValue = Math.abs(value);
    if (absoluteValue === 0) {
      return 1;
    }
    const valueBits = Math.floor(Math.log2(absoluteValue)) + 1;
    const trailingStopBits = Math.floor(valueBits / 7);
    const leadingStopBit = 1;
    const signBit = 1;
    return Math.ceil((valueBits + trailingStopBits + leadingStopBit + signBit) / 8);
  }
  static getVariableLengthUnsignedIntSize(value) {
    if (value === 0) {
      return 1;
    }
    const valueBits = Math.floor(Math.log2(value)) + 1;
    const stopBits = Math.ceil(valueBits / 7);
    return Math.ceil((valueBits + stopBits) / 8);
  }
  writeSignedInt(originalValue) {
    const length = LowLevelBinaryWriter.getSignedIntSize(originalValue);
    let value = Math.abs(originalValue);
    const tempBuf = new Uint8Array(length);
    let i = tempBuf.length;
    while (value >= 128) {
      tempBuf[--i] = value & 0xff;
      value >>>= 8;
    }
    tempBuf[--i] = value & 0xff;
    if (1 / originalValue < 0) {
      tempBuf[0] |= 0x80;
    }
    this.writeable.writeBytes(tempBuf);
  }
  writeUnsignedInt(originalValue) {
    if (typeof originalValue === "bigint") {
      const encodedBytes = BigIntSerde_1.BigIntSerde.toUnsignedIntBytes(originalValue);
      this.writeable.writeBytes(encodedBytes);
      return;
    }
    const length = LowLevelBinaryWriter.getUnsignedIntSize(originalValue);
    const tempBuf = new Uint8Array(length);
    let value = originalValue;
    let i = tempBuf.length;
    while (value > 0) {
      tempBuf[--i] = value % 256;
      value = Math.trunc(value / 256);
    }
    this.writeable.writeBytes(tempBuf);
  }
  writeVariableLengthSignedInt(originalValue) {
    const tempBuf = new Uint8Array(LowLevelBinaryWriter.getVariableLengthSignedIntSize(originalValue));
    let value = Math.abs(originalValue);
    let i = tempBuf.length - 1;
    while (value >= 64) {
      tempBuf[i--] = value & 0x7f;
      value >>>= 7;
    }
    tempBuf[i] = value;
    if (1 / originalValue < 0) {
      tempBuf[i] |= 0x40;
    }
    tempBuf[tempBuf.length - 1] |= 0x80;
    this.writeable.writeBytes(tempBuf);
  }
  writeVariableLengthUnsignedInt(originalValue) {
    const tempBuf = new Uint8Array(LowLevelBinaryWriter.getVariableLengthUnsignedIntSize(originalValue));
    let value = originalValue;
    let i = tempBuf.length;
    tempBuf[--i] = value & 0x7f | 0x80;
    value >>>= 7;
    while (value > 0) {
      tempBuf[--i] = value & 0x7f;
      value >>>= 7;
    }
    this.writeable.writeBytes(tempBuf);
  }
  writeByte(byte) {
    this.writeable.writeByte(byte);
  }
  writeBytes(bytes) {
    this.writeable.writeBytes(bytes);
  }
  getBytes() {
    return this.writeable.getBytes();
  }
}
exports.LowLevelBinaryWriter = LowLevelBinaryWriter;

},{"./BigIntSerde":2}],15:[function(require,module,exports){
"use strict";

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
var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ParserBinaryRaw = void 0;
const BigIntSerde_1 = require("./BigIntSerde");
const IonBinary = __importStar(require("./IonBinary"));
const IonConstants_1 = require("./IonConstants");
const IonDecimal_1 = require("./IonDecimal");
const IonTimestamp_1 = require("./IonTimestamp");
const IonTypes_1 = require("./IonTypes");
const IonUnicode_1 = require("./IonUnicode");
const SignAndMagnitudeInt_1 = __importDefault(require("./SignAndMagnitudeInt"));
const EOF = -1;
const TB_DATAGRAM = 20;
function get_ion_type(rt) {
  switch (rt) {
    case IonBinary.TB_NULL:
      return IonTypes_1.IonTypes.NULL;
    case IonBinary.TB_BOOL:
      return IonTypes_1.IonTypes.BOOL;
    case IonBinary.TB_INT:
      return IonTypes_1.IonTypes.INT;
    case IonBinary.TB_NEG_INT:
      return IonTypes_1.IonTypes.INT;
    case IonBinary.TB_FLOAT:
      return IonTypes_1.IonTypes.FLOAT;
    case IonBinary.TB_DECIMAL:
      return IonTypes_1.IonTypes.DECIMAL;
    case IonBinary.TB_TIMESTAMP:
      return IonTypes_1.IonTypes.TIMESTAMP;
    case IonBinary.TB_SYMBOL:
      return IonTypes_1.IonTypes.SYMBOL;
    case IonBinary.TB_STRING:
      return IonTypes_1.IonTypes.STRING;
    case IonBinary.TB_CLOB:
      return IonTypes_1.IonTypes.CLOB;
    case IonBinary.TB_BLOB:
      return IonTypes_1.IonTypes.BLOB;
    case IonBinary.TB_SEXP:
      return IonTypes_1.IonTypes.SEXP;
    case IonBinary.TB_LIST:
      return IonTypes_1.IonTypes.LIST;
    case IonBinary.TB_STRUCT:
      return IonTypes_1.IonTypes.STRUCT;
    default:
      throw new Error("Unrecognized type code " + rt);
  }
}
const VINT_SHIFT = 7;
const VINT_MASK = 0x7f;
const VINT_FLAG = 0x80;
function high_nibble(tb) {
  return tb >> IonBinary.TYPE_SHIFT & IonBinary.NIBBLE_MASK;
}
function low_nibble(tb) {
  return tb & IonBinary.NIBBLE_MASK;
}
const empty_array = [];
const ivm_sid = IonConstants_1.IVM.sid;
const ivm_image_0 = IonConstants_1.IVM.binary[0];
const ivm_image_1 = IonConstants_1.IVM.binary[1];
const ivm_image_2 = IonConstants_1.IVM.binary[2];
const ivm_image_3 = IonConstants_1.IVM.binary[3];
class EncodingContainer {
  constructor(type, length) {
    this.type = type;
    this.length = length;
  }
}
class ParserBinaryRaw {
  constructor(source) {
    this._raw_type = EOF;
    this._len = -1;
    this._curr = undefined;
    this._null = false;
    this._fid = null;
    this._as = -1;
    this._ae = -1;
    this._a = [];
    this._ts = [new EncodingContainer(TB_DATAGRAM, 0)];
    this._in_struct = false;
    this._in = source;
  }
  static _readFloatFrom(input, numberOfBytes) {
    let tempBuf;
    switch (numberOfBytes) {
      case 0:
        return 0.0;
      case 4:
        tempBuf = new DataView(input.chunk(4).buffer);
        return tempBuf.getFloat32(0, false);
      case 8:
        tempBuf = new DataView(input.chunk(8).buffer);
        return tempBuf.getFloat64(0, false);
      case 15:
        return null;
      default:
        throw new Error("Illegal float length: " + numberOfBytes);
    }
  }
  static _readVarUnsignedIntFrom(input) {
    let numberOfBits = 0;
    let byte;
    let magnitude = 0;
    while (true) {
      byte = input.next();
      magnitude = magnitude << 7 | byte & 0x7f;
      numberOfBits += 7;
      if (byte & 0x80) {
        break;
      }
    }
    if (numberOfBits > 31) {
      throw new Error("VarUInt values larger than 31 bits must be read using SignAndMagnitudeInt.");
    }
    return magnitude;
  }
  static _readVarSignedIntFrom(input) {
    let v = input.next(),
      byte;
    const isNegative = v & 0x40;
    let stopBit = v & 0x80;
    v &= 0x3f;
    let bits = 6;
    while (!stopBit) {
      byte = input.next();
      stopBit = byte & 0x80;
      byte &= 0x7f;
      v <<= 7;
      v |= byte;
      bits += 7;
    }
    if (bits > 32) {
      throw new Error("VarInt values larger than 32 bits must be read using SignAndMagnitudeInt");
    }
    return isNegative ? -v : v;
  }
  static _readSignedIntFrom(input, numberOfBytes) {
    if (numberOfBytes == 0) {
      return new SignAndMagnitudeInt_1.default(0n);
    }
    const bytes = input.view(numberOfBytes);
    const isNegative = (bytes[0] & 0x80) == 0x80;
    const numbers = Array.prototype.slice.call(bytes);
    numbers[0] = bytes[0] & 0x7f;
    const magnitude = BigIntSerde_1.BigIntSerde.fromUnsignedBytes(numbers);
    return new SignAndMagnitudeInt_1.default(magnitude, isNegative);
  }
  static _readUnsignedIntAsBigIntFrom(input, numberOfBytes) {
    return BigIntSerde_1.BigIntSerde.fromUnsignedBytes(Array.prototype.slice.call(input.view(numberOfBytes)));
  }
  static _readUnsignedIntAsNumberFrom(input, numberOfBytes) {
    let value = 0;
    let bytesRead = 0;
    const bytesAvailable = input.getRemaining();
    let byte;
    if (numberOfBytes < 1) {
      return 0;
    } else if (numberOfBytes > 6) {
      throw new Error(`Attempted to read a ${numberOfBytes}-byte unsigned integer,` + ` which is too large for a to be stored in a number without losing precision.`);
    }
    if (bytesAvailable < numberOfBytes) {
      throw new Error(`Attempted to read a ${numberOfBytes}-byte unsigned integer,` + ` but only ${bytesAvailable} bytes were available.`);
    }
    while (bytesRead < numberOfBytes) {
      byte = input.next();
      bytesRead++;
      if (numberOfBytes < 4) {
        value <<= 8;
      } else {
        value *= 256;
      }
      value = value + byte;
    }
    return value;
  }
  static readDecimalValueFrom(input, numberOfBytes) {
    const initialPosition = input.position();
    const exponent = ParserBinaryRaw._readVarSignedIntFrom(input);
    const numberOfExponentBytes = input.position() - initialPosition;
    const numberOfCoefficientBytes = numberOfBytes - numberOfExponentBytes;
    const signedInt = ParserBinaryRaw._readSignedIntFrom(input, numberOfCoefficientBytes);
    const isNegative = signedInt.isNegative;
    const coefficient = isNegative ? -signedInt.magnitude : signedInt.magnitude;
    return IonDecimal_1.Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
  }
  source() {
    return this._in;
  }
  next() {
    if (this._curr === undefined && this._len > 0) {
      this._in.skip(this._len);
    }
    this.clear_value();
    if (this._in_struct) {
      this._fid = this.readVarUnsignedInt();
    }
    return this.load_next();
  }
  stepIn() {
    let len, ts;
    const t = this;
    switch (t._raw_type) {
      case IonBinary.TB_STRUCT:
      case IonBinary.TB_LIST:
      case IonBinary.TB_SEXP:
        break;
      default:
        throw new Error("you can only 'stepIn' to a container");
    }
    len = t._in.getRemaining() - t._len;
    ts = new EncodingContainer(t._raw_type, len);
    t._ts.push(ts);
    t._in_struct = t._raw_type === IonBinary.TB_STRUCT;
    t._in.setRemaining(t._len);
    t.clear_value();
  }
  stepOut() {
    let parent_type, ts, l, r;
    const t = this;
    if (t._ts.length < 2) {
      throw new Error("Cannot stepOut any further, already at top level");
    }
    ts = t._ts.pop();
    l = ts.length;
    parent_type = t._ts[t._ts.length - 1].type;
    t._in_struct = parent_type === IonBinary.TB_STRUCT;
    t.clear_value();
    r = t._in.getRemaining();
    t._in.skip(r);
    t._in.setRemaining(l);
  }
  isNull() {
    return this._null;
  }
  depth() {
    return this._ts.length - 1;
  }
  getFieldId() {
    return this._fid;
  }
  hasAnnotations() {
    return this._as >= 0;
  }
  getAnnotations() {
    const t = this;
    if (t._a === undefined || t._a.length === 0) {
      t.load_annotation_values();
    }
    return t._a;
  }
  getAnnotation(index) {
    const t = this;
    if (t._a === undefined || t._a.length === 0) {
      t.load_annotation_values();
    }
    return t._a[index];
  }
  ionType() {
    return get_ion_type(this._raw_type);
  }
  _getSid() {
    this.load_value();
    if (this._raw_type == IonBinary.TB_SYMBOL) {
      return this._curr === undefined || this._curr === null ? null : this._curr;
    }
    return null;
  }
  byteValue() {
    return this.uInt8ArrayValue();
  }
  uInt8ArrayValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_CLOB:
      case IonBinary.TB_BLOB:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        return this._curr;
      default:
        throw new Error("Current value is not a blob or clob.");
    }
  }
  booleanValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_BOOL:
        if (this.isNull()) {
          return null;
        }
        return this._curr;
    }
    throw new Error("Current value is not a Boolean.");
  }
  decimalValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_DECIMAL:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        return this._curr;
    }
    throw new Error("Current value is not a decimal.");
  }
  bigIntValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_INT:
      case IonBinary.TB_NEG_INT:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        if (!(typeof this._curr === "bigint")) {
          const num = this._curr;
          return BigInt(num);
        }
        return this._curr;
      default:
        throw new Error("bigIntValue() was called when the current value was not an int.");
    }
  }
  numberValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_INT:
      case IonBinary.TB_NEG_INT:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        if (typeof this._curr === "bigint") {
          const bigInt = this._curr;
          return Number(bigInt);
        }
        return this._curr;
      case IonBinary.TB_FLOAT:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        return this._curr;
      default:
        throw new Error("Current value is not a float or int.");
    }
  }
  stringValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_STRING:
      case IonBinary.TB_SYMBOL:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        return this._curr;
    }
    throw new Error("Current value is not a string or symbol.");
  }
  timestampValue() {
    switch (this._raw_type) {
      case IonBinary.TB_NULL:
        return null;
      case IonBinary.TB_TIMESTAMP:
        if (this.isNull()) {
          return null;
        }
        this.load_value();
        return this._curr;
    }
    throw new Error("Current value is not a timestamp.");
  }
  read_binary_float() {
    return ParserBinaryRaw._readFloatFrom(this._in, this._len);
  }
  readVarUnsignedInt() {
    return ParserBinaryRaw._readVarUnsignedIntFrom(this._in);
  }
  readVarSignedInt() {
    return ParserBinaryRaw._readVarSignedIntFrom(this._in);
  }
  readUnsignedIntAsBigInt() {
    return ParserBinaryRaw._readUnsignedIntAsBigIntFrom(this._in, this._len);
  }
  readUnsignedIntAsNumber() {
    return ParserBinaryRaw._readUnsignedIntAsNumberFrom(this._in, this._len);
  }
  read_decimal_value() {
    return ParserBinaryRaw.readDecimalValueFrom(this._in, this._len);
  }
  read_timestamp_value() {
    if (!(this._len > 0)) {
      return null;
    }
    let offset;
    let year;
    let month = null;
    let day = null;
    let hour = null;
    let minute = null;
    let secondInt = null;
    let fractionalSeconds = IonDecimal_1.Decimal.ZERO;
    let precision = IonTimestamp_1.TimestampPrecision.YEAR;
    const end = this._in.position() + this._len;
    offset = this.readVarSignedInt();
    if (this._in.position() < end) {
      year = this.readVarUnsignedInt();
    } else {
      throw new Error("Timestamps must include a year.");
    }
    if (this._in.position() < end) {
      month = this.readVarUnsignedInt();
      precision = IonTimestamp_1.TimestampPrecision.MONTH;
    }
    if (this._in.position() < end) {
      day = this.readVarUnsignedInt();
      precision = IonTimestamp_1.TimestampPrecision.DAY;
    }
    if (this._in.position() < end) {
      hour = this.readVarUnsignedInt();
      if (this._in.position() >= end) {
        throw new Error("Timestamps with an hour must include a minute.");
      } else {
        minute = this.readVarUnsignedInt();
      }
      precision = IonTimestamp_1.TimestampPrecision.HOUR_AND_MINUTE;
    }
    if (this._in.position() < end) {
      secondInt = this.readVarUnsignedInt();
      precision = IonTimestamp_1.TimestampPrecision.SECONDS;
    }
    if (this._in.position() < end) {
      const exponent = this.readVarSignedInt();
      let coefficient = 0n;
      let isNegative = false;
      if (this._in.position() < end) {
        const deserializedSignedInt = ParserBinaryRaw._readSignedIntFrom(this._in, end - this._in.position());
        isNegative = deserializedSignedInt._isNegative;
        coefficient = deserializedSignedInt._magnitude;
      }
      const dec = IonDecimal_1.Decimal._fromBigIntCoefficient(isNegative, coefficient, exponent);
      const [_, fractionStr] = IonTimestamp_1.Timestamp._splitSecondsDecimal(dec);
      fractionalSeconds = IonDecimal_1.Decimal.parse(secondInt + "." + fractionStr);
    }
    let msSinceEpoch = Date.UTC(year, month ? month - 1 : 0, day ? day : 1, hour ? hour : 0, minute ? minute : 0, secondInt ? secondInt : 0, 0);
    msSinceEpoch = IonTimestamp_1.Timestamp._adjustMsSinceEpochIfNeeded(year, msSinceEpoch);
    const date = new Date(msSinceEpoch);
    return IonTimestamp_1.Timestamp._valueOf(date, offset, fractionalSeconds, precision);
  }
  read_string_value() {
    return IonUnicode_1.decodeUtf8(this._in.chunk(this._len));
  }
  clear_value() {
    this._raw_type = EOF;
    this._curr = undefined;
    this._a = empty_array;
    this._as = -1;
    this._null = false;
    this._fid = null;
    this._len = -1;
  }
  load_length(tb) {
    const t = this;
    t._len = low_nibble(tb);
    switch (t._len) {
      case 1:
        if (high_nibble(tb) === IonBinary.TB_STRUCT) {
          t._len = this.readVarUnsignedInt();
        }
        t._null = false;
        break;
      case IonBinary.LEN_VAR:
        t._null = false;
        t._len = this.readVarUnsignedInt();
        break;
      case IonBinary.LEN_NULL:
        t._null = true;
        t._len = 0;
        break;
      default:
        t._null = false;
        break;
    }
  }
  load_next() {
    const t = this;
    let rt, tb;
    t._as = -1;
    if (t._in.is_empty()) {
      t.clear_value();
      return undefined;
    }
    tb = t._in.next();
    rt = high_nibble(tb);
    t.load_length(tb);
    if (rt === IonBinary.TB_ANNOTATION) {
      if (t._len < 1 && t.depth() === 0) {
        rt = t.load_ivm();
      } else {
        rt = t.load_annotations();
      }
    }
    switch (rt) {
      case IonBinary.TB_NULL:
        t._null = true;
        break;
      case IonBinary.TB_BOOL:
        if (t._len === 0 || t._len === 1) {
          t._curr = t._len === 1;
          t._len = 0;
        }
        break;
    }
    t._raw_type = rt;
    return rt;
  }
  load_annotations() {
    const t = this;
    let tb, type_, annotation_len;
    if (t._len < 1 && t.depth() === 0) {
      type_ = t.load_ivm();
    } else {
      annotation_len = this.readVarUnsignedInt();
      t._as = t._in.position();
      t._in.skip(annotation_len);
      t._ae = t._in.position();
      tb = t._in.next();
      t.load_length(tb);
      type_ = high_nibble(tb);
    }
    return type_;
  }
  load_ivm() {
    const t = this;
    const span = t._in;
    if (span.next() !== ivm_image_1) {
      throw new Error("invalid binary Ion at " + span.position());
    }
    if (span.next() !== ivm_image_2) {
      throw new Error("invalid binary Ion at " + span.position());
    }
    if (span.next() !== ivm_image_3) {
      throw new Error("invalid binary Ion at " + span.position());
    }
    t._curr = ivm_sid;
    t._len = 0;
    return IonBinary.TB_SYMBOL;
  }
  load_annotation_values() {
    const t = this;
    let a, b, pos, limit, arr;
    if ((pos = t._as) < 0) {
      return;
    }
    arr = [];
    limit = t._ae;
    a = 0;
    while (pos < limit) {
      b = t._in.valueAt(pos);
      pos++;
      a = a << VINT_SHIFT | b & VINT_MASK;
      if ((b & VINT_FLAG) !== 0) {
        if (a === 0) {
          throw new Error("Symbol ID zero is unsupported.");
        }
        arr.push(a);
        a = 0;
      }
    }
    t._a = arr;
  }
  _readIntegerMagnitude() {
    if (this._len === 0) {
      return 0n;
    }
    if (this._len < 6) {
      return this.readUnsignedIntAsNumber();
    }
    return this.readUnsignedIntAsBigInt();
  }
  load_value() {
    if (this._curr != undefined) {
      return;
    }
    if (this.isNull()) {
      return;
    }
    switch (this._raw_type) {
      case IonBinary.TB_BOOL:
        break;
      case IonBinary.TB_INT:
        this._curr = this._readIntegerMagnitude();
        break;
      case IonBinary.TB_NEG_INT:
        let value = this._readIntegerMagnitude();
        this._curr = typeof value === "bigint" ? -value : -value;
        break;
      case IonBinary.TB_FLOAT:
        this._curr = this.read_binary_float();
        break;
      case IonBinary.TB_DECIMAL:
        if (this._len === 0) {
          this._curr = IonDecimal_1.Decimal.ZERO;
        } else {
          this._curr = this.read_decimal_value();
        }
        break;
      case IonBinary.TB_TIMESTAMP:
        this._curr = this.read_timestamp_value();
        break;
      case IonBinary.TB_SYMBOL:
        this._curr = this.readUnsignedIntAsNumber();
        break;
      case IonBinary.TB_STRING:
        this._curr = this.read_string_value();
        break;
      case IonBinary.TB_CLOB:
      case IonBinary.TB_BLOB:
        if (this.isNull()) {
          break;
        }
        this._curr = this._in.chunk(this._len);
        break;
      default:
        throw new Error("Unexpected type: " + this._raw_type);
    }
  }
}
exports.ParserBinaryRaw = ParserBinaryRaw;

},{"./BigIntSerde":2,"./IonBinary":6,"./IonConstants":10,"./IonDecimal":11,"./IonTimestamp":27,"./IonTypes":29,"./IonUnicode":30,"./SignAndMagnitudeInt":32}],16:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ParserTextRaw = exports.get_ion_type = void 0;
const IonText_1 = require("./IonText");
const IonSymbolToken_1 = require("./IonSymbolToken");
const IonTypes_1 = require("./IonTypes");
const EOF = -1;
const ERROR = -2;
const T_NULL = 1;
const T_BOOL = 2;
const T_INT = 3;
const T_HEXINT = 4;
const T_FLOAT = 5;
const T_FLOAT_SPECIAL = 6;
const T_DECIMAL = 7;
const T_TIMESTAMP = 8;
const T_IDENTIFIER = 9;
const T_OPERATOR = 10;
const T_STRING1 = 11;
const T_STRING2 = 12;
const T_STRING3 = 13;
const T_CLOB2 = 14;
const T_CLOB3 = 15;
const T_BLOB = 16;
const T_SEXP = 17;
const T_LIST = 18;
const T_STRUCT = 19;
const CH_CR = 13;
const CH_NL = 10;
const CH_BS = 92;
const CH_FORWARD_SLASH = "/".charCodeAt(0);
const CH_AS = 42;
const CH_SQ = 39;
const CH_DOUBLE_QUOTE = '"'.charCodeAt(0);
const CH_CM = 44;
const CH_OP = 40;
const CH_CP = 41;
const CH_LEFT_CURLY = "{".charCodeAt(0);
const CH_CC = 125;
const CH_OS = 91;
const CH_CS = 93;
const CH_CL = 58;
const CH_DT = 46;
const CH_EQ = 61;
const CH_PS = 43;
const CH_MS = 45;
const CH_0 = 48;
const CH_D = 68;
const CH_E = 69;
const CH_F = 70;
const CH_T = 84;
const CH_X = 88;
const CH_Z = 90;
const CH_d = 100;
const CH_e = 101;
const CH_f = 102;
const CH_i = 105;
const CH_n = 110;
const CH_x = 120;
const ESC_0 = 48;
const ESC_a = 97;
const ESC_b = 98;
const ESC_t = 116;
const ESC_nl = 110;
const ESC_ff = 102;
const ESC_cr = 114;
const ESC_v = 118;
const ESC_dq = CH_DOUBLE_QUOTE;
const ESC_sq = CH_SQ;
const ESC_qm = 63;
const ESC_bs = 92;
const ESC_fs = 47;
const ESC_nl2 = 10;
const ESC_nl3 = 13;
const ESC_x = CH_x;
const ESC_u = 117;
const ESC_U = 85;
const INF = [CH_i, CH_n, CH_f];
const _UTF16_MASK = 0x03ff;
function get_ion_type(t) {
  switch (t) {
    case EOF:
      return null;
    case ERROR:
      return null;
    case T_NULL:
      return IonTypes_1.IonTypes.NULL;
    case T_BOOL:
      return IonTypes_1.IonTypes.BOOL;
    case T_INT:
      return IonTypes_1.IonTypes.INT;
    case T_HEXINT:
      return IonTypes_1.IonTypes.INT;
    case T_FLOAT:
      return IonTypes_1.IonTypes.FLOAT;
    case T_FLOAT_SPECIAL:
      return IonTypes_1.IonTypes.FLOAT;
    case T_DECIMAL:
      return IonTypes_1.IonTypes.DECIMAL;
    case T_TIMESTAMP:
      return IonTypes_1.IonTypes.TIMESTAMP;
    case T_IDENTIFIER:
      return IonTypes_1.IonTypes.SYMBOL;
    case T_OPERATOR:
      return IonTypes_1.IonTypes.SYMBOL;
    case T_STRING1:
      return IonTypes_1.IonTypes.SYMBOL;
    case T_STRING2:
      return IonTypes_1.IonTypes.STRING;
    case T_STRING3:
      return IonTypes_1.IonTypes.STRING;
    case T_CLOB2:
      return IonTypes_1.IonTypes.CLOB;
    case T_CLOB3:
      return IonTypes_1.IonTypes.CLOB;
    case T_BLOB:
      return IonTypes_1.IonTypes.BLOB;
    case T_SEXP:
      return IonTypes_1.IonTypes.SEXP;
    case T_LIST:
      return IonTypes_1.IonTypes.LIST;
    case T_STRUCT:
      return IonTypes_1.IonTypes.STRUCT;
    default:
      throw new Error("Unknown type: " + String(t) + ".");
  }
}
exports.get_ion_type = get_ion_type;
function get_keyword_type(str) {
  if (str === "null") {
    return T_NULL;
  }
  if (str === "true") {
    return T_BOOL;
  }
  if (str === "false") {
    return T_BOOL;
  }
  if (str === "nan") {
    return T_FLOAT_SPECIAL;
  }
  if (str === "+inf") {
    return T_FLOAT_SPECIAL;
  }
  if (str === "-inf") {
    return T_FLOAT_SPECIAL;
  }
  throw new Error("Unknown keyword: " + str + ".");
}
function get_type_from_name(str) {
  if (str === "null") {
    return T_NULL;
  }
  if (str === "bool") {
    return T_BOOL;
  }
  if (str === "int") {
    return T_INT;
  }
  if (str === "float") {
    return T_FLOAT;
  }
  if (str === "decimal") {
    return T_DECIMAL;
  }
  if (str === "timestamp") {
    return T_TIMESTAMP;
  }
  if (str === "symbol") {
    return T_IDENTIFIER;
  }
  if (str === "string") {
    return T_STRING2;
  }
  if (str === "clob") {
    return T_CLOB2;
  }
  if (str === "blob") {
    return T_BLOB;
  }
  if (str === "sexp") {
    return T_SEXP;
  }
  if (str === "list") {
    return T_LIST;
  }
  if (str === "struct") {
    return T_STRUCT;
  }
  throw new Error("Unknown type: " + str + ".");
}
function get_hex_value(ch) {
  switch (ch) {
    case 48:
      return 0;
    case 49:
      return 1;
    case 50:
      return 2;
    case 51:
      return 3;
    case 52:
      return 4;
    case 53:
      return 5;
    case 54:
      return 6;
    case 55:
      return 7;
    case 56:
      return 8;
    case 57:
      return 9;
    case 97:
      return 10;
    case 98:
      return 11;
    case 99:
      return 12;
    case 100:
      return 13;
    case 101:
      return 14;
    case 102:
      return 15;
    case 65:
      return 10;
    case 66:
      return 11;
    case 67:
      return 12;
    case 68:
      return 13;
    case 69:
      return 14;
    case 70:
      return 15;
  }
  throw new Error("Unexpected bad hex digit in checked data.");
}
function is_valid_base64_length(char_length, trailer_length) {
  if (trailer_length > 2) {
    return false;
  }
  if ((char_length + trailer_length & 0x3) != 0) {
    return false;
  }
  return true;
}
function is_valid_string_char(ch, allow_new_line) {
  if (ch == CH_CR) {
    return allow_new_line;
  }
  if (ch == CH_NL) {
    return allow_new_line;
  }
  if (IonText_1.is_whitespace(ch)) {
    return true;
  }
  if (ch < 32) {
    return false;
  }
  return true;
}
class ParserTextRaw {
  constructor(source) {
    this._value_null = false;
    this._curr_null = false;
    this._read_value_helper_minus = function (ch1, accept_operator_symbols, calling_op) {
      let op,
        ch2 = this._peek();
      if (ch2 == CH_i) {
        ch2 = this._peek("inf");
        if (IonText_1.isNumericTerminator(ch2)) {
          op = this._read_minus_inf;
        } else if (accept_operator_symbols) {
          op = this._read_operator_symbol;
        }
      } else if (IonText_1.is_digit(ch2)) {
        op = this._read_number;
      } else if (accept_operator_symbols) {
        op = this._read_operator_symbol;
      }
      if (op != undefined) {
        this._ops.unshift(op);
        this._unread(ch1);
      } else {
        this._error("operator symbols are not valid outside of sexps");
      }
    };
    this._read_string_helper = function (terminator, allow_new_line) {
      let ch;
      this._start = this._in.position();
      for (;;) {
        ch = this._read();
        if (ch == CH_BS) {
          this._read_string_escape_sequence();
        } else if (ch == terminator) {
          break;
        } else if (!is_valid_string_char(ch, allow_new_line)) {
          throw new Error("invalid character " + ch + " in string");
        }
      }
    };
    this._in = source;
    this._ops = [this._read_datagram_values];
    this._value_type = ERROR;
    this._value = [];
    this._start = -1;
    this._end = -1;
    this._esc_len = -1;
    this._curr = EOF;
    this._ann = [];
    this._msg = "";
    this._fieldname = null;
    this._fieldnameType = null;
    const helpers = {
      40: this._read_value_helper_paren,
      91: this._read_value_helper_square,
      123: this._read_value_helper_curly,
      43: this._read_value_helper_plus,
      45: this._read_value_helper_minus,
      39: this._read_value_helper_single,
      34: this._read_value_helper_double
    };
    const set_helper = function (str, fn) {
      let i = str.length,
        ch;
      while (i > 0) {
        i--;
        ch = str.charCodeAt(i);
        helpers[ch] = fn;
      }
    };
    set_helper("0123456789", this._read_value_helper_digit);
    set_helper("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", this._read_value_helper_letter);
    set_helper("!#%&*+-./;<=>?@^`|~", this._read_value_helper_operator);
    helpers[CH_PS] = this._read_value_helper_plus;
    helpers[CH_MS] = this._read_value_helper_minus;
    this._read_value_helper_helpers = helpers;
  }
  fieldName() {
    return this._fieldname;
  }
  fieldNameType() {
    return this._fieldnameType;
  }
  source() {
    return this._in;
  }
  annotations() {
    return this._ann;
  }
  clearFieldName() {
    this._fieldname = null;
    this._fieldnameType = null;
  }
  isNull() {
    return this._curr_null;
  }
  bigIntValue() {
    if (this.isNull()) {
      return null;
    }
    const intText = this.get_value_as_string(this._curr).toLowerCase();
    switch (this._curr) {
      case T_INT:
      case T_HEXINT:
        if (intText.startsWith("-")) {
          const i = BigInt(intText.slice(1));
          return -i;
        }
        return BigInt(intText);
      default:
        throw new Error("intValue() was called when the current value was not an integer.");
    }
  }
  numberValue() {
    if (this.isNull()) {
      return null;
    }
    const s = this.get_value_as_string(this._curr);
    switch (this._curr) {
      case T_INT:
      case T_HEXINT:
        return Number(BigInt(s));
      case T_FLOAT:
        return Number(s);
      case T_FLOAT_SPECIAL:
        if (s == "+inf") {
          return Number.POSITIVE_INFINITY;
        } else if (s == "-inf") {
          return Number.NEGATIVE_INFINITY;
        } else if (s == "nan") {
          return Number.NaN;
        }
      default:
        throw new Error("can't convert to number");
    }
  }
  booleanValue() {
    if (this.isNull()) {
      return null;
    }
    const s = this.get_value_as_string(T_BOOL);
    if (s === "true") {
      return true;
    } else if (s === "false") {
      return false;
    }
    throw new Error("Unrecognized Boolean value '" + s + "'");
  }
  get_value_as_string(t) {
    let index;
    let ch;
    let s = "";
    switch (t) {
      case T_NULL:
      case T_BOOL:
      case T_INT:
      case T_HEXINT:
      case T_FLOAT:
      case T_FLOAT_SPECIAL:
      case T_DECIMAL:
      case T_TIMESTAMP:
      case T_IDENTIFIER:
      case T_OPERATOR:
        for (index = this._start; index < this._end; index++) {
          s += String.fromCharCode(this._in.valueAt(index));
        }
        break;
      case T_BLOB:
        for (index = this._start; index < this._end; index++) {
          ch = this._in.valueAt(index);
          if (IonText_1.is_base64_char(ch)) {
            s += String.fromCharCode(ch);
          }
        }
        break;
      case T_STRING1:
      case T_STRING2:
      case T_STRING3:
        for (index = this._start; index < this._end; index++) {
          let isEscaped = false;
          ch = this._in.valueAt(index);
          if (ch == CH_BS) {
            ch = this._read_escape_sequence(index, this._end);
            index += this._esc_len;
            isEscaped = true;
          }
          if (this.isHighSurrogate(ch)) {
            index++;
            let tempChar = this._in.valueAt(index);
            if (tempChar == CH_BS) {
              tempChar = this._read_escape_sequence(index, this._end);
              index += this._esc_len;
            }
            if (this.isLowSurrogate(tempChar)) {
              const hiSurrogate = ch;
              const loSurrogate = tempChar;
              const codepoint = 0x10000 + ((hiSurrogate & _UTF16_MASK) << 10) + (loSurrogate & _UTF16_MASK);
              s += String.fromCodePoint(codepoint);
            } else {
              throw new Error("expected a low surrogate, but found: " + ch);
            }
          } else if (this.isLowSurrogate(ch)) {
            throw new Error("unexpected low surrogate: " + ch);
          } else if (t === T_STRING3 && ch === CH_SQ && !isEscaped && this.verifyTriple(index)) {
            index = this._skip_triple_quote_gap(index, this._end, true);
          } else if (ch >= 0) {
            if (isEscaped) {
              s += String.fromCodePoint(ch);
            } else {
              if (t === T_STRING3 && ch === ESC_nl3 && this._in.valueAt(index + 1) === ESC_nl2) {
                ch = ESC_nl2;
                index++;
              }
              s += String.fromCharCode(ch);
            }
          }
        }
        break;
      default:
        throw new Error("can't get this value as a string");
    }
    return s;
  }
  get_value_as_uint8array(t) {
    const bytes = [];
    switch (t) {
      case T_CLOB2:
        for (let index = this._start; index < this._end; index++) {
          const ch = this._in.valueAt(index);
          if (ch === CH_BS) {
            bytes.push(this.readClobEscapes(index, this._end));
            index += this._esc_len;
          } else if (ch < 128) {
            bytes.push(ch);
          } else {
            throw new Error("Non-Ascii values illegal within clob.");
          }
        }
        break;
      case T_CLOB3:
        for (let index = this._start; index < this._end; index++) {
          const ch = this._in.valueAt(index);
          if (ch === CH_BS) {
            const escaped = this.readClobEscapes(index, this._end);
            if (escaped >= 0) {
              bytes.push(escaped);
            }
            index += this._esc_len;
          } else if (ch === CH_SQ) {
            if (this.verifyTriple(index)) {
              index = this._skip_triple_quote_gap(index, this._end, false);
            } else {
              bytes.push(ch);
            }
          } else if (ch < 128) {
            bytes.push(ch);
          } else {
            throw new Error("Non-Ascii values illegal within clob.");
          }
        }
        break;
      default:
        throw new Error("can't get this value as a Uint8Array");
    }
    return Uint8Array.from(bytes);
  }
  next() {
    this.clearFieldName();
    this._ann = [];
    if (this._value_type === ERROR) {
      this._run();
    }
    this._curr = this._value_pop();
    let t;
    if (this._curr === ERROR) {
      this._value.push(ERROR);
      return undefined;
    } else {
      t = this._curr;
    }
    this._curr_null = this._value_null;
    this._value_null = false;
    return t;
  }
  _read_datagram_values() {
    const ch = this._peek();
    if (ch == EOF) {
      this._value_push(EOF);
    } else {
      this._ops.unshift(this._read_datagram_values);
      this._ops.unshift(this._read_value);
    }
  }
  _read_sexp_values() {
    const ch = this._read_after_whitespace(true);
    if (ch == CH_CP) {
      this._value_push(EOF);
    } else if (ch === EOF) {
      throw new Error("Expected closing ).");
    } else {
      this._unread(ch);
      this._ops.unshift(this._read_sexp_values);
      this._ops.unshift(this._read_sexp_value);
    }
  }
  _read_list_values() {
    const ch = this._read_after_whitespace(true);
    if (ch == CH_CS) {
      this._value_push(EOF);
    } else {
      this._unread(ch);
      this._ops.unshift(this._read_list_comma);
      this._ops.unshift(this._read_value);
    }
  }
  _read_struct_values() {
    let op = this._done_with_error,
      ch = this._read_after_whitespace(true);
    switch (ch) {
      case CH_SQ:
        op = this._read_string1;
        if (this._peek("''") != ERROR) {
          op = this._read_string3;
        }
        break;
      case CH_DOUBLE_QUOTE:
        op = this._read_string2;
        break;
      case CH_CC:
        this._value_push(EOF);
        return;
      default:
        if (IonText_1.is_letter(ch)) {
          op = this._read_symbol;
        }
        break;
    }
    if (op === this._done_with_error) {
      this._error("expected field name (or close struct '}') not found");
    } else {
      op.call(this);
      this._load_field_name();
      ch = this._read_after_whitespace(true);
      if (ch != CH_CL) {
        this._error("expected ':'");
        return;
      }
      this._ops.unshift(this._read_struct_comma);
      this._ops.unshift(this._read_value);
    }
  }
  _read_list_comma() {
    let ch = this._read_after_whitespace(true);
    if (ch == CH_CM) {
      ch = this._read_after_whitespace(true);
      if (ch == CH_CS) {
        this._value_push(EOF);
      } else {
        this._unread(ch);
        this._ops.unshift(this._read_list_comma);
        this._ops.unshift(this._read_value);
      }
    } else if (ch == CH_CS) {
      this._value_push(EOF);
    } else {
      this._error("expected ',' or ']'");
    }
  }
  _read_struct_comma() {
    let ch = this._read_after_whitespace(true);
    if (ch == CH_CM) {
      ch = this._read_after_whitespace(true);
      if (ch == CH_CC) {
        this._value_push(EOF);
      } else {
        this._unread(ch);
        this._ops.unshift(this._read_struct_values);
      }
    } else if (ch == CH_CC) {
      this._value_push(EOF);
    } else {
      this._error("expected ',' or '}'");
    }
  }
  _load_field_name() {
    this._fieldnameType = this._value_pop();
    const s = this.get_value_as_string(this._fieldnameType);
    switch (this._fieldnameType) {
      case T_IDENTIFIER:
        if (IonText_1.is_keyword(s)) {
          throw new Error("can't use '" + s + "' as a fieldname without quotes");
        }
      case T_STRING1:
      case T_STRING2:
      case T_STRING3:
        this._fieldname = s;
        break;
      default:
        throw new Error("invalid fieldname" + s);
    }
  }
  _read_value() {
    this._read_value_helper(false, this._read_value);
  }
  _read_sexp_value() {
    this._read_value_helper(true, this._read_sexp_value);
  }
  _read_value_helper(accept_operator_symbols, calling_op) {
    const ch = this._read_after_whitespace(true);
    if (ch == EOF) {
      this._read_value_helper_EOF(ch, accept_operator_symbols, calling_op);
    } else {
      const fn = this._read_value_helper_helpers[ch];
      if (fn != undefined) {
        fn.call(this, ch, accept_operator_symbols, calling_op);
      } else {
        this._error("unexpected character '" + IonText_1.asAscii(ch) + "'");
      }
    }
  }
  _read_value_helper_EOF(ch1, accept_operator_symbols, calling_op) {
    this._ops.unshift(this._done);
  }
  _read_value_helper_paren(ch1, accept_operator_symbols, calling_op) {
    this._value_push(T_SEXP);
    this._ops.unshift(this._read_sexp_values);
  }
  _read_value_helper_square(ch1, accept_operator_symbols, calling_op) {
    this._value_push(T_LIST);
    this._ops.unshift(this._read_list_values);
  }
  _read_value_helper_curly(ch1, accept_operator_symbols, calling_op) {
    let ch3;
    const ch2 = this._read();
    if (ch2 == CH_LEFT_CURLY) {
      ch3 = this._read_after_whitespace(false);
      if (ch3 == CH_SQ) {
        this._ops.unshift(this._read_clob_string3);
      } else if (ch3 == CH_DOUBLE_QUOTE) {
        this._ops.unshift(this._read_clob_string2);
      } else {
        this._unread(ch3);
        this._ops.unshift(this._read_blob);
      }
    } else {
      this._unread(ch2);
      this._value_push(T_STRUCT);
      this._ops.unshift(this._read_struct_values);
    }
  }
  _read_value_helper_plus(ch1, accept_operator_symbols, calling_op) {
    const ch2 = this._peek("inf");
    this._unread(ch1);
    if (IonText_1.isNumericTerminator(ch2)) {
      this._ops.unshift(this._read_plus_inf);
    } else if (accept_operator_symbols) {
      this._ops.unshift(this._read_operator_symbol);
    } else {
      this._error("unexpected '+'");
    }
  }
  _read_value_helper_digit(ch1, accept_operator_symbols, calling_op) {
    const ch2 = this._peek_4_digits(ch1);
    this._unread(ch1);
    if (ch2 == CH_T || ch2 == CH_MS) {
      this._ops.unshift(this._readTimestamp);
    } else {
      this._ops.unshift(this._read_number);
    }
  }
  _read_value_helper_single(ch1, accept_operator_symbols, calling_op) {
    let op;
    if (this._peek("''") != ERROR) {
      op = this._read_string3;
      op.call(this);
    } else {
      op = this._read_string1;
      op.call(this);
      if (this._test_string_as_annotation(op)) {
        this._ops.unshift(calling_op);
      }
    }
  }
  _read_value_helper_double(ch1, accept_operator_symbols, calling_op) {
    this._ops.unshift(this._read_string2);
  }
  _read_value_helper_letter(ch1, accept_operator_symbols, calling_op) {
    this._read_symbol();
    const type = this._value_pop();
    if (type != T_IDENTIFIER) {
      throw new Error("Expecting symbol here.");
    }
    let symbol = this.get_value_as_string(type);
    if (IonText_1.is_keyword(symbol)) {
      let kwt = get_keyword_type(symbol);
      if (kwt === T_NULL) {
        this._value_null = true;
        if (this._peek() === CH_DT) {
          this._read();
          const ch = this._read();
          if (IonText_1.is_letter(ch) !== true) {
            throw new Error("Expected type name after 'null.'");
          }
          this._read_symbol();
          if (this._value_pop() !== T_IDENTIFIER) {
            throw new Error("Expected type name after 'null.'");
          }
          symbol = this.get_value_as_string(T_IDENTIFIER);
          kwt = get_type_from_name(symbol);
        }
        this._start = -1;
        this._end = -1;
      }
      this._value_push(kwt);
    } else {
      const ch = this._read_after_whitespace(true);
      if (ch == CH_CL && this._peek() == CH_CL) {
        this._read();
        const sid = this._parseSymbolId(symbol);
        if (sid === 0) {
          throw new Error("Symbol ID zero is not supported.");
        } else if (isNaN(sid)) {
          this._ann.push(new IonSymbolToken_1.SymbolToken(symbol));
        } else {
          this._ann.push(new IonSymbolToken_1.SymbolToken(null, sid));
        }
        this._ops.unshift(calling_op);
      } else {
        const kwt = T_IDENTIFIER;
        this._unread(ch);
        this._value_push(kwt);
      }
    }
  }
  _read_value_helper_operator(ch1, accept_operator_symbols, calling_op) {
    if (accept_operator_symbols) {
      this._unread(ch1);
      this._ops.unshift(this._read_operator_symbol);
    } else {
      this._error("unexpected operator character");
    }
  }
  _done() {
    this._value_push(EOF);
  }
  _done_with_error() {
    this._value_push(ERROR);
    throw new Error(this._error_msg);
  }
  _read_number() {
    let ch, t;
    this._start = this._in.position();
    ch = this._read();
    if (ch == CH_MS) {
      ch = this._read();
    }
    if (ch == CH_0) {
      ch = this._peek();
      if (ch == CH_x || ch == CH_X) {
        this._read_hex_int();
        return;
      }
      if (IonText_1.is_digit(ch)) {
        this._error("leading zeros are not allowed");
      }
      ch = CH_0;
    }
    t = T_INT;
    ch = this._read_required_digits(ch);
    if (ch == CH_DT) {
      t = T_DECIMAL;
      ch = this._read_optional_digits(this._read());
    }
    if (!IonText_1.isNumericTerminator(ch)) {
      if (ch == CH_d || ch == CH_D) {
        t = T_DECIMAL;
        ch = this._read_exponent();
      } else if (ch == CH_e || ch == CH_E || ch == CH_f || ch == CH_F) {
        t = T_FLOAT;
        ch = this._read_exponent();
      }
    }
    if (!IonText_1.isNumericTerminator(ch)) {
      this._error("invalid character after number");
    } else {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(t);
    }
  }
  _read_hex_int() {
    let ch = this._read();
    if (ch == CH_x || ch == CH_X) {
      ch = this._read();
      ch = this._read_required_hex_digits(ch);
    }
    if (IonText_1.isNumericTerminator(ch)) {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(T_HEXINT);
    } else {
      this._error("invalid character after number");
    }
  }
  _read_exponent() {
    let ch = this._read();
    if (ch == CH_MS || ch == CH_PS) {
      ch = this._read();
    }
    ch = this._read_required_digits(ch);
    return ch;
  }
  _read_plus_inf() {
    this._start = this._in.position();
    if (this._read() == CH_PS) {
      this._read_inf_helper();
    } else {
      this._error("expected +inf");
    }
  }
  _read_minus_inf() {
    this._start = this._in.position();
    if (this._read() == CH_MS) {
      this._read_inf_helper();
    } else {
      this._error("expected -inf");
    }
  }
  _read_inf_helper() {
    let ii, ch;
    for (ii = 0; ii < 3; ii++) {
      ch = this._read();
      if (ch != INF[ii]) {
        this._error("expected 'inf'");
        return;
      }
    }
    if (IonText_1.isNumericTerminator(this._peek())) {
      this._end = this._in.position();
      this._value_push(T_FLOAT_SPECIAL);
    } else {
      this._error("invalid numeric terminator after 'inf'");
    }
  }
  _readTimestamp() {
    this._start = this._in.position();
    let ch = this._readPastNDigits(4);
    if (ch === CH_T) {
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_MS) {
      throw new Error("Timestamp year must be followed by '-' or 'T'.");
    }
    ch = this._readPastNDigits(2);
    if (ch === CH_T) {
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_MS) {
      throw new Error("Timestamp month must be followed by '-' or 'T'.");
    }
    ch = this._readPastNDigits(2);
    if (IonText_1.isNumericTerminator(ch)) {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_T) {
      throw new Error("Timestamp day must be followed by a numeric stop character .");
    }
    const peekChar = this._in.peek();
    if (IonText_1.isNumericTerminator(peekChar)) {
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (!IonText_1.is_digit(peekChar)) {
      throw new Error("Timestamp DATE must be followed by numeric terminator or additional TIME digits.");
    }
    ch = this._readPastNDigits(2);
    if (ch !== CH_CL) {
      throw new Error("Timestamp time(hr:min) requires format of 00:00");
    }
    ch = this._readPastNDigits(2);
    if (ch === CH_CL) {
      ch = this._readPastNDigits(2);
      if (ch === CH_DT) {
        if (!IonText_1.is_digit(this._read())) {
          throw new Error("W3C timestamp spec requires atleast one digit after decimal point.");
        }
        while (IonText_1.is_digit(ch = this._read())) {}
      }
    }
    if (ch === CH_Z) {
      if (!IonText_1.isNumericTerminator(this._peek())) {
        throw new Error("Illegal terminator after Zulu offset.");
      }
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_PS && ch !== CH_MS) {
      throw new Error("Timestamps require an offset.");
    }
    ch = this._readPastNDigits(2);
    if (ch !== CH_CL) {
      throw new Error("Timestamp offset(hr:min) requires format of +/-00:00.");
    }
    this._readNDigits(2);
    ch = this._peek();
    if (!IonText_1.isNumericTerminator(ch)) {
      throw new Error("Improperly formatted timestamp.");
    }
    this._end = this._in.position();
    this._value_push(T_TIMESTAMP);
  }
  _read_symbol() {
    let ch;
    this._start = this._in.position() - 1;
    for (;;) {
      ch = this._read();
      if (!IonText_1.is_letter_or_digit(ch)) {
        break;
      }
    }
    this._unread(ch);
    this._end = this._in.position();
    this._value_push(T_IDENTIFIER);
  }
  _read_operator_symbol() {
    let ch;
    this._start = this._in.position();
    for (;;) {
      ch = this._read();
      if (!IonText_1.is_operator_char(ch)) {
        break;
      }
    }
    this._end = this._in.position() - 1;
    this._unread(ch);
    this._value_push(T_OPERATOR);
  }
  _read_string1() {
    this._read_string_helper(CH_SQ, false);
    this._end = this._in.position() - 1;
    this._value_push(T_STRING1);
  }
  _read_string2() {
    this._read_string_helper(CH_DOUBLE_QUOTE, false);
    this._end = this._in.position() - 1;
    this._value_push(T_STRING2);
  }
  _read_string3(recognizeComments) {
    if (recognizeComments === undefined) {
      recognizeComments = true;
    }
    let ch;
    this._unread(this._peek(""));
    for (this._start = this._in.position() + 3; this._peek("'''") !== ERROR; this._in.unread(this._read_after_whitespace(recognizeComments))) {
      for (let i = 0; i < 3; i++) {
        this._read();
      }
      while (this._peek("'''") === ERROR) {
        ch = this._read();
        if (ch == CH_BS) {
          this._read_string_escape_sequence();
        }
        if (ch === EOF) {
          throw new Error("Closing triple quotes not found.");
        }
        if (!is_valid_string_char(ch, true)) {
          throw new Error("invalid character " + ch + " in string");
        }
      }
      this._end = this._in.position();
      for (let i = 0; i < 3; i++) {
        this._read();
      }
    }
    this._value_push(T_STRING3);
  }
  verifyTriple(entryIndex) {
    return this._in.valueAt(entryIndex) === CH_SQ && this._in.valueAt(entryIndex + 1) === CH_SQ && this._in.valueAt(entryIndex + 2) === CH_SQ;
  }
  _read_string_escape_sequence() {
    let ch = this._read();
    switch (ch) {
      case ESC_0:
      case ESC_a:
      case ESC_b:
      case ESC_t:
      case ESC_nl:
      case ESC_ff:
      case ESC_cr:
      case ESC_v:
      case ESC_dq:
      case ESC_sq:
      case ESC_qm:
      case ESC_bs:
      case ESC_fs:
      case ESC_nl2:
        break;
      case ESC_nl3:
        ch = this._read();
        if (ch != ESC_nl2) {
          this._unread(ch);
        }
        break;
      case ESC_x:
        ch = this._read_N_hexdigits(2);
        this._unread(ch);
        break;
      case ESC_u:
        ch = this._read_N_hexdigits(4);
        this._unread(ch);
        break;
      case ESC_U:
        ch = this._read_N_hexdigits(8);
        this._unread(ch);
        break;
      default:
        this._error("unexpected character: " + ch + " after escape slash");
    }
  }
  _test_string_as_annotation(op) {
    let s, ch, is_ann;
    const t = this._value_pop();
    if (t != T_STRING1 && t != T_STRING3) {
      this._error("expecting quoted symbol here");
    }
    s = this.get_value_as_string(t);
    ch = this._read_after_whitespace(true);
    if (ch == CH_CL && this._peek() == CH_CL) {
      this._read();
      this._ann.push(new IonSymbolToken_1.SymbolToken(s));
      is_ann = true;
    } else {
      this._unread(ch);
      this._value_push(t);
      is_ann = false;
    }
    return is_ann;
  }
  _read_clob_string2() {
    let t;
    this._read_string2();
    t = this._value_pop();
    if (t != T_STRING2) {
      this._error("string expected");
    }
    this._value_push(T_CLOB2);
    this._ops.unshift(this._read_close_double_brace);
  }
  _read_clob_string3() {
    let t;
    this._read_string3(false);
    t = this._value_pop();
    if (t != T_STRING3) {
      this._error("string expected");
    }
    this._value_push(T_CLOB3);
    this._ops.unshift(this._read_close_double_brace);
  }
  _read_blob() {
    let ch,
      base64_chars = 0,
      trailers = 0;
    this._start = this._in.position();
    while (true) {
      ch = this._read();
      if (IonText_1.is_base64_char(ch)) {
        base64_chars++;
        this._end = this._in.position();
      } else if (!IonText_1.is_whitespace(ch)) {
        break;
      }
    }
    while (ch == CH_EQ) {
      trailers++;
      ch = this._read_after_whitespace(false);
    }
    if (ch != CH_CC || this._read() != CH_CC) {
      throw new Error("Invalid blob");
    }
    if (!is_valid_base64_length(base64_chars, trailers)) {
      throw new Error("Invalid base64 value");
    }
    this._value_push(T_BLOB);
  }
  _read_close_double_brace() {
    const ch = this._read_after_whitespace(false);
    if (ch != CH_CC || this._read() != CH_CC) {
      this._error("expected '}}'");
    }
  }
  isHighSurrogate(ch) {
    return ch >= 0xd800 && ch <= 0xdbff;
  }
  isLowSurrogate(ch) {
    return ch >= 0xdc00 && ch <= 0xdfff;
  }
  indexWhiteSpace(index, acceptComments) {
    let ch = this._in.valueAt(index);
    if (!acceptComments) {
      for (; IonText_1.is_whitespace(ch); ch = this._in.valueAt(index++)) {}
    } else {
      for (; IonText_1.is_whitespace(ch) || ch === CH_FORWARD_SLASH; ch = this._in.valueAt(index++)) {
        if (ch === CH_FORWARD_SLASH) {
          ch = this._in.valueAt(index++);
          switch (ch) {
            case CH_FORWARD_SLASH:
              index = this.indexToNewLine(index);
              break;
            case CH_AS:
              index = this.indexToCloseComment(index);
              break;
            default:
              index--;
              break;
          }
        }
      }
    }
    return index;
  }
  indexToNewLine(index) {
    let ch = this._in.valueAt(index);
    while (ch !== EOF && ch !== CH_NL) {
      if (ch === CH_CR) {
        if (this._in.valueAt(index + 1) !== CH_NL) {
          return index;
        }
      }
      ch = this._in.valueAt(index++);
    }
    return index;
  }
  indexToCloseComment(index) {
    while (this._in.valueAt(index) !== CH_AS && this._in.valueAt(index + 1) !== CH_FORWARD_SLASH) {
      index++;
    }
    return index;
  }
  _skip_triple_quote_gap(entryIndex, end, acceptComments) {
    let tempIndex = entryIndex + 3;
    tempIndex = this.indexWhiteSpace(tempIndex, acceptComments);
    if (tempIndex + 2 <= end && this.verifyTriple(tempIndex)) {
      return tempIndex + 4;
    } else {
      return tempIndex + 1;
    }
  }
  readClobEscapes(ii, end) {
    let ch;
    if (ii + 1 >= end) {
      throw new Error("invalid escape sequence");
    }
    ch = this._in.valueAt(ii + 1);
    this._esc_len = 1;
    switch (ch) {
      case ESC_0:
        return 0;
      case ESC_a:
        return 7;
      case ESC_b:
        return 8;
      case ESC_t:
        return 9;
      case ESC_nl:
        return 10;
      case ESC_ff:
        return 12;
      case ESC_cr:
        return 13;
      case ESC_v:
        return 11;
      case ESC_dq:
        return 34;
      case ESC_sq:
        return 39;
      case ESC_qm:
        return 63;
      case ESC_bs:
        return 92;
      case ESC_fs:
        return 47;
      case ESC_nl2:
        return -1;
      case ESC_nl3:
        if (ii + 2 < end && this._in.valueAt(ii + 2) == CH_NL) {
          this._esc_len = 2;
        }
        return IonText_1.ESCAPED_NEWLINE;
      case ESC_x:
        if (ii + 3 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 4);
        this._esc_len = 3;
        break;
      default:
        throw new Error("Invalid escape: /" + ch);
    }
    return ch;
  }
  _read_escape_sequence(ii, end) {
    let ch;
    if (ii + 1 >= end) {
      throw new Error("Invalid escape sequence.");
    }
    ch = this._in.valueAt(ii + 1);
    this._esc_len = 1;
    switch (ch) {
      case ESC_0:
        return 0;
      case ESC_a:
        return 7;
      case ESC_b:
        return 8;
      case ESC_t:
        return 9;
      case ESC_nl:
        return 10;
      case ESC_ff:
        return 12;
      case ESC_cr:
        return 13;
      case ESC_v:
        return 11;
      case ESC_dq:
        return 34;
      case ESC_sq:
        return 39;
      case ESC_qm:
        return 63;
      case ESC_bs:
        return 92;
      case ESC_fs:
        return 47;
      case ESC_nl2:
        return -1;
      case ESC_nl3:
        if (ii + 2 < end && this._in.valueAt(ii + 2) == CH_NL) {
          this._esc_len = 2;
        }
        return IonText_1.ESCAPED_NEWLINE;
      case ESC_x:
        if (ii + 3 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 4);
        this._esc_len = 3;
        break;
      case ESC_u:
        if (ii + 5 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 6);
        this._esc_len = 5;
        break;
      case ESC_U:
        if (ii + 9 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 10);
        this._esc_len = 9;
        break;
      default:
        throw new Error("unexpected character after escape slash");
    }
    return ch;
  }
  _get_N_hexdigits(ii, end) {
    let ch,
      v = 0;
    while (ii < end) {
      ch = this._in.valueAt(ii);
      v = v * 16 + get_hex_value(ch);
      ii++;
    }
    return v;
  }
  _value_push(t) {
    if (this._value_type !== ERROR) {
      this._error("unexpected double push of value type!");
    }
    this._value_type = t;
  }
  _value_pop() {
    const t = this._value_type;
    this._value_type = ERROR;
    return t;
  }
  _run() {
    let op;
    while (this._ops.length > 0 && this._value_type === ERROR) {
      op = this._ops.shift();
      op.call(this);
    }
  }
  _read() {
    const ch = this._in.next();
    return ch;
  }
  _read_skipping_comments() {
    let ch = this._read();
    if (ch == CH_FORWARD_SLASH) {
      ch = this._read();
      if (ch == CH_FORWARD_SLASH) {
        this._read_to_newline();
        ch = IonText_1.WHITESPACE_COMMENT1;
      } else if (ch == CH_AS) {
        this._read_to_close_comment();
        ch = IonText_1.WHITESPACE_COMMENT2;
      } else {
        this._unread(ch);
        ch = CH_FORWARD_SLASH;
      }
    }
    return ch;
  }
  _read_to_newline() {
    let ch;
    for (;;) {
      ch = this._read();
      if (ch == EOF) {
        break;
      }
      if (ch == CH_NL) {
        break;
      }
      if (ch == CH_CR) {
        ch = this._read();
        if (ch != CH_NL) {
          this._unread(ch);
        }
        break;
      }
    }
  }
  _read_to_close_comment() {
    let ch;
    for (;;) {
      ch = this._read();
      if (ch == EOF) {
        break;
      }
      if (ch == CH_AS) {
        ch = this._read();
        if (ch == CH_FORWARD_SLASH) {
          break;
        }
      }
    }
  }
  _unread(ch) {
    this._in.unread(ch);
  }
  _read_after_whitespace(recognize_comments) {
    let ch;
    if (recognize_comments) {
      ch = this._read_skipping_comments();
      while (IonText_1.is_whitespace(ch)) {
        ch = this._read_skipping_comments();
      }
    } else {
      ch = this._read();
      while (IonText_1.is_whitespace(ch)) {
        ch = this._read();
      }
    }
    return ch;
  }
  _peek(expected) {
    let ch,
      ii = 0;
    if (expected === undefined || expected.length < 1) {
      return this._in.valueAt(this._in.position());
    }
    while (ii < expected.length) {
      ch = this._read();
      if (ch != expected.charCodeAt(ii)) {
        break;
      }
      ii++;
    }
    if (ii === expected.length) {
      ch = this._peek();
    } else {
      this._unread(ch);
      ch = ERROR;
    }
    while (ii > 0) {
      ii--;
      this._unread(expected.charCodeAt(ii));
    }
    return ch;
  }
  _peek_4_digits(ch1) {
    let ii,
      ch,
      is_digits = true;
    const chars = [];
    if (!IonText_1.is_digit(ch1)) {
      return ERROR;
    }
    for (ii = 0; ii < 3; ii++) {
      ch = this._read();
      chars.push(ch);
      if (!IonText_1.is_digit(ch)) {
        is_digits = false;
        break;
      }
    }
    ch = is_digits && ii == 3 ? this._peek() : ERROR;
    while (chars.length > 0) {
      this._unread(chars.pop());
    }
    return ch;
  }
  _read_required_digits(ch) {
    if (!IonText_1.is_digit(ch)) {
      return ERROR;
    }
    for (;;) {
      ch = this._read();
      if (!IonText_1.is_digit(ch)) {
        break;
      }
    }
    return ch;
  }
  _read_optional_digits(ch) {
    while (IonText_1.is_digit(ch)) {
      ch = this._read();
    }
    return ch;
  }
  _readNDigits(n) {
    let ch;
    if (n <= 0) {
      throw new Error("Cannot read a lack of or negative number of digits.");
    }
    while (n--) {
      if (!IonText_1.is_digit(ch = this._read())) {
        throw new Error("Expected digit, got: " + String.fromCharCode(ch));
      }
    }
    return ch;
  }
  _readPastNDigits(n) {
    this._readNDigits(n);
    return this._read();
  }
  _read_required_hex_digits(ch) {
    if (!IonText_1.is_hex_digit(ch)) {
      return ERROR;
    }
    for (;;) {
      ch = this._read();
      if (!IonText_1.is_hex_digit(ch)) {
        break;
      }
    }
    return ch;
  }
  _read_N_hexdigits(n) {
    let ch,
      ii = 0;
    while (ii < n) {
      ch = this._read();
      if (!IonText_1.is_hex_digit(ch)) {
        this._error("" + n + " digits required " + ii + " found");
        return ERROR;
      }
      ii++;
    }
    return ch;
  }
  _parseSymbolId(s) {
    if (s[0] !== "$") {
      return NaN;
    }
    for (let i = 1; i < s.length; i++) {
      if (s[i] < "0" || s[i] > "9") {
        return NaN;
      }
    }
    return parseInt(s.substr(1, s.length));
  }
  _error(msg) {
    this._ops.unshift(this._done_with_error);
    this._error_msg = msg;
  }
}
exports.ParserTextRaw = ParserTextRaw;

},{"./IonSymbolToken":21,"./IonText":24,"./IonTypes":29}],17:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PrettyTextWriter = void 0;
const IonText_1 = require("./IonText");
const IonTextWriter_1 = require("./IonTextWriter");
const IonTypes_1 = require("./IonTypes");
class PrettyTextWriter extends IonTextWriter_1.TextWriter {
  constructor(writeable) {
    let indentSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    super(writeable);
    this.indentSize = indentSize;
    this.indentCount = 0;
  }
  writeFieldName(fieldName) {
    if (this.currentContainer.containerType !== IonTypes_1.IonTypes.STRUCT) {
      throw new Error("Cannot write field name outside of a struct");
    }
    if (this.currentContainer.state !== IonTextWriter_1.State.STRUCT_FIELD) {
      throw new Error("Expecting a struct value");
    }
    if (!this.currentContainer.clean) {
      this.writeable.writeByte(IonText_1.CharCodes.COMMA);
      this.writePrettyNewLine(0);
    }
    this.writePrettyIndent(0);
    this.writeSymbolToken(fieldName);
    this.writeable.writeByte(IonText_1.CharCodes.COLON);
    this.writeable.writeByte(IonText_1.CharCodes.SPACE);
    this.currentContainer.state = IonTextWriter_1.State.VALUE;
  }
  writeNull(type) {
    if (type === undefined || type === null) {
      type = IonTypes_1.IonTypes.NULL;
    }
    this.handleSeparator();
    this.writePrettyValue();
    this.writeAnnotations();
    this._writeNull(type);
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT) {
      this.currentContainer.state = IonTextWriter_1.State.STRUCT_FIELD;
    }
  }
  stepOut() {
    const currentContainer = this.containerContext.pop();
    if (!currentContainer || !currentContainer.containerType) {
      throw new Error("Can't step out when not in a container");
    } else if (currentContainer.containerType === IonTypes_1.IonTypes.STRUCT && currentContainer.state === IonTextWriter_1.State.VALUE) {
      throw new Error("Expecting a struct value");
    }
    if (!currentContainer.clean) {
      this.writePrettyNewLine(0);
    }
    this.writePrettyIndent(-1);
    switch (currentContainer.containerType) {
      case IonTypes_1.IonTypes.LIST:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACKET);
        break;
      case IonTypes_1.IonTypes.SEXP:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_PARENTHESIS);
        break;
      case IonTypes_1.IonTypes.STRUCT:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACE);
        break;
      default:
        throw new Error("Unexpected container type");
    }
  }
  _serializeValue(type, value, serialize) {
    if (this.currentContainer.state === IonTextWriter_1.State.STRUCT_FIELD) {
      throw new Error("Expecting a struct field");
    }
    if (value === null) {
      this.writeNull(type);
      return;
    }
    this.handleSeparator();
    this.writePrettyValue();
    this.writeAnnotations();
    serialize(value);
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT) {
      this.currentContainer.state = IonTextWriter_1.State.STRUCT_FIELD;
    }
  }
  writeContainer(type, openingCharacter) {
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT && this.currentContainer.state === IonTextWriter_1.State.VALUE) {
      this.currentContainer.state = IonTextWriter_1.State.STRUCT_FIELD;
    }
    this.handleSeparator();
    this.writePrettyValue();
    this.writeAnnotations();
    this.writeable.writeByte(openingCharacter);
    this.writePrettyNewLine(1);
    this._stepIn(type);
  }
  handleSeparator() {
    if (this.depth() === 0) {
      if (this.currentContainer.clean) {
        this.currentContainer.clean = false;
      } else {
        this.writeable.writeByte(IonText_1.CharCodes.LINE_FEED);
      }
    } else {
      if (this.currentContainer.clean) {
        this.currentContainer.clean = false;
      } else {
        switch (this.currentContainer.containerType) {
          case IonTypes_1.IonTypes.LIST:
            this.writeable.writeByte(IonText_1.CharCodes.COMMA);
            this.writePrettyNewLine(0);
            break;
          case IonTypes_1.IonTypes.SEXP:
            this.writeable.writeByte(IonText_1.CharCodes.SPACE);
            this.writePrettyNewLine(0);
            break;
          default:
        }
      }
    }
  }
  writePrettyValue() {
    if (this.depth() > 0 && this.currentContainer.containerType && this.currentContainer.containerType !== IonTypes_1.IonTypes.STRUCT) {
      this.writePrettyIndent(0);
    }
  }
  writePrettyNewLine(incrementValue) {
    this.indentCount = this.indentCount + incrementValue;
    if (this.indentSize && this.indentSize > 0) {
      this.writeable.writeByte(IonText_1.CharCodes.LINE_FEED);
    }
  }
  writePrettyIndent(incrementValue) {
    this.indentCount = this.indentCount + incrementValue;
    if (this.indentSize && this.indentSize > 0) {
      for (let i = 0; i < this.indentCount * this.indentSize; i++) {
        this.writeable.writeByte(IonText_1.CharCodes.SPACE);
      }
    }
  }
}
exports.PrettyTextWriter = PrettyTextWriter;

},{"./IonText":24,"./IonTextWriter":26,"./IonTypes":29}],18:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SharedSymbolTable = void 0;
class SharedSymbolTable {
  constructor(_name, _version, _symbols) {
    this._name = _name;
    this._version = _version;
    this._symbols = _symbols;
    this._idsByText = new Map();
    this._numberOfSymbols = this._symbols.length;
    for (let m = _symbols.length - 1; m >= 0; m--) {
      this._idsByText.set(_symbols[m], m);
    }
  }
  get numberOfSymbols() {
    return this._numberOfSymbols;
  }
  get name() {
    return this._name;
  }
  get version() {
    return this._version;
  }
  getSymbolText(symbolId) {
    if (symbolId < 0) {
      throw new Error(`Index ${symbolId} is out of bounds for the SharedSymbolTable name=${this.name}, version=${this.version}`);
    }
    if (symbolId >= this.numberOfSymbols) {
      return undefined;
    }
    return this._symbols[symbolId];
  }
  getSymbolId(text) {
    return this._idsByText.get(text);
  }
}
exports.SharedSymbolTable = SharedSymbolTable;

},{}],19:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BinarySpan = exports.StringSpan = exports.Span = void 0;
const IonConstants_1 = require("./IonConstants");
const SPAN_TYPE_STRING = 0;
const SPAN_TYPE_BINARY = 1;
const SPAN_TYPE_SUB_FLAG = 2;
const SPAN_TYPE_SUB_STRING = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_STRING;
const SPAN_TYPE_SUB_BINARY = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_BINARY;
const MAX_POS = 1024 * 1024 * 1024;
const LINE_FEED = 10;
const CARRAIGE_RETURN = 13;
const DEBUG_FLAG = true;
class Span {
  constructor(_type) {
    this._type = _type;
  }
  static error() {
    throw new Error("span error");
  }
  write(b) {
    throw new Error("not implemented");
  }
}
exports.Span = Span;
class StringSpan extends Span {
  constructor(src) {
    super(SPAN_TYPE_STRING);
    this._line = 1;
    this._src = src;
    this._limit = src.length;
    this._start = 0;
    this._pos = 0;
    this._line_start = 0;
    this._old_line_start = 0;
  }
  viewSource() {
    return this._src;
  }
  position() {
    return this._pos - this._start;
  }
  getRemaining() {
    return this._limit - this._pos;
  }
  setRemaining(r) {
    this._limit = r + this._pos;
  }
  is_empty() {
    return this._pos >= this._limit;
  }
  next() {
    let ch;
    if (this.is_empty()) {
      if (this._pos > MAX_POS) {
        throw new Error("span position is out of bounds");
      }
      this._pos++;
      return IonConstants_1.EOF;
    }
    ch = this._src.charCodeAt(this._pos);
    if (ch === CARRAIGE_RETURN) {
      if (this.peek() != LINE_FEED) {
        this._inc_line();
      }
    } else if (ch == LINE_FEED) {
      this._inc_line();
    }
    this._pos++;
    return ch;
  }
  _inc_line() {
    this._old_line_start = this._line_start;
    this._line++;
    this._line_start = this._pos;
  }
  unread(ch) {
    if (this._pos <= this._start) {
      Span.error();
    }
    this._pos--;
    if (ch < 0) {
      if (this.is_empty() != true) {
        Span.error();
      }
      return;
    }
    if (this._pos == this._line_start) {
      this._line_start = this._old_line_start;
      this._line--;
    }
    if (ch != this.peek()) {
      Span.error();
    }
  }
  peek() {
    return this.valueAt(this._pos);
  }
  skip(dist) {
    this._pos += dist;
    if (this._pos > this._limit) {
      this._pos = this._limit;
    }
  }
  valueAt(ii) {
    if (ii < this._start || ii >= this._limit) {
      return IonConstants_1.EOF;
    }
    return this._src.charCodeAt(ii);
  }
  chunk(length) {
    const tempStr = this._src.substr(this._pos, length);
    this._pos += length;
    return tempStr;
  }
  getCodePoint(index) {
    return this._src.codePointAt(index);
  }
  line_number() {
    return this._line;
  }
  offset() {
    return this._pos - this._line_start;
  }
  clone(start) {
    return new StringSpan(this._src.substr(this._pos));
  }
}
exports.StringSpan = StringSpan;
class BinarySpan extends Span {
  constructor(src) {
    super(SPAN_TYPE_BINARY);
    this._src = src;
    this._limit = src.length;
    this._start = 0;
    this._pos = 0;
  }
  position() {
    return this._pos - this._start;
  }
  getRemaining() {
    return this._limit - this._pos;
  }
  setRemaining(r) {
    this._limit = r + this._pos;
  }
  is_empty() {
    return this._pos >= this._limit;
  }
  next() {
    if (this.is_empty()) {
      return IonConstants_1.EOF;
    }
    return this._src[this._pos++];
  }
  view(length) {
    if (this._pos + length > this._limit) {
      throw new Error("Unable to read " + length + " bytes (position: " + this.position() + ", limit: " + this._limit + ")");
    }
    return this._src.subarray(this._pos, this._pos += length);
  }
  chunk(length) {
    return new Uint8Array(this.view(length));
  }
  unread(b) {
    if (this._pos <= this._start) {
      Span.error();
    }
    this._pos--;
    if (b == IonConstants_1.EOF) {
      if (this.is_empty() == false) {
        Span.error();
      }
    }
    if (b != this.peek()) {
      Span.error();
    }
  }
  peek() {
    if (this.is_empty()) {
      return IonConstants_1.EOF;
    }
    return this._src[this._pos];
  }
  skip(dist) {
    this._pos += dist;
    if (this._pos > this._limit) {
      throw new Error("Skipped over end of source.");
    }
  }
  valueAt(ii) {
    if (ii < this._start || ii >= this._limit) {
      return IonConstants_1.EOF;
    }
    return this._src[ii];
  }
  clone(start, len) {
    return new BinarySpan(this._src.subarray(this._pos));
  }
}
exports.BinarySpan = BinarySpan;

},{"./IonConstants":10}],20:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SubstituteSymbolTable = void 0;
const IonSharedSymbolTable_1 = require("./IonSharedSymbolTable");
class SubstituteSymbolTable extends IonSharedSymbolTable_1.SharedSymbolTable {
  constructor(length) {
    if (length < 0) {
      throw new Error("Cannot instantiate a SubstituteSymbolTable with a negative length. (" + length + ")");
    }
    super("_substitute", -1, []);
    this._numberOfSymbols = length;
  }
  getSymbolText(symbolId) {
    if (symbolId < 0) {
      throw new Error(`Index ${symbolId} is out of bounds for the SharedSymbolTable name=${this.name}, version=${this.version}`);
    }
    return undefined;
  }
  getSymbolId(text) {
    return undefined;
  }
}
exports.SubstituteSymbolTable = SubstituteSymbolTable;

},{"./IonSharedSymbolTable":18}],21:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SymbolToken = void 0;
class SymbolToken {
  constructor(text) {
    let sid = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : SymbolToken._UNKNOWN_SYMBOL_ID;
    this.text = text;
    this.sid = sid;
  }
  getText() {
    return this.text;
  }
  getSid() {
    return this.sid;
  }
}
exports.SymbolToken = SymbolToken;
SymbolToken._UNKNOWN_SYMBOL_ID = -1;

},{}],22:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSymbolTable = exports.ion_symbol_table_sid = exports.ion_symbol_table = void 0;
const IonImport_1 = require("./IonImport");
const IonLocalSymbolTable_1 = require("./IonLocalSymbolTable");
const IonSubstituteSymbolTable_1 = require("./IonSubstituteSymbolTable");
const IonSystemSymbolTable_1 = require("./IonSystemSymbolTable");
const Ion_1 = require("./Ion");
exports.ion_symbol_table = "$ion_symbol_table";
exports.ion_symbol_table_sid = 3;
const empty_struct = {};
function load_imports(reader, catalog) {
  let import_ = IonSystemSymbolTable_1.getSystemSymbolTableImport();
  reader.stepIn();
  while (reader.next()) {
    reader.stepIn();
    let name = null;
    let version = 1;
    let maxId = null;
    while (reader.next()) {
      switch (reader.fieldName()) {
        case "name":
          name = reader.stringValue();
          break;
        case "version":
          version = reader.numberValue();
          break;
        case "max_id":
          maxId = reader.numberValue();
      }
    }
    if (version === null || version < 1) {
      version = 1;
    }
    if (name && name !== "$ion") {
      let symbolTable = catalog.getVersion(name, version);
      if (!symbolTable) {
        if (maxId === undefined) {
          throw new Error(`No exact match found when trying to import symbol table ${name} version ${version}`);
        } else {
          symbolTable = catalog.getTable(name);
        }
      }
      if (!symbolTable) {
        symbolTable = new IonSubstituteSymbolTable_1.SubstituteSymbolTable(maxId);
      }
      import_ = new IonImport_1.Import(import_, symbolTable, maxId);
    }
    reader.stepOut();
  }
  reader.stepOut();
  return import_;
}
function load_symbols(reader) {
  const symbols = [];
  reader.stepIn();
  while (reader.next()) {
    symbols.push(reader.stringValue());
  }
  reader.stepOut();
  return symbols;
}
function makeSymbolTable(catalog, reader, currentSymbolTable) {
  let import_ = null;
  let symbols = [];
  let foundSymbols = false;
  let foundImports = false;
  let foundLstAppend = false;
  reader.stepIn();
  while (reader.next()) {
    switch (reader.fieldName()) {
      case "imports":
        if (foundImports) {
          throw new Error("Multiple import fields found.");
        }
        let ion_type = reader.type();
        if (ion_type === Ion_1.IonTypes.SYMBOL && reader.stringValue() === exports.ion_symbol_table) {
          import_ = currentSymbolTable.import;
          let symbols_ = symbols;
          symbols = currentSymbolTable.symbols;
          symbols.push(...symbols_);
          foundLstAppend = true;
        } else if (ion_type === Ion_1.IonTypes.LIST) {
          import_ = load_imports(reader, catalog);
        } else {
          throw new Error(`Expected import field name to be a list or symbol found ${ion_type}`);
        }
        foundImports = true;
        break;
      case "symbols":
        if (foundSymbols) {
          throw new Error("Multiple symbol fields found.");
        }
        if (foundLstAppend) {
          symbols.push(...load_symbols(reader));
        } else {
          symbols = load_symbols(reader);
        }
        foundSymbols = true;
        break;
    }
  }
  reader.stepOut();
  return new IonLocalSymbolTable_1.LocalSymbolTable(import_, symbols);
}
exports.makeSymbolTable = makeSymbolTable;

},{"./Ion":5,"./IonImport":12,"./IonLocalSymbolTable":13,"./IonSubstituteSymbolTable":20,"./IonSystemSymbolTable":23}],23:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSystemSymbolTableImport = exports.getSystemSymbolTable = void 0;
const IonImport_1 = require("./IonImport");
const IonSharedSymbolTable_1 = require("./IonSharedSymbolTable");
const systemSymbolTable = new IonSharedSymbolTable_1.SharedSymbolTable("$ion", 1, ["$ion", "$ion_1_0", "$ion_symbol_table", "name", "version", "imports", "symbols", "max_id", "$ion_shared_symbol_table"]);
function getSystemSymbolTable() {
  return systemSymbolTable;
}
exports.getSystemSymbolTable = getSystemSymbolTable;
function getSystemSymbolTableImport() {
  return new IonImport_1.Import(null, getSystemSymbolTable());
}
exports.getSystemSymbolTableImport = getSystemSymbolTableImport;

},{"./IonImport":12,"./IonSharedSymbolTable":18}],24:[function(require,module,exports){
"use strict";

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
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.escape = exports.isDigit = exports.isOperator = exports.isIdentifier = exports.SymbolEscapes = exports.StringEscapes = exports.ClobEscapes = exports.CharCodes = exports.toBase64 = exports.fromBase64 = exports.is_hex_digit = exports.is_base64_char = exports.is_whitespace = exports.is_operator_char = exports.is_letter_or_digit = exports.isNumericTerminator = exports.is_letter = exports.toHex = exports.escapeSequence = exports.escapeString = exports.needsEscape = exports.nextEscape = exports.asAscii = exports.is_keyword = exports.is_digit = exports.ESCAPED_NEWLINE = exports.WHITESPACE_COMMENT2 = exports.WHITESPACE_COMMENT1 = void 0;
exports.WHITESPACE_COMMENT1 = -2;
exports.WHITESPACE_COMMENT2 = -3;
exports.ESCAPED_NEWLINE = -4;
const DOUBLE_QUOTE = 34;
const SINGLE_QUOTE = 39;
const SLASH = 92;
const _escapeStrings = {
  0: "\\0",
  8: "\\b",
  9: "\\t",
  10: "\\n",
  13: "\\r",
  DOUBLE_QUOTE: '\\"',
  SINGLE_QUOTE: "\\'",
  SLASH: "\\\\"
};
function _make_bool_array(str) {
  let i = str.length;
  const a = [];
  a[128] = false;
  while (i > 0) {
    --i;
    a[str.charCodeAt(i)] = true;
  }
  return a;
}
const _is_base64_char = _make_bool_array("+/0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_hex_digit = _make_bool_array("0123456789abcdefABCDEF");
const _is_letter = _make_bool_array("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_letter_or_digit = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
const _is_numeric_terminator = _make_bool_array("{}[](),\"' \t\n\r\v\u000c");
const _is_operator_char = _make_bool_array("!#%&*+-./;<=>?@^`|~");
const _is_whitespace = _make_bool_array(" \t\r\n\u000b\u000c");
const isIdentifierArray = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
function is_digit(ch) {
  if (ch < 48 || ch > 57) {
    return false;
  }
  return true;
}
exports.is_digit = is_digit;
function is_keyword(str) {
  return str === "null" || str === "true" || str === "false" || str === "nan" || str === "+inf" || str === "-inf";
}
exports.is_keyword = is_keyword;
function asAscii(s) {
  if (typeof s === "undefined") {
    s = "undefined::null";
  } else if (typeof s == "number") {
    s = "" + s;
  } else if (typeof s != "string") {
    const esc = nextEscape(s, s.length);
    if (esc >= 0) {
      s = escapeString(s, esc);
    }
  }
  return s;
}
exports.asAscii = asAscii;
function nextEscape(s, prev) {
  while (prev-- > 0) {
    if (needsEscape(s.charCodeAt(prev))) {
      break;
    }
  }
  return prev;
}
exports.nextEscape = nextEscape;
function needsEscape(c) {
  if (c < 32) {
    return true;
  }
  if (c > 126) {
    return true;
  }
  if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === SLASH) {
    return true;
  }
  return false;
}
exports.needsEscape = needsEscape;
function escapeString(s, pos) {
  const fixes = [];
  let c, ii, s2;
  while (pos >= 0) {
    c = s.charCodeAt(pos);
    if (!needsEscape(c)) {
      break;
    }
    fixes.push([pos, c]);
    pos = nextEscape(s, pos);
  }
  if (fixes.length > 0) {
    s2 = "";
    ii = fixes.length;
    pos = s.length;
    while (ii--) {
      const fix = fixes[ii];
      const tail_len = pos - fix[0] - 1;
      if (tail_len > 0) {
        s2 = escapeSequence(fix[1]) + s.substring(fix[0] + 1, pos) + s2;
      } else {
        s2 = s.substring(fix[0] + 1, pos) + s2;
      }
      pos = fix[0] - 1;
    }
    if (pos >= 0) {
      s2 = s.substring(0, pos) + s2;
    }
    s = s2;
  }
  return s;
}
exports.escapeString = escapeString;
function escapeSequence(c) {
  let s = _escapeStrings[c];
  if (typeof s === "undefined") {
    if (c < 256) {
      s = "\\x" + toHex(c, 2);
    } else if (c <= 0xffff) {
      s = "\\u" + toHex(c, 4);
    } else {
      s = "\\U" + toHex(c, 8);
    }
  }
  return s;
}
exports.escapeSequence = escapeSequence;
function toHex(c, len) {
  let s = "";
  while (c > 0) {
    s += "0123456789ABCDEF".charAt(c && 0xf);
    c = c / 16;
  }
  if (s.length < len) {
    s = "000000000" + s;
    s = s.substring(s.length - len, s.length);
  }
  return s;
}
exports.toHex = toHex;
function is_letter(ch) {
  return _is_letter[ch];
}
exports.is_letter = is_letter;
function isNumericTerminator(ch) {
  if (ch == -1) {
    return true;
  }
  return _is_numeric_terminator[ch];
}
exports.isNumericTerminator = isNumericTerminator;
function is_letter_or_digit(ch) {
  return _is_letter_or_digit[ch];
}
exports.is_letter_or_digit = is_letter_or_digit;
function is_operator_char(ch) {
  return _is_operator_char[ch];
}
exports.is_operator_char = is_operator_char;
function is_whitespace(ch) {
  if (ch > 32) {
    return false;
  }
  if (ch == exports.WHITESPACE_COMMENT1) {
    return true;
  }
  if (ch == exports.WHITESPACE_COMMENT2) {
    return true;
  }
  if (ch == exports.ESCAPED_NEWLINE) {
    return true;
  }
  return _is_whitespace[ch];
}
exports.is_whitespace = is_whitespace;
function is_base64_char(ch) {
  return _is_base64_char[ch];
}
exports.is_base64_char = is_base64_char;
function is_hex_digit(ch) {
  return _is_hex_digit[ch];
}
exports.is_hex_digit = is_hex_digit;
const base64chars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"];
const base64inv = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
  a: 26,
  b: 27,
  c: 28,
  d: 29,
  e: 30,
  f: 31,
  g: 32,
  h: 33,
  i: 34,
  j: 35,
  k: 36,
  l: 37,
  m: 38,
  n: 39,
  o: 40,
  p: 41,
  q: 42,
  r: 43,
  s: 44,
  t: 45,
  u: 46,
  v: 47,
  w: 48,
  x: 49,
  y: 50,
  z: 51,
  "0": 52,
  "1": 53,
  "2": 54,
  "3": 55,
  "4": 56,
  "5": 57,
  "6": 58,
  "7": 59,
  "8": 60,
  "9": 61,
  "+": 62,
  "/": 63
};
function fromBase64(str) {
  let pad = 0;
  for (let i = str.length - 1; str.charAt(i) == "="; i--) {
    pad++;
  }
  const buf = new Uint8Array(str.length * 3 / 4 - pad);
  for (let i = 0; i < str.length - pad; i += 4) {
    const c0 = base64inv[str.charAt(i)],
      c1 = base64inv[str.charAt(i + 1)],
      c2 = base64inv[str.charAt(i + 2)],
      c3 = base64inv[str.charAt(i + 3)];
    buf[i * 3 / 4] = c0 << 2 & 255 | c1 >>> 4;
    if (i + 2 < str.length - pad) {
      buf[i * 3 / 4 + 1] = c1 << 4 & 255 | c2 >>> 2;
      if (i + 3 < str.length - pad) {
        buf[i * 3 / 4 + 2] = c2 << 6 & 255 | c3;
      }
    }
  }
  return buf;
}
exports.fromBase64 = fromBase64;
function toBase64(buf) {
  const str = new Array(Math.ceil(buf.length * 4 / 3));
  for (let i = 0; i < buf.length; i += 3) {
    const b0 = buf[i],
      b1 = buf[i + 1],
      b2 = buf[i + 2],
      b3 = buf[i + 3];
    str[i * 4 / 3] = base64chars[b0 >>> 2];
    str[i * 4 / 3 + 1] = base64chars[b0 << 4 & 63 | (b1 || 0) >>> 4];
    if (i + 1 < buf.length) {
      str[i * 4 / 3 + 2] = base64chars[b1 << 2 & 63 | (b2 || 0) >>> 6];
      if (i + 2 < buf.length) {
        str[i * 4 / 3 + 3] = base64chars[b2 & 63];
      } else {
        return str.join("") + "=";
      }
    } else {
      return str.join("") + "==";
    }
  }
  return str.join("");
}
exports.toBase64 = toBase64;
var CharCodes;
(function (CharCodes) {
  CharCodes[CharCodes["NULL"] = 0] = "NULL";
  CharCodes[CharCodes["BELL"] = 7] = "BELL";
  CharCodes[CharCodes["BACKSPACE"] = 8] = "BACKSPACE";
  CharCodes[CharCodes["HORIZONTAL_TAB"] = 9] = "HORIZONTAL_TAB";
  CharCodes[CharCodes["LINE_FEED"] = 10] = "LINE_FEED";
  CharCodes[CharCodes["VERTICAL_TAB"] = 11] = "VERTICAL_TAB";
  CharCodes[CharCodes["FORM_FEED"] = 12] = "FORM_FEED";
  CharCodes[CharCodes["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
  CharCodes[CharCodes["DOUBLE_QUOTE"] = 34] = "DOUBLE_QUOTE";
  CharCodes[CharCodes["SINGLE_QUOTE"] = 39] = "SINGLE_QUOTE";
  CharCodes[CharCodes["FORWARD_SLASH"] = 47] = "FORWARD_SLASH";
  CharCodes[CharCodes["QUESTION_MARK"] = 63] = "QUESTION_MARK";
  CharCodes[CharCodes["BACKSLASH"] = 92] = "BACKSLASH";
  CharCodes[CharCodes["LEFT_PARENTHESIS"] = 40] = "LEFT_PARENTHESIS";
  CharCodes[CharCodes["RIGHT_PARENTHESIS"] = 41] = "RIGHT_PARENTHESIS";
  CharCodes[CharCodes["LEFT_BRACE"] = 123] = "LEFT_BRACE";
  CharCodes[CharCodes["RIGHT_BRACE"] = 125] = "RIGHT_BRACE";
  CharCodes[CharCodes["LEFT_BRACKET"] = 91] = "LEFT_BRACKET";
  CharCodes[CharCodes["RIGHT_BRACKET"] = 93] = "RIGHT_BRACKET";
  CharCodes[CharCodes["COMMA"] = 44] = "COMMA";
  CharCodes[CharCodes["SPACE"] = 32] = "SPACE";
  CharCodes[CharCodes["LOWERCASE_X"] = 120] = "LOWERCASE_X";
  CharCodes[CharCodes["COLON"] = 58] = "COLON";
})(CharCodes = exports.CharCodes || (exports.CharCodes = {}));
function backslashEscape(s) {
  return [CharCodes.BACKSLASH, s.charCodeAt(0)];
}
function toCharCodes(s) {
  const charCodes = new Array(s.length);
  for (let i = 0; i < s.length; i++) {
    charCodes[i] = s.charCodeAt(i);
  }
  return charCodes;
}
const _HEX_ESCAPE_PREFIX = [CharCodes.BACKSLASH, CharCodes.LOWERCASE_X];
function hexEscape(codePoint) {
  let hexEscape = codePoint.toString(16);
  while (hexEscape.length < 2) {
    hexEscape = "0" + hexEscape;
  }
  return _HEX_ESCAPE_PREFIX.concat(toCharCodes(hexEscape));
}
function populateWithHexEscapes(escapes, start, end) {
  if (end === undefined) {
    escapes[start] = hexEscape(start);
  } else {
    for (let i = start; i < end; i++) {
      escapes[i] = hexEscape(i);
    }
  }
}
const CommonEscapes = {};
CommonEscapes[CharCodes.NULL] = backslashEscape("0");
populateWithHexEscapes(CommonEscapes, 1, 7);
CommonEscapes[CharCodes.BELL] = backslashEscape("a");
CommonEscapes[CharCodes.BACKSPACE] = backslashEscape("b");
CommonEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape("t");
CommonEscapes[CharCodes.LINE_FEED] = backslashEscape("n");
CommonEscapes[CharCodes.VERTICAL_TAB] = backslashEscape("v");
CommonEscapes[CharCodes.FORM_FEED] = backslashEscape("f");
CommonEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape("r");
populateWithHexEscapes(CommonEscapes, 14, 32);
CommonEscapes[CharCodes.BACKSLASH] = backslashEscape("\\");
populateWithHexEscapes(CommonEscapes, 0x7f, 0xa0);
exports.ClobEscapes = (0, _extends2.default)({}, CommonEscapes);
exports.ClobEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
exports.ClobEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
exports.ClobEscapes[CharCodes.FORWARD_SLASH] = backslashEscape("/");
exports.ClobEscapes[CharCodes.QUESTION_MARK] = backslashEscape("?");
exports.StringEscapes = (0, _extends2.default)({}, CommonEscapes);
exports.StringEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
exports.SymbolEscapes = (0, _extends2.default)({}, CommonEscapes);
exports.SymbolEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
function isIdentifier(s) {
  if (is_digit(s.charCodeAt(0))) {
    return false;
  }
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const b = isIdentifierArray[c];
    if (!b) {
      return false;
    }
  }
  return true;
}
exports.isIdentifier = isIdentifier;
function isOperator(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const b = _is_operator_char[c];
    if (!b) {
      return false;
    }
  }
  return true;
}
exports.isOperator = isOperator;
function isDigit(charCode) {
  return charCode < 58 && charCode > 47;
}
exports.isDigit = isDigit;
function escape(input, escapes) {
  let escapedString = "";
  let escapeSeq = "";
  let charCode;
  let escape;
  let lastIndex = 0;
  for (let i = 0; i < input.length; i++) {
    charCode = input.charCodeAt(i);
    escape = escapes[charCode];
    if (escape !== undefined) {
      for (let j = 0; j < escape.length; j++) {
        escapeSeq += String.fromCharCode(escape[j]);
      }
      escapedString += input.slice(lastIndex, i) + escapeSeq;
      lastIndex = i + 1;
      escapeSeq = "";
    }
  }
  return escapedString + input.slice(lastIndex, input.length);
}
exports.escape = escape;

},{"@babel/runtime/helpers/extends":56,"@babel/runtime/helpers/interopRequireDefault":57}],25:[function(require,module,exports){
"use strict";

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
var __importDefault = void 0 && (void 0).__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextReader = void 0;
const IntSize_1 = __importDefault(require("./IntSize"));
const IonCatalog_1 = require("./IonCatalog");
const IonDecimal_1 = require("./IonDecimal");
const IonLocalSymbolTable_1 = require("./IonLocalSymbolTable");
const IonParserTextRaw_1 = require("./IonParserTextRaw");
const IonSymbols_1 = require("./IonSymbols");
const IonText_1 = require("./IonText");
const IonTimestamp_1 = require("./IonTimestamp");
const IonTypes_1 = require("./IonTypes");
const util_1 = require("./util");
const BEGINNING_OF_CONTAINER = -2;
const EOF = -1;
const T_IDENTIFIER = 9;
const T_STRING1 = 11;
const T_CLOB2 = 14;
const T_CLOB3 = 15;
const T_STRUCT = 19;
class TextReader {
  constructor(source, catalog) {
    if (!source) {
      throw new Error("a source Span is required to make a reader");
    }
    this._parser = new IonParserTextRaw_1.ParserTextRaw(source);
    this._depth = 0;
    this._cat = catalog ? catalog : new IonCatalog_1.Catalog();
    this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
    this._type = null;
    this._raw_type = undefined;
    this._raw = undefined;
  }
  load_raw() {
    const t = this;
    if (t._raw !== undefined) {
      return;
    }
    if (t._raw_type === T_CLOB2 || t._raw_type === T_CLOB3) {
      t._raw = t._parser.get_value_as_uint8array(t._raw_type);
    } else {
      t._raw = t._parser.get_value_as_string(t._raw_type);
    }
  }
  skip_past_container() {
    let type;
    const d = this.depth();
    this.stepIn();
    while (this.depth() > d) {
      type = this.next();
      if (type === null) {
        this.stepOut();
      } else if (type.isContainer && !this.isNull()) {
        this.stepIn();
      }
    }
  }
  isIVM(input, depth, annotations) {
    if (depth > 0) {
      return false;
    }
    const ivm = "$ion_1_0";
    const prefix = "$ion_";
    if (input.length < ivm.length || annotations.length > 0) {
      return false;
    }
    let i = 0;
    while (i < prefix.length) {
      if (prefix.charAt(i) !== input.charAt(i)) {
        return false;
      }
      i++;
    }
    while (i < input.length && input.charAt(i) != "_") {
      const ch = input.charAt(i);
      if (ch < "0" || ch > "9") {
        return false;
      }
      i++;
    }
    i++;
    while (i < input.length) {
      const ch = input.charAt(i);
      if (ch < "0" || ch > "9") {
        return false;
      }
      i++;
    }
    if (input !== ivm) {
      throw new Error("Only Ion version 1.0 is supported.");
    }
    return true;
  }
  isLikeIVM() {
    return false;
  }
  position() {
    return this._parser.source().position();
  }
  next() {
    this._raw = undefined;
    if (this._raw_type === EOF) {
      return null;
    }
    if (this._raw_type !== BEGINNING_OF_CONTAINER && !this.isNull() && this._type && this._type.isContainer) {
      this.skip_past_container();
    }
    const p = this._parser;
    for (;;) {
      this._raw_type = p.next();
      if (this._raw_type === T_IDENTIFIER) {
        if (this._depth > 0) {
          break;
        }
        this.load_raw();
        if (!this.isIVM(this._raw, this.depth(), this.annotations())) {
          break;
        }
        this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
        this._raw = undefined;
        this._raw_type = undefined;
      } else if (this._raw_type === T_STRING1) {
        if (this._depth > 0) {
          break;
        }
        this.load_raw();
        if (this._raw !== "$ion_1_0") {
          break;
        }
        this._raw = undefined;
        this._raw_type = undefined;
      } else if (this._raw_type === T_STRUCT) {
        if (p.annotations().length !== 1) {
          break;
        }
        if (p.annotations()[0].getText() != IonSymbols_1.ion_symbol_table) {
          break;
        }
        this._type = IonParserTextRaw_1.get_ion_type(this._raw_type);
        this._symtab = IonSymbols_1.makeSymbolTable(this._cat, this, this._symtab);
        this._raw = undefined;
        this._raw_type = undefined;
      } else {
        break;
      }
    }
    this._type = IonParserTextRaw_1.get_ion_type(this._raw_type);
    return this._type;
  }
  stepIn() {
    if (!this._type.isContainer) {
      throw new Error("can't step in to a scalar value");
    }
    if (this.isNull()) {
      throw new Error("Can't step into a null container");
    }
    this._parser.clearFieldName();
    this._type = null;
    this._raw_type = BEGINNING_OF_CONTAINER;
    this._depth++;
  }
  stepOut() {
    this._parser.clearFieldName();
    while (this._raw_type != EOF) {
      this.next();
    }
    this._raw_type = undefined;
    if (this._depth <= 0) {
      throw new Error("Cannot stepOut any further, already at top level");
    }
    this._depth--;
  }
  type() {
    return this._type;
  }
  depth() {
    return this._depth;
  }
  fieldName() {
    const str = this._parser.fieldName();
    if (str !== null) {
      const raw_type = this._parser.fieldNameType();
      if (raw_type === T_IDENTIFIER && str.length > 1 && str[0] === "$") {
        const tempStr = str.substr(1, str.length);
        if (+tempStr === +tempStr) {
          const symbol = this._symtab.getSymbolText(Number(tempStr));
          if (symbol === undefined) {
            throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
          }
          return symbol;
        }
      }
    }
    return str;
  }
  annotations() {
    return this._parser.annotations().map(st => {
      const text = st.getText();
      if (text !== null) {
        return text;
      } else {
        const symbol = this._symtab.getSymbolText(st.getSid());
        if (symbol === undefined || symbol === null) {
          throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
        }
        return symbol;
      }
    });
  }
  isNull() {
    if (this._type === IonTypes_1.IonTypes.NULL) {
      return true;
    }
    return this._parser.isNull();
  }
  _stringRepresentation() {
    this.load_raw();
    if (this.isNull()) {
      return this._type === IonTypes_1.IonTypes.NULL ? "null" : "null." + this._type.name;
    }
    return this._raw;
  }
  booleanValue() {
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.BOOL:
        return this._parser.booleanValue();
    }
    throw new Error("Current value is not a Boolean.");
  }
  uInt8ArrayValue() {
    this.load_raw();
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.BLOB:
        if (this.isNull()) {
          return null;
        }
        return IonText_1.fromBase64(this._raw);
      case IonTypes_1.IonTypes.CLOB:
        if (this.isNull()) {
          return null;
        }
        return this._raw;
    }
    throw new Error("Current value is not a blob or clob.");
  }
  decimalValue() {
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.DECIMAL:
        return IonDecimal_1.Decimal.parse(this._stringRepresentation());
    }
    throw new Error("Current value is not a decimal.");
  }
  bigIntValue() {
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.INT:
        return this._parser.bigIntValue();
    }
    throw new Error("bigIntValue() was called when the current value was a(n) " + this._type.name);
  }
  intSize() {
    if (util_1.isSafeInteger(this.bigIntValue())) {
      return IntSize_1.default.Number;
    }
    return IntSize_1.default.BigInt;
  }
  numberValue() {
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.FLOAT:
      case IonTypes_1.IonTypes.INT:
        return this._parser.numberValue();
    }
    throw new Error("Current value is not a float or int.");
  }
  stringValue() {
    this.load_raw();
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.STRING:
        if (this._parser.isNull()) {
          return null;
        }
        return this._raw;
      case IonTypes_1.IonTypes.SYMBOL:
        if (this._parser.isNull()) {
          return null;
        }
        if (this._raw_type === T_IDENTIFIER && this._raw.length > 1 && this._raw.charAt(0) === "$".charAt(0)) {
          const tempStr = this._raw.substr(1, this._raw.length);
          if (+tempStr === +tempStr) {
            const symbolId = Number(tempStr);
            const symbol = this._symtab.getSymbolText(symbolId);
            if (symbol === undefined) {
              throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
            }
            return symbol;
          }
        }
        return this._raw;
    }
    throw new Error("Current value is not a string or symbol.");
  }
  timestampValue() {
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.TIMESTAMP:
        return IonTimestamp_1.Timestamp.parse(this._stringRepresentation());
    }
    throw new Error("Current value is not a timestamp.");
  }
  value() {
    if (this._type && this._type.isContainer) {
      if (this.isNull()) {
        return null;
      }
      throw new Error("Unable to provide a value for " + this._type.name + " containers.");
    }
    switch (this._type) {
      case IonTypes_1.IonTypes.NULL:
        return null;
      case IonTypes_1.IonTypes.BLOB:
      case IonTypes_1.IonTypes.CLOB:
        return this.uInt8ArrayValue();
      case IonTypes_1.IonTypes.BOOL:
        return this.booleanValue();
      case IonTypes_1.IonTypes.DECIMAL:
        return this.decimalValue();
      case IonTypes_1.IonTypes.INT:
        return this.bigIntValue();
      case IonTypes_1.IonTypes.FLOAT:
        return this.numberValue();
      case IonTypes_1.IonTypes.STRING:
      case IonTypes_1.IonTypes.SYMBOL:
        return this.stringValue();
      case IonTypes_1.IonTypes.TIMESTAMP:
        return this.timestampValue();
      default:
        throw new Error("There is no current value.");
    }
  }
}
exports.TextReader = TextReader;

},{"./IntSize":4,"./IonCatalog":9,"./IonDecimal":11,"./IonLocalSymbolTable":13,"./IonParserTextRaw":16,"./IonSymbols":22,"./IonText":24,"./IonTimestamp":27,"./IonTypes":29,"./util":55}],26:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TextWriter = exports.Context = exports.State = void 0;
const AbstractWriter_1 = require("./AbstractWriter");
const IonText_1 = require("./IonText");
const IonTypes_1 = require("./IonTypes");
const IonUnicode_1 = require("./IonUnicode");
const util_1 = require("./util");
var State;
(function (State) {
  State[State["VALUE"] = 0] = "VALUE";
  State[State["STRUCT_FIELD"] = 1] = "STRUCT_FIELD";
})(State = exports.State || (exports.State = {}));
class Context {
  constructor(myType) {
    this.state = myType === IonTypes_1.IonTypes.STRUCT ? State.STRUCT_FIELD : State.VALUE;
    this.clean = true;
    this.containerType = myType;
  }
}
exports.Context = Context;
class TextWriter extends AbstractWriter_1.AbstractWriter {
  constructor(writeable) {
    super();
    this.writeable = writeable;
    this._floatSerializer = value => {
      TextWriter._serializeFloat(this, value);
    };
    this.containerContext = [new Context(null)];
  }
  get isTopLevel() {
    return this.depth() === 0;
  }
  get currentContainer() {
    return this.containerContext[this.depth()];
  }
  static _serializeFloat(writer, value) {
    let text;
    if (value === Number.POSITIVE_INFINITY) {
      text = "+inf";
    } else if (value === Number.NEGATIVE_INFINITY) {
      text = "-inf";
    } else if (Object.is(value, Number.NaN)) {
      text = "nan";
    } else if (Object.is(value, -0)) {
      text = "-0e0";
    } else {
      text = value.toExponential();
      const plusSignIndex = text.lastIndexOf("+");
      if (plusSignIndex > -1) {
        text = text.slice(0, plusSignIndex) + text.slice(plusSignIndex + 1);
      }
    }
    writer.writeUtf8(text);
  }
  getBytes() {
    return this.writeable.getBytes();
  }
  writeBlob(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.BLOB, value, value => {
      this.writeable.writeBytes(IonUnicode_1.encodeUtf8("{{" + IonText_1.toBase64(value) + "}}"));
    });
  }
  writeBoolean(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.BOOL, value, value => {
      this.writeUtf8(value ? "true" : "false");
    });
  }
  writeClob(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.CLOB, value, value => {
      let hexStr;
      this.writeUtf8('{{"');
      for (let i = 0; i < value.length; i++) {
        const c = value[i];
        if (c > 127 && c < 256) {
          hexStr = "\\x" + c.toString(16);
          for (let j = 0; j < hexStr.length; j++) {
            this.writeable.writeByte(hexStr.charCodeAt(j));
          }
        } else {
          const escape = IonText_1.ClobEscapes[c];
          if (escape === undefined) {
            if (c < 32) {
              hexStr = "\\x" + c.toString(16);
              for (let j = 0; j < hexStr.length; j++) {
                this.writeable.writeByte(hexStr.charCodeAt(j));
              }
            } else {
              this.writeable.writeByte(c);
            }
          } else {
            this.writeable.writeBytes(new Uint8Array(escape));
          }
        }
      }
      this.writeUtf8('"}}');
    });
  }
  writeDecimal(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.DECIMAL, value, value => {
      let s = "";
      let coefficient = value.getCoefficient();
      if (coefficient < 0n) {
        coefficient = -coefficient;
      }
      if (value.isNegative()) {
        s += "-";
      }
      const exponent = value.getExponent();
      const scale = -exponent;
      if (exponent == 0) {
        s += coefficient.toString() + ".";
      } else if (exponent < 0) {
        const significantDigits = coefficient.toString().length;
        const adjustedExponent = significantDigits - 1 - scale;
        if (adjustedExponent >= 0) {
          const wholeDigits = significantDigits - scale;
          s += coefficient.toString().substring(0, wholeDigits);
          s += ".";
          s += coefficient.toString().substring(wholeDigits, significantDigits);
        } else if (adjustedExponent >= -6) {
          s += "0.";
          s += "00000".substring(0, scale - significantDigits);
          s += coefficient.toString();
        } else {
          s += coefficient.toString();
          s += "d-";
          s += scale.toString();
        }
      } else {
        s += coefficient.toString() + "d" + exponent;
      }
      this.writeUtf8(s);
    });
  }
  _isInStruct() {
    return this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT;
  }
  writeFieldName(fieldName) {
    util_1._assertDefined(fieldName);
    if (this.currentContainer.containerType !== IonTypes_1.IonTypes.STRUCT) {
      throw new Error("Cannot write field name outside of a struct");
    }
    if (this.currentContainer.state !== State.STRUCT_FIELD) {
      throw new Error("Expecting a struct value");
    }
    if (!this.currentContainer.clean) {
      this.writeable.writeByte(IonText_1.CharCodes.COMMA);
    }
    this.writeSymbolToken(fieldName);
    this.writeable.writeByte(IonText_1.CharCodes.COLON);
    this.currentContainer.state = State.VALUE;
  }
  writeFloat32(value) {
    util_1._assertDefined(value);
    this._writeFloat(value);
  }
  writeFloat64(value) {
    util_1._assertDefined(value);
    this._writeFloat(value);
  }
  writeInt(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.INT, value, value => {
      this.writeUtf8(value.toString(10));
    });
  }
  _writeNull(type) {
    if (type === IonTypes_1.IonTypes.NULL) {
      this.writeUtf8("null");
    } else {
      this.writeUtf8("null." + type.name);
    }
  }
  writeNull(type) {
    if (type === undefined || type === null) {
      type = IonTypes_1.IonTypes.NULL;
    }
    this.handleSeparator();
    this.writeAnnotations();
    this._writeNull(type);
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT) {
      this.currentContainer.state = State.STRUCT_FIELD;
    }
  }
  writeString(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.STRING, value, value => {
      this.writeable.writeBytes(IonUnicode_1.encodeUtf8('"' + IonText_1.escape(value, IonText_1.StringEscapes) + '"'));
    });
  }
  writeSymbol(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.SYMBOL, value, value => {
      this.writeSymbolToken(value);
    });
  }
  writeTimestamp(value) {
    util_1._assertDefined(value);
    this._serializeValue(IonTypes_1.IonTypes.TIMESTAMP, value, value => {
      this.writeUtf8(value.toString());
    });
  }
  stepIn(type) {
    if (this.currentContainer.state === State.STRUCT_FIELD) {
      throw new Error(`Started writing a ${this.currentContainer.containerType.name} inside a struct"
                + " without writing the field name first. Call writeFieldName(string) with the desired name"
                + " before calling stepIn(${this.currentContainer.containerType.name}).`);
    }
    switch (type) {
      case IonTypes_1.IonTypes.LIST:
        this.writeContainer(type, IonText_1.CharCodes.LEFT_BRACKET);
        break;
      case IonTypes_1.IonTypes.SEXP:
        this.writeContainer(type, IonText_1.CharCodes.LEFT_PARENTHESIS);
        break;
      case IonTypes_1.IonTypes.STRUCT:
        if (this._annotations !== undefined && this._annotations[0] === "$ion_symbol_table" && this.depth() === 0) {
          throw new Error("Unable to alter symbol table context, it allows invalid ion to be written.");
        }
        this.writeContainer(type, IonText_1.CharCodes.LEFT_BRACE);
        break;
      default:
        throw new Error("Unrecognized container type");
    }
  }
  stepOut() {
    const currentContainer = this.containerContext.pop();
    if (!currentContainer || !currentContainer.containerType) {
      throw new Error("Can't step out when not in a container");
    } else if (currentContainer.containerType === IonTypes_1.IonTypes.STRUCT && currentContainer.state === State.VALUE) {
      throw new Error("Expecting a struct value");
    }
    switch (currentContainer.containerType) {
      case IonTypes_1.IonTypes.LIST:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACKET);
        break;
      case IonTypes_1.IonTypes.SEXP:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_PARENTHESIS);
        break;
      case IonTypes_1.IonTypes.STRUCT:
        this.writeable.writeByte(IonText_1.CharCodes.RIGHT_BRACE);
        break;
      default:
        throw new Error("Unexpected container TypeCode");
    }
  }
  close() {
    if (this.depth() > 0) {
      throw new Error("Writer has one or more open containers; call stepOut() for each container prior to close()");
    }
  }
  depth() {
    return this.containerContext.length - 1;
  }
  _serializeValue(type, value, serialize) {
    if (this.currentContainer.state === State.STRUCT_FIELD) {
      throw new Error("Expecting a struct field");
    }
    if (value === null) {
      this.writeNull(type);
      return;
    }
    this.handleSeparator();
    this.writeAnnotations();
    serialize(value);
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT) {
      this.currentContainer.state = State.STRUCT_FIELD;
    }
  }
  writeContainer(type, openingCharacter) {
    if (this.currentContainer.containerType === IonTypes_1.IonTypes.STRUCT && this.currentContainer.state === State.VALUE) {
      this.currentContainer.state = State.STRUCT_FIELD;
    }
    this.handleSeparator();
    this.writeAnnotations();
    this.writeable.writeByte(openingCharacter);
    this._stepIn(type);
  }
  handleSeparator() {
    if (this.depth() === 0) {
      if (this.currentContainer.clean) {
        this.currentContainer.clean = false;
      } else {
        this.writeable.writeByte(IonText_1.CharCodes.LINE_FEED);
      }
    } else {
      if (this.currentContainer.clean) {
        this.currentContainer.clean = false;
      } else {
        switch (this.currentContainer.containerType) {
          case IonTypes_1.IonTypes.LIST:
            this.writeable.writeByte(IonText_1.CharCodes.COMMA);
            break;
          case IonTypes_1.IonTypes.SEXP:
            this.writeable.writeByte(IonText_1.CharCodes.SPACE);
            break;
          default:
        }
      }
    }
  }
  writeUtf8(s) {
    this.writeable.writeBytes(IonUnicode_1.encodeUtf8(s));
  }
  writeAnnotations() {
    for (const annotation of this._annotations) {
      this.writeSymbolToken(annotation);
      this.writeUtf8("::");
    }
    this._clearAnnotations();
  }
  _stepIn(container) {
    this.containerContext.push(new Context(container));
  }
  writeSymbolToken(s) {
    if (s.length === 0 || IonText_1.is_keyword(s) || this.isSid(s) || !IonText_1.isIdentifier(s) && !IonText_1.isOperator(s) || IonText_1.isOperator(s) && this.currentContainer.containerType != IonTypes_1.IonTypes.SEXP) {
      this.writeable.writeBytes(IonUnicode_1.encodeUtf8("'" + IonText_1.escape(s, IonText_1.SymbolEscapes) + "'"));
    } else {
      this.writeUtf8(s);
    }
  }
  _writeFloat(value) {
    this._serializeValue(IonTypes_1.IonTypes.FLOAT, value, this._floatSerializer);
  }
  isSid(s) {
    if (s.length > 1 && s.charAt(0) === "$".charAt(0)) {
      const t = s.substr(1, s.length);
      return +t === +t;
    }
    return false;
  }
}
exports.TextWriter = TextWriter;

},{"./AbstractWriter":1,"./IonText":24,"./IonTypes":29,"./IonUnicode":30,"./util":55}],27:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Timestamp = exports.TimestampPrecision = void 0;
const IonDecimal_1 = require("./IonDecimal");
const IonText_1 = require("./IonText");
const util_1 = require("./util");
var TimestampPrecision;
(function (TimestampPrecision) {
  TimestampPrecision[TimestampPrecision["YEAR"] = 1] = "YEAR";
  TimestampPrecision[TimestampPrecision["MONTH"] = 2] = "MONTH";
  TimestampPrecision[TimestampPrecision["DAY"] = 3] = "DAY";
  TimestampPrecision[TimestampPrecision["HOUR_AND_MINUTE"] = 4] = "HOUR_AND_MINUTE";
  TimestampPrecision[TimestampPrecision["SECONDS"] = 5] = "SECONDS";
})(TimestampPrecision = exports.TimestampPrecision || (exports.TimestampPrecision = {}));
class Timestamp {
  constructor() {
    let dateOrLocalOffset = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    let year = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let month = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    let day = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    let hour = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    let minutes = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    let seconds = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
    if (dateOrLocalOffset instanceof Date) {
      const date = dateOrLocalOffset;
      const seconds = date.getMilliseconds() === 0 ? new IonDecimal_1.Decimal(date.getSeconds(), 0) : new IonDecimal_1.Decimal(date.getSeconds() * 1000 + date.getMilliseconds(), -3);
      this._localOffset = date.getTimezoneOffset() * -1;
      this._year = date.getFullYear();
      this._month = date.getMonth() + 1;
      this._day = date.getDate();
      this._hour = date.getHours();
      this._minutes = date.getMinutes();
      this._secondsDecimal = seconds;
      this._precision = TimestampPrecision.YEAR;
    } else {
      const localOffset = dateOrLocalOffset;
      if (localOffset === null) {
        throw new Error("Timestamp's constructor was called without localOffset");
      } else if (year === null) {
        throw new Error("Timestamp's constructor was called without year");
      } else {
        this._localOffset = localOffset;
        this._year = year;
      }
      this._precision = TimestampPrecision.YEAR;
      this._checkRequiredField("Offset", this._localOffset, Timestamp._MIN_OFFSET, Timestamp._MAX_OFFSET);
      this._checkRequiredField("Year", this._year, Timestamp._MIN_YEAR, Timestamp._MAX_YEAR);
      this._month = this._checkOptionalField("Month", month, Timestamp._MIN_MONTH, Timestamp._MAX_MONTH, 1, TimestampPrecision.MONTH);
      this._day = this._checkOptionalField("Day", day, Timestamp._MIN_DAY, Timestamp._MAX_DAY, 1, TimestampPrecision.DAY);
      this._hour = this._checkOptionalField("Hour", hour, Timestamp._MIN_HOUR, Timestamp._MAX_HOUR, 0, TimestampPrecision.HOUR_AND_MINUTE);
      this._minutes = this._checkOptionalField("Minutes", minutes, Timestamp._MIN_MINUTE, Timestamp._MAX_MINUTE, 0, TimestampPrecision.HOUR_AND_MINUTE);
      if (typeof seconds === "number") {
        if (!Number.isInteger(seconds)) {
          throw new Error("The provided seconds number was not an integer (" + seconds + ")");
        }
        this._secondsDecimal = new IonDecimal_1.Decimal(seconds, 0);
      } else {
        if (seconds !== null) {
          this._secondsDecimal = seconds;
        }
      }
    }
    if (this._secondsDecimal === null || this._secondsDecimal === undefined) {
      this._secondsDecimal = IonDecimal_1.Decimal.ZERO;
    } else {
      this._checkFieldRange("Seconds", this._secondsDecimal, Timestamp._MIN_SECONDS, Timestamp._MAX_SECONDS);
      this._precision = TimestampPrecision.SECONDS;
    }
    if (this._precision <= TimestampPrecision.DAY) {
      this._localOffset = -0;
    }
    if (this._precision > TimestampPrecision.MONTH) {
      const tempDate = new Date(this._year, this._month, 0);
      tempDate.setUTCFullYear(this._year);
      if (this._day > tempDate.getDate()) {
        throw new Error(`Month ${this._month} has less than ${this._day} days`);
      }
      if (this._month === 2 && this._day === 29) {
        if (!this._isLeapYear(this._year)) {
          throw new Error(`Given February 29th but year ${this._year} is not a leap year`);
        }
      }
    }
    const utcYear = this.getDate().getUTCFullYear();
    this._checkFieldRange("Year", utcYear, Timestamp._MIN_YEAR, Timestamp._MAX_YEAR);
  }
  static parse(str) {
    return _TimestampParser._parse(str);
  }
  static _adjustMsSinceEpochIfNeeded(year, msSinceEpoch) {
    if (year >= 100) {
      return msSinceEpoch;
    }
    const date = new Date(msSinceEpoch);
    date.setUTCFullYear(year);
    return date.getTime();
  }
  static _splitSecondsDecimal(secondsDecimal) {
    const coefStr = secondsDecimal.getCoefficient().toString();
    const exp = secondsDecimal.getExponent();
    let secondsStr = "";
    let fractionStr = "";
    if (exp < 0) {
      const idx = Math.max(coefStr.length + exp, 0);
      secondsStr = coefStr.substring(0, idx);
      fractionStr = coefStr.substring(idx);
      if (-secondsDecimal.getExponent() - coefStr.length > 0) {
        fractionStr = "0".repeat(-exp - coefStr.length) + fractionStr;
      }
    } else if (exp > 0) {
      secondsStr = coefStr + "0".repeat(exp);
    } else {
      secondsStr = coefStr;
    }
    return [secondsStr, fractionStr];
  }
  static _valueOf(date, localOffset, fractionalSeconds, precision) {
    const msSinceEpoch = date.getTime() + localOffset * 60 * 1000;
    date = new Date(msSinceEpoch);
    let secondsDecimal;
    if (fractionalSeconds != null) {
      const [_, fractionStr] = Timestamp._splitSecondsDecimal(fractionalSeconds);
      secondsDecimal = IonDecimal_1.Decimal.parse(date.getUTCSeconds() + "." + fractionStr);
    } else {
      secondsDecimal = IonDecimal_1.Decimal.parse(date.getUTCSeconds() + "." + date.getUTCMilliseconds());
    }
    switch (precision) {
      case TimestampPrecision.YEAR:
        return new Timestamp(localOffset, date.getUTCFullYear());
      case TimestampPrecision.MONTH:
        return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1);
      case TimestampPrecision.DAY:
        return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      case TimestampPrecision.HOUR_AND_MINUTE:
        return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes());
      case TimestampPrecision.SECONDS:
      default:
        return new Timestamp(localOffset, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), secondsDecimal);
    }
  }
  getLocalOffset() {
    return this._localOffset;
  }
  getPrecision() {
    return this._precision;
  }
  getDate() {
    let ms = 0;
    if (this._precision === TimestampPrecision.SECONDS) {
      ms = Math.round((this._secondsDecimal.numberValue() - this.getSecondsInt()) * 1000);
    }
    let msSinceEpoch = Date.UTC(this._year, this._precision === TimestampPrecision.YEAR ? 0 : this._month - 1, this._day, this._hour, this._minutes, this.getSecondsInt(), ms);
    msSinceEpoch = Timestamp._adjustMsSinceEpochIfNeeded(this._year, msSinceEpoch);
    const offsetShiftMs = this._localOffset * 60 * 1000;
    return new Date(msSinceEpoch - offsetShiftMs);
  }
  getSecondsInt() {
    return this._secondsDecimal.intValue();
  }
  getSecondsDecimal() {
    return this._secondsDecimal;
  }
  _getFractionalSeconds() {
    const [_, fractionStr] = Timestamp._splitSecondsDecimal(this._secondsDecimal);
    if (fractionStr === "") {
      return IonDecimal_1.Decimal.ZERO;
    }
    return IonDecimal_1.Decimal.parse(fractionStr + "d-" + fractionStr.length);
  }
  equals(that) {
    return this.getPrecision() === that.getPrecision() && this.getLocalOffset() === that.getLocalOffset() && util_1._sign(this.getLocalOffset()) === util_1._sign(that.getLocalOffset()) && this.compareTo(that) === 0 && this._secondsDecimal.equals(that._secondsDecimal);
  }
  compareTo(that) {
    const thisMs = this.getDate().getTime();
    const thatMs = that.getDate().getTime();
    if (thisMs === thatMs) {
      return this.getSecondsDecimal().compareTo(that.getSecondsDecimal());
    }
    return thisMs < thatMs ? -1 : 1;
  }
  toString() {
    let strVal = "";
    switch (this._precision) {
      default:
        throw new Error("unrecognized timestamp precision " + this._precision);
      case TimestampPrecision.SECONDS:
        const [secondsStr, fractionStr] = Timestamp._splitSecondsDecimal(this._secondsDecimal);
        strVal = this._lpadZeros(secondsStr, 2);
        if (fractionStr.length > 0) {
          strVal += "." + fractionStr;
        }
      case TimestampPrecision.HOUR_AND_MINUTE:
        strVal = this._lpadZeros(this._minutes, 2) + (strVal ? ":" + strVal : "");
        strVal = this._lpadZeros(this._hour, 2) + (strVal ? ":" + strVal : "");
      case TimestampPrecision.DAY:
        strVal = this._lpadZeros(this._day, 2) + (strVal ? "T" + strVal : "T");
      case TimestampPrecision.MONTH:
        strVal = this._lpadZeros(this._month, 2) + (strVal ? "-" + strVal : "");
      case TimestampPrecision.YEAR:
        if (this._precision === TimestampPrecision.YEAR) {
          strVal = this._lpadZeros(this._year, 4) + "T";
        } else if (this._precision === TimestampPrecision.MONTH) {
          strVal = this._lpadZeros(this._year, 4) + "-" + strVal + "T";
        } else {
          strVal = this._lpadZeros(this._year, 4) + "-" + strVal;
        }
    }
    const o = this._localOffset;
    if (this._precision > TimestampPrecision.DAY) {
      if (o === 0 && util_1._sign(o) === 1) {
        strVal = strVal + "Z";
      } else {
        strVal += (util_1._sign(o) === -1 ? "-" : "+") + this._lpadZeros(Math.floor(Math.abs(o) / 60), 2) + ":" + this._lpadZeros(Math.abs(o) % 60, 2);
      }
    }
    return strVal;
  }
  toJSON() {
    return this.getDate().toISOString();
  }
  _checkRequiredField(fieldName, value, min, max) {
    if (!util_1._hasValue(value)) {
      throw new Error(`${fieldName} cannot be ${value}`);
    }
    this._checkFieldRange(fieldName, value, min, max);
  }
  _checkOptionalField(fieldName, value, min, max, defaultValue, precision) {
    if (!util_1._hasValue(value)) {
      return defaultValue;
    }
    this._checkFieldRange(fieldName, value, min, max);
    this._precision = precision;
    return value;
  }
  _checkFieldRange(fieldName, value, min, max) {
    if (value instanceof IonDecimal_1.Decimal) {
      if (util_1._hasValue(value) && (value.compareTo(min) < 0 || value.compareTo(max) >= 0)) {
        throw new Error(`${fieldName} ${value} must be between ${min} inclusive, and ${max} exclusive`);
      }
    } else {
      if (!Number.isInteger(value)) {
        throw new Error(`${fieldName} ${value} must be an integer`);
      }
      if (value < min || value > max) {
        throw new Error(`${fieldName} ${value} must be between ${min} and ${max} inclusive`);
      }
    }
  }
  _isLeapYear(year) {
    if (year % 4 !== 0) {
      return false;
    }
    if (year % 400 === 0) {
      return true;
    }
    if (year % 100 === 0) {
      return year < 1600;
    }
    return true;
  }
  _lpadZeros(v, size) {
    const s = v.toString();
    if (s.length <= size) {
      return "0".repeat(size - s.length) + s;
    }
    throw new Error("Unable to fit '" + s + "' into " + size + " characters");
  }
}
exports.Timestamp = Timestamp;
Timestamp._MIN_SECONDS = IonDecimal_1.Decimal.ZERO;
Timestamp._MAX_SECONDS = IonDecimal_1.Decimal.parse("60");
Timestamp._MIN_MINUTE = 0;
Timestamp._MAX_MINUTE = 59;
Timestamp._MIN_HOUR = 0;
Timestamp._MAX_HOUR = 23;
Timestamp._MIN_DAY = 1;
Timestamp._MAX_DAY = 31;
Timestamp._MIN_MONTH = 1;
Timestamp._MAX_MONTH = 12;
Timestamp._MIN_YEAR = 1;
Timestamp._MAX_YEAR = 9999;
Timestamp._MIN_OFFSET = -23 * 60 - 59;
Timestamp._MAX_OFFSET = 23 * 60 + 59;
var _States;
(function (_States) {
  _States[_States["YEAR"] = 0] = "YEAR";
  _States[_States["MONTH"] = 1] = "MONTH";
  _States[_States["DAY"] = 2] = "DAY";
  _States[_States["HOUR"] = 3] = "HOUR";
  _States[_States["MINUTE"] = 4] = "MINUTE";
  _States[_States["SECONDS"] = 5] = "SECONDS";
  _States[_States["FRACTIONAL_SECONDS"] = 6] = "FRACTIONAL_SECONDS";
  _States[_States["OFFSET_POSITIVE"] = 7] = "OFFSET_POSITIVE";
  _States[_States["OFFSET_NEGATIVE"] = 8] = "OFFSET_NEGATIVE";
  _States[_States["OFFSET_MINUTES"] = 9] = "OFFSET_MINUTES";
  _States[_States["OFFSET_ZULU"] = 10] = "OFFSET_ZULU";
  _States[_States["OFFSET_UNKNOWN"] = 11] = "OFFSET_UNKNOWN";
})(_States || (_States = {}));
class _TimeParserState {
  constructor(f, len) {
    let t = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    this.f = f;
    this.len = len;
    this.t = t;
  }
}
class _TimestampParser {
  static _parse(str) {
    if (str.length < 1) {
      return null;
    }
    if (str.charCodeAt(0) === 110) {
      if (str === "null" || str === "null.timestamp") {
        return null;
      }
      throw new Error("Illegal timestamp: " + str);
    }
    let offsetSign;
    let offset = null;
    let year = 0;
    let month = null;
    let day = null;
    let hour = null;
    let minute = null;
    let secondsInt = null;
    let fractionStr = "";
    let pos = 0;
    let state = _TimestampParser._timeParserStates[_States.YEAR];
    const limit = str.length;
    let v;
    while (pos < limit) {
      if (state.len === null) {
        const digits = _TimestampParser._readUnknownDigits(str, pos);
        if (digits.length === 0) {
          throw new Error("No digits found at pos: " + pos);
        }
        v = parseInt(digits, 10);
        pos += digits.length;
      } else if (state.len > 0) {
        v = _TimestampParser._readDigits(str, pos, state.len);
        if (v < 0) {
          throw new Error("Non-digit value found at pos " + pos);
        }
        pos = pos + state.len;
      }
      v = v;
      switch (state.f) {
        case _States.YEAR:
          year = v;
          break;
        case _States.MONTH:
          month = v;
          break;
        case _States.DAY:
          day = v;
          break;
        case _States.HOUR:
          hour = v;
          break;
        case _States.MINUTE:
          minute = v;
          break;
        case _States.SECONDS:
          secondsInt = v;
          break;
        case _States.FRACTIONAL_SECONDS:
          fractionStr = str.substring(20, pos);
          break;
        case _States.OFFSET_POSITIVE:
          offsetSign = 1;
          offset = v * 60;
          break;
        case _States.OFFSET_NEGATIVE:
          offsetSign = -1;
          offset = v * 60;
          break;
        case _States.OFFSET_MINUTES:
          offset += v;
          if (v >= 60) {
            throw new Error("Minute offset " + String(v) + " above maximum or equal to : 60");
          }
          break;
        case _States.OFFSET_ZULU:
          offsetSign = 1;
          offset = 0;
          break;
        case _States.OFFSET_UNKNOWN:
          offset = -0;
          break;
        default:
          throw new Error("invalid internal state");
      }
      if (pos >= limit) {
        break;
      }
      if (state.t !== null) {
        const c = String.fromCharCode(str.charCodeAt(pos));
        state = _TimestampParser._timeParserStates[state.t[c]];
        if (state === undefined) {
          throw new Error("State was not set pos:" + pos);
        }
        if (state.f === _States.OFFSET_ZULU) {
          offsetSign = 1;
          offset = 0;
        }
      }
      pos++;
    }
    if (offset === null) {
      if (minute !== null) {
        throw new Error('invalid timestamp, missing local offset: "' + str + '"');
      }
      offset = -0;
    } else {
      offset = offsetSign * offset;
    }
    let seconds;
    if (secondsInt !== undefined && secondsInt !== null || fractionStr) {
      seconds = IonDecimal_1.Decimal.parse(secondsInt + "." + (fractionStr ? fractionStr : ""));
    }
    return new Timestamp(offset, year, month, day, hour, minute, seconds);
  }
  static _readUnknownDigits(str, pos) {
    let i = pos;
    for (; i < str.length; i++) {
      if (!IonText_1.isDigit(str.charCodeAt(i))) {
        break;
      }
    }
    return str.substring(pos, i);
  }
  static _readDigits(str, pos, len) {
    let v = 0;
    for (let i = pos; i < pos + len; i++) {
      const c = str.charCodeAt(i) - 48;
      if (c < 0 && c > 9) {
        return -1;
      }
      v = v * 10 + c;
    }
    return v;
  }
}
_TimestampParser._timeParserStates = {
  [_States.YEAR]: new _TimeParserState(_States.YEAR, 4, {
    T: _States.OFFSET_UNKNOWN,
    "-": _States.MONTH
  }),
  [_States.MONTH]: new _TimeParserState(_States.MONTH, 2, {
    T: _States.OFFSET_UNKNOWN,
    "-": _States.DAY
  }),
  [_States.DAY]: new _TimeParserState(_States.DAY, 2, {
    T: _States.HOUR
  }),
  [_States.HOUR]: new _TimeParserState(_States.HOUR, 2, {
    ":": _States.MINUTE
  }),
  [_States.MINUTE]: new _TimeParserState(_States.MINUTE, 2, {
    ":": _States.SECONDS,
    "+": _States.OFFSET_POSITIVE,
    "-": _States.OFFSET_NEGATIVE,
    Z: _States.OFFSET_ZULU
  }),
  [_States.SECONDS]: new _TimeParserState(_States.SECONDS, 2, {
    ".": _States.FRACTIONAL_SECONDS,
    "+": _States.OFFSET_POSITIVE,
    "-": _States.OFFSET_NEGATIVE,
    Z: _States.OFFSET_ZULU
  }),
  [_States.FRACTIONAL_SECONDS]: new _TimeParserState(_States.FRACTIONAL_SECONDS, null, {
    "+": _States.OFFSET_POSITIVE,
    "-": _States.OFFSET_NEGATIVE,
    Z: _States.OFFSET_ZULU
  }),
  [_States.OFFSET_POSITIVE]: new _TimeParserState(_States.OFFSET_POSITIVE, 2, {
    ":": _States.OFFSET_MINUTES
  }),
  [_States.OFFSET_NEGATIVE]: new _TimeParserState(_States.OFFSET_NEGATIVE, 2, {
    ":": _States.OFFSET_MINUTES
  }),
  [_States.OFFSET_MINUTES]: new _TimeParserState(_States.OFFSET_MINUTES, 2),
  [_States.OFFSET_ZULU]: new _TimeParserState(_States.OFFSET_ZULU, 0),
  [_States.OFFSET_UNKNOWN]: new _TimeParserState(_States.OFFSET_UNKNOWN, 0)
};

},{"./IonDecimal":11,"./IonText":24,"./util":55}],28:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IonType = void 0;
class IonType {
  constructor(binaryTypeId, name, isScalar, isLob, isNumeric, isContainer) {
    this.binaryTypeId = binaryTypeId;
    this.name = name;
    this.isScalar = isScalar;
    this.isLob = isLob;
    this.isNumeric = isNumeric;
    this.isContainer = isContainer;
  }
}
exports.IonType = IonType;

},{}],29:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IonTypes = void 0;
const IonType_1 = require("./IonType");
exports.IonTypes = {
  NULL: new IonType_1.IonType(0, "null", true, false, false, false),
  BOOL: new IonType_1.IonType(1, "bool", true, false, false, false),
  INT: new IonType_1.IonType(2, "int", true, false, true, false),
  FLOAT: new IonType_1.IonType(4, "float", true, false, true, false),
  DECIMAL: new IonType_1.IonType(5, "decimal", true, false, false, false),
  TIMESTAMP: new IonType_1.IonType(6, "timestamp", true, false, false, false),
  SYMBOL: new IonType_1.IonType(7, "symbol", true, false, false, false),
  STRING: new IonType_1.IonType(8, "string", true, false, false, false),
  CLOB: new IonType_1.IonType(9, "clob", true, true, false, false),
  BLOB: new IonType_1.IonType(10, "blob", true, true, false, false),
  LIST: new IonType_1.IonType(11, "list", false, false, false, true),
  SEXP: new IonType_1.IonType(12, "sexp", false, false, false, true),
  STRUCT: new IonType_1.IonType(13, "struct", false, false, false, true)
};

},{"./IonType":28}],30:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeUtf8 = exports.encodeUtf8 = void 0;
const JS_DECODER_MAX_BYTES = 512;
let textDecoder;
if (typeof TextDecoder !== "undefined") {
  textDecoder = new TextDecoder("utf8", {
    fatal: true
  });
} else {
  textDecoder = null;
}
function encodeUtf8(s) {
  let i = 0,
    c;
  const bytes = new Uint8Array(s.length * 4);
  for (let ci = 0; ci < s.length; ci++) {
    c = s.charCodeAt(ci);
    if (c < 128) {
      bytes[i++] = c;
      continue;
    }
    if (c < 2048) {
      bytes[i++] = c >> 6 | 192;
    } else {
      if (c > 0xd7ff && c < 0xdc00) {
        if (++ci >= s.length) {
          throw new Error("UTF-8 encode: incomplete surrogate pair");
        }
        const c2 = s.charCodeAt(ci);
        if (c2 < 0xdc00 || c2 > 0xdfff) {
          throw new Error("UTF-8 encode: second surrogate character 0x" + c2.toString(16) + " at index " + ci + " out of range");
        }
        c = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
        bytes[i++] = c >> 18 | 240;
        bytes[i++] = c >> 12 & 63 | 128;
      } else {
        bytes[i++] = c >> 12 | 224;
      }
      bytes[i++] = c >> 6 & 63 | 128;
    }
    bytes[i++] = c & 63 | 128;
  }
  return bytes.subarray(0, i);
}
exports.encodeUtf8 = encodeUtf8;
function decodeUtf8(bytes) {
  if (bytes.length > JS_DECODER_MAX_BYTES && textDecoder != null) {
    return textDecoder.decode(bytes);
  }
  let i = 0,
    s = "",
    c;
  while (i < bytes.length) {
    c = bytes[i++];
    if (c > 127) {
      if (c > 191 && c < 224) {
        if (i >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 2-byte sequence");
        }
        c = (c & 31) << 6 | bytes[i++] & 63;
      } else if (c > 223 && c < 240) {
        if (i + 1 >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 3-byte sequence");
        }
        c = (c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      } else if (c > 239 && c < 248) {
        if (i + 2 >= bytes.length) {
          throw new Error("UTF-8 decode: incomplete 4-byte sequence");
        }
        c = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
      } else {
        throw new Error("UTF-8 decode: unknown multibyte start 0x" + c.toString(16) + " at index " + (i - 1));
      }
    }
    if (c <= 0xffff) {
      s += String.fromCharCode(c);
    } else if (c <= 0x10ffff) {
      c -= 0x10000;
      s += String.fromCharCode(c >> 10 | 0xd800);
      s += String.fromCharCode(c & 0x3ff | 0xdc00);
    } else {
      throw new Error("UTF-8 decode: code point 0x" + c.toString(16) + " exceeds UTF-16 reach");
    }
  }
  return s;
}
exports.decodeUtf8 = decodeUtf8;

},{}],31:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Writeable = void 0;
class Writeable {
  constructor(bufferSize) {
    this.bufferSize = bufferSize ? bufferSize : 4096;
    this.buffers = [new Uint8Array(this.bufferSize)];
    this.index = 0;
    this.clean = false;
  }
  get currentBuffer() {
    return this.buffers[this.buffers.length - 1];
  }
  get totalSize() {
    let size = 0;
    for (let i = 0; i < this.buffers.length - 1; i++) {
      size += this.buffers[i].length;
    }
    return size + this.index;
  }
  writeByte(byte) {
    this.clean = false;
    this.currentBuffer[this.index] = byte;
    this.index++;
    if (this.index === this.bufferSize) {
      this.buffers.push(new Uint8Array(this.bufferSize));
      this.index = 0;
    }
  }
  writeBytes(buf, offset, length) {
    if (offset === undefined) {
      offset = 0;
    }
    const writeLength = length !== undefined ? Math.min(buf.length - offset, length) : buf.length - offset;
    if (writeLength < this.currentBuffer.length - this.index - 1) {
      this.currentBuffer.set(buf.subarray(offset, offset + writeLength), this.index);
      this.index += writeLength;
    } else {
      this.buffers[this.buffers.length - 1] = this.currentBuffer.slice(0, this.index);
      this.buffers.push(buf.subarray(offset, length));
      this.buffers.push(new Uint8Array(this.bufferSize));
      this.clean = false;
      this.index = 0;
    }
  }
  getBytes() {
    if (this.clean) {
      return this.buffers[0];
    }
    const buffer = new Uint8Array(this.totalSize);
    let tempLength = 0;
    for (let i = 0; i < this.buffers.length - 1; i++) {
      buffer.set(this.buffers[i], tempLength);
      tempLength += this.buffers[i].length;
    }
    buffer.set(this.currentBuffer.subarray(0, this.index), tempLength);
    this.buffers = [buffer, new Uint8Array(this.bufferSize)];
    this.index = 0;
    this.clean = true;
    return buffer;
  }
}
exports.Writeable = Writeable;

},{}],32:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
class SignAndMagnitudeInt {
  constructor(_magnitude) {
    let _isNegative = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _magnitude < 0n;
    this._magnitude = _magnitude;
    this._isNegative = _isNegative;
  }
  get magnitude() {
    return this._magnitude;
  }
  get isNegative() {
    return this._isNegative;
  }
  static fromNumber(value) {
    const isNegative = value < 0 || Object.is(value, -0);
    const absoluteValue = Math.abs(value);
    const magnitude = BigInt(absoluteValue);
    return new SignAndMagnitudeInt(magnitude, isNegative);
  }
  equals(other) {
    return this._magnitude === other._magnitude && this._isNegative === other._isNegative;
  }
}
exports.default = SignAndMagnitudeInt;

},{}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Blob = void 0;
const Ion_1 = require("../Ion");
const Lob_1 = require("./Lob");
class Blob extends Lob_1.Lob(Ion_1.IonTypes.BLOB) {
  constructor(data) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(data, annotations);
  }
  toJSON() {
    return Ion_1.toBase64(this);
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeBlob(this);
  }
}
exports.Blob = Blob;

},{"../Ion":5,"./Lob":42}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Boolean = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const JsValueConversion_1 = require("./JsValueConversion");
const Value_1 = require("./Value");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withPrimitives(FromJsConstructor_1.Primitives.Boolean).withClassesToUnbox(JsValueConversion_1._NativeJsBoolean).build();
class Boolean extends Value_1.Value(JsValueConversion_1._NativeJsBoolean, Ion_1.IonTypes.BOOL, _fromJsConstructor) {
  constructor(value) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(value);
    this._setAnnotations(annotations);
  }
  booleanValue() {
    return this.valueOf();
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeBoolean(this.booleanValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Boolean) {
      isSupportedType = true;
      valueToCompare = other.booleanValue();
    } else if (!options.onlyCompareIon) {
      if (typeof other === "boolean" || other instanceof JsValueConversion_1._NativeJsBoolean) {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }
    if (!isSupportedType) {
      return false;
    }
    if (this.booleanValue() !== valueToCompare) {
      return false;
    }
    return true;
  }
}
exports.Boolean = Boolean;

},{"../Ion":5,"./FromJsConstructor":38,"./JsValueConversion":40,"./Value":50}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Clob = void 0;
const Ion_1 = require("../Ion");
const Lob_1 = require("./Lob");
class Clob extends Lob_1.Lob(Ion_1.IonTypes.CLOB) {
  constructor(bytes) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(bytes, annotations);
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeClob(this);
  }
  toJSON() {
    let encodedText = "";
    for (const byte of this) {
      if (byte >= 32 && byte <= 126) {
        encodedText += String.fromCharCode(byte);
        continue;
      }
      const hex = byte.toString(16);
      if (hex.length == 1) {
        encodedText += "\\u000" + hex;
      } else {
        encodedText += "\\u00" + hex;
      }
    }
    return encodedText;
  }
}
exports.Clob = Clob;

},{"../Ion":5,"./Lob":42}],36:[function(require,module,exports){
"use strict";

var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Decimal = void 0;
const ion = __importStar(require("../Ion"));
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const Float_1 = require("./Float");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withClasses(ion.Decimal).build();
class Decimal extends Value_1.Value(Number, Ion_1.IonTypes.DECIMAL, _fromJsConstructor) {
  constructor(value) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    if (typeof value === "string") {
      let numberValue = Number(value);
      super(numberValue);
      this._decimalValue = new ion.Decimal(value);
      this._numberValue = numberValue;
    } else if (value instanceof ion.Decimal) {
      super(value.numberValue());
      this._decimalValue = value;
      this._numberValue = value.numberValue();
    } else if (typeof value === "number") {
      super(value);
      this._decimalValue = new ion.Decimal("" + value);
      this._numberValue = value;
    } else {
      throw new Error("Decimal value can only be created from number, ion.Decimal or string");
    }
    this._setAnnotations(annotations);
  }
  numberValue() {
    return this._numberValue;
  }
  decimalValue() {
    return this._decimalValue;
  }
  toString() {
    return this._decimalValue.toString();
  }
  valueOf() {
    return this._numberValue;
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeDecimal(this.decimalValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true,
      coerceNumericType: false
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Decimal) {
      isSupportedType = true;
      valueToCompare = other.decimalValue();
    } else if (options.coerceNumericType === true && other instanceof Float_1.Float) {
      isSupportedType = true;
      valueToCompare = new ion.Decimal(other.toString());
    } else if (!options.onlyCompareIon) {
      if (other instanceof ion.Decimal) {
        isSupportedType = true;
        valueToCompare = other;
      } else if (other instanceof Number || typeof other === "number") {
        isSupportedType = true;
        valueToCompare = new ion.Decimal(other.toString());
      }
    }
    if (!isSupportedType) {
      return false;
    }
    return this.decimalValue().equals(valueToCompare);
  }
}
exports.Decimal = Decimal;

},{"../Ion":5,"./Float":37,"./FromJsConstructor":38,"./Value":50}],37:[function(require,module,exports){
"use strict";

var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Float = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const Decimal_1 = require("./Decimal");
const ion = __importStar(require("../Ion"));
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withPrimitives(FromJsConstructor_1.Primitives.Number).withClassesToUnbox(Number).build();
class Float extends Value_1.Value(Number, Ion_1.IonTypes.FLOAT, _fromJsConstructor) {
  constructor(value) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(value);
    this._setAnnotations(annotations);
  }
  numberValue() {
    return +this.valueOf();
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeFloat64(this.numberValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true,
      coerceNumericType: false
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Float) {
      isSupportedType = true;
      valueToCompare = other.numberValue();
    } else if (options.coerceNumericType === true && other instanceof Decimal_1.Decimal) {
      let thisValue = new ion.Decimal(other.toString());
      return thisValue.equals(other.decimalValue());
    } else if (!options.onlyCompareIon) {
      if (other instanceof Number || typeof other === "number") {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }
    if (!isSupportedType) {
      return false;
    }
    let result = Object.is(this.numberValue(), valueToCompare);
    if (options.epsilon != null) {
      if (result || Math.abs(this.numberValue() - valueToCompare) <= options.epsilon) {
        return true;
      }
    }
    return result;
  }
}
exports.Float = Float;

},{"../Ion":5,"./Decimal":36,"./FromJsConstructor":38,"./Value":50}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Primitives = exports.FromJsConstructor = exports.FromJsConstructorBuilder = void 0;
const Ion_1 = require("../Ion");
const util_1 = require("../util");
function _newSet(values) {
  if (util_1._hasValue(values)) {
    return new Set(values);
  }
  return new Set();
}
class FromJsConstructorBuilder {
  constructor() {
    this._primitives = _newSet();
    this._classesToUnbox = _newSet();
    this._classes = _newSet();
  }
  withPrimitives() {
    for (var _len = arguments.length, primitives = new Array(_len), _key = 0; _key < _len; _key++) {
      primitives[_key] = arguments[_key];
    }
    this._primitives = _newSet(primitives);
    return this;
  }
  withClasses() {
    for (var _len2 = arguments.length, classes = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      classes[_key2] = arguments[_key2];
    }
    this._classes = _newSet(classes);
    return this;
  }
  withClassesToUnbox() {
    for (var _len3 = arguments.length, classes = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      classes[_key3] = arguments[_key3];
    }
    this._classesToUnbox = _newSet(classes);
    return this;
  }
  build() {
    return new FromJsConstructor(this._primitives, this._classesToUnbox, this._classes);
  }
}
exports.FromJsConstructorBuilder = FromJsConstructorBuilder;
class FromJsConstructor {
  constructor(_primitives, _classesToUnbox, _classes) {
    this._primitives = _primitives;
    this._classesToUnbox = _classesToUnbox;
    this._classes = _classes;
  }
  construct(constructor, jsValue) {
    let annotations = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
    if (jsValue === null) {
      return new Ion_1.dom.Null(Ion_1.IonTypes.NULL, annotations);
    }
    const jsValueType = typeof jsValue;
    if (jsValueType === "object") {
      if (this._classesToUnbox.has(jsValue.constructor)) {
        return new constructor(jsValue.valueOf(), annotations);
      }
      if (this._classes.has(jsValue.constructor)) {
        return new constructor(jsValue, annotations);
      }
      throw new Error(`Unable to construct a(n) ${constructor.name} from a ${jsValue.constructor.name}.`);
    }
    if (this._primitives.has(jsValueType)) {
      return new constructor(jsValue, annotations);
    }
    throw new Error(`Unable to construct a(n) ${constructor.name} from a ${jsValueType}.`);
  }
}
exports.FromJsConstructor = FromJsConstructor;
(function (FromJsConstructor) {
  FromJsConstructor.NONE = new FromJsConstructorBuilder().build();
})(FromJsConstructor = exports.FromJsConstructor || (exports.FromJsConstructor = {}));
exports.Primitives = {
  Boolean: "boolean",
  Number: "number",
  String: "string",
  BigInt: "bigint"
};

},{"../Ion":5,"../util":55}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Integer = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const _bigintConstructor = BigInt;
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withPrimitives(FromJsConstructor_1.Primitives.Number, FromJsConstructor_1.Primitives.BigInt).withClassesToUnbox(Number).withClasses(_bigintConstructor).build();
class Integer extends Value_1.Value(Number, Ion_1.IonTypes.INT, _fromJsConstructor) {
  constructor(value) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    if (typeof value === "number") {
      super(value);
      this._numberValue = value;
      this._bigIntValue = null;
    } else {
      const numberValue = Number(value);
      super(numberValue);
      this._bigIntValue = value;
      this._numberValue = numberValue;
    }
    this._setAnnotations(annotations);
  }
  bigIntValue() {
    if (this._bigIntValue === null) {
      this._bigIntValue = BigInt(this.numberValue());
    }
    return this._bigIntValue;
  }
  numberValue() {
    return this._numberValue;
  }
  toString() {
    if (this._bigIntValue === null) {
      return this._numberValue.toString();
    }
    return this._bigIntValue.toString();
  }
  valueOf() {
    return this.numberValue();
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    if (this._bigIntValue === null) {
      writer.writeInt(this.numberValue());
    } else {
      writer.writeInt(this._bigIntValue);
    }
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Integer) {
      isSupportedType = true;
      if (this._bigIntValue == null && other._bigIntValue == null) {
        valueToCompare = other.numberValue();
      } else {
        valueToCompare = other.bigIntValue();
      }
    } else if (!options.onlyCompareIon) {
      if (other instanceof Number || typeof other === "number") {
        isSupportedType = true;
        if (this.bigIntValue == null) {
          valueToCompare = other.valueOf();
        } else {
          valueToCompare = BigInt(other.valueOf());
        }
      } else if (typeof other === "bigint") {
        isSupportedType = true;
        valueToCompare = other;
      }
    }
    if (!isSupportedType) {
      return false;
    }
    if (typeof valueToCompare === "bigint") {
      return this.bigIntValue() === valueToCompare;
    }
    return this.numberValue() == valueToCompare;
  }
}
exports.Integer = Integer;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._ionValueFromJsValue = exports._domConstructorFor = exports._NativeJsString = exports._NativeJsBoolean = void 0;
const Ion_1 = require("../Ion");
const IonTypes_1 = require("../IonTypes");
const util_1 = require("../util");
exports._NativeJsBoolean = Boolean;
exports._NativeJsString = String;
let _domTypesByIonType = null;
function _getDomTypesByIonTypeMap() {
  if (_domTypesByIonType === null) {
    _domTypesByIonType = new Map([[IonTypes_1.IonTypes.NULL, Ion_1.dom.Null], [IonTypes_1.IonTypes.BOOL, Ion_1.dom.Boolean], [IonTypes_1.IonTypes.INT, Ion_1.dom.Integer], [IonTypes_1.IonTypes.FLOAT, Ion_1.dom.Float], [IonTypes_1.IonTypes.DECIMAL, Ion_1.dom.Decimal], [IonTypes_1.IonTypes.TIMESTAMP, Ion_1.dom.Timestamp], [IonTypes_1.IonTypes.STRING, Ion_1.dom.String], [IonTypes_1.IonTypes.BLOB, Ion_1.dom.Blob], [IonTypes_1.IonTypes.LIST, Ion_1.dom.List], [IonTypes_1.IonTypes.STRUCT, Ion_1.dom.Struct]]);
  }
  return _domTypesByIonType;
}
function _domConstructorFor(ionType) {
  const domConstructor = _getDomTypesByIonTypeMap().get(ionType);
  if (!util_1._hasValue(domConstructor)) {
    throw new Error(`No dom type constructor was found for Ion type ${ionType.name}`);
  }
  return domConstructor;
}
exports._domConstructorFor = _domConstructorFor;
function _inferType(value) {
  if (value === undefined) {
    throw new Error("Cannot create an Ion value from `undefined`.");
  }
  if (value === null) {
    return IonTypes_1.IonTypes.NULL;
  }
  const valueType = typeof value;
  switch (valueType) {
    case "string":
      return IonTypes_1.IonTypes.STRING;
    case "number":
      return Number.isInteger(value) ? IonTypes_1.IonTypes.INT : IonTypes_1.IonTypes.FLOAT;
    case "boolean":
      return IonTypes_1.IonTypes.BOOL;
    case "object":
      break;
    case "bigint":
      return IonTypes_1.IonTypes.INT;
    default:
      throw new Error(`Value.from() does not support the JS primitive type ${valueType}.`);
  }
  if (value instanceof BigInt) {
    return IonTypes_1.IonTypes.INT;
  }
  if (value instanceof Number) {
    return Number.isInteger(value.valueOf()) ? IonTypes_1.IonTypes.INT : IonTypes_1.IonTypes.FLOAT;
  }
  if (value instanceof Boolean) {
    return IonTypes_1.IonTypes.BOOL;
  }
  if (value instanceof String) {
    return IonTypes_1.IonTypes.STRING;
  }
  if (value instanceof Ion_1.Decimal) {
    return IonTypes_1.IonTypes.DECIMAL;
  }
  if (value instanceof Date || value instanceof Ion_1.Timestamp) {
    return IonTypes_1.IonTypes.TIMESTAMP;
  }
  if (value instanceof Uint8Array) {
    return IonTypes_1.IonTypes.BLOB;
  }
  if (value instanceof Array) {
    return IonTypes_1.IonTypes.LIST;
  }
  return IonTypes_1.IonTypes.STRUCT;
}
function _ionValueFromJsValue(value) {
  let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  const ionType = _inferType(value);
  const ionTypeConstructor = _domConstructorFor(ionType);
  return ionTypeConstructor._fromJsValue(value, annotations);
}
exports._ionValueFromJsValue = _ionValueFromJsValue;

},{"../Ion":5,"../IonTypes":29,"../util":55}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.List = void 0;
const Ion_1 = require("../Ion");
const Sequence_1 = require("./Sequence");
class List extends Sequence_1.Sequence(Ion_1.IonTypes.LIST) {
  constructor(children) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(children, annotations);
  }
}
exports.List = List;

},{"../Ion":5,"./Sequence":45}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Lob = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withClasses(Uint8Array).build();
function Lob(ionType) {
  return class extends Value_1.Value(Uint8Array, ionType, _fromJsConstructor) {
    constructor(data) {
      let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      super(data);
      this._setAnnotations(annotations);
    }
    uInt8ArrayValue() {
      return this;
    }
    _valueEquals(other) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        epsilon: null,
        ignoreAnnotations: false,
        ignoreTimestampPrecision: false,
        onlyCompareIon: true
      };
      let isSupportedType = false;
      let valueToCompare = null;
      if (options.onlyCompareIon) {
        if (other.getType() === Ion_1.IonTypes.CLOB || other.getType() === Ion_1.IonTypes.BLOB) {
          isSupportedType = true;
          valueToCompare = other.uInt8ArrayValue();
        }
      } else {
        if (other instanceof Uint8Array) {
          isSupportedType = true;
          valueToCompare = other.valueOf();
        }
      }
      if (!isSupportedType) {
        return false;
      }
      let current = this.uInt8ArrayValue();
      let expected = valueToCompare;
      if (current.length !== expected.length) {
        return false;
      }
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== expected[i]) {
          return false;
        }
      }
      return true;
    }
  };
}
exports.Lob = Lob;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Null = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
class Null extends Value_1.Value(Object, Ion_1.IonTypes.NULL, FromJsConstructor_1.FromJsConstructor.NONE) {
  constructor() {
    let ionType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : Ion_1.IonTypes.NULL;
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super();
    this._ionType = ionType;
    this._setAnnotations(annotations);
  }
  static _operationIsSupported(ionType, operation) {
    return Null._supportedIonTypesByOperation.get(operation).has(ionType);
  }
  isNull() {
    return true;
  }
  _convertToJsNull(operation) {
    if (Null._operationIsSupported(this.getType(), operation)) {
      return null;
    }
    throw new Error(`${operation}() is not supported by Ion type ${this.getType().name}`);
  }
  _unsupportedOperationOrNullDereference(operation) {
    if (Null._operationIsSupported(this.getType(), operation)) {
      throw new Error(`${operation}() called on a null ${this.getType().name}.`);
    }
    throw new Error(`${operation}() is not supported by Ion type ${this.getType().name}`);
  }
  booleanValue() {
    return this._convertToJsNull("booleanValue");
  }
  numberValue() {
    return this._convertToJsNull("numberValue");
  }
  bigIntValue() {
    return this._convertToJsNull("bigIntValue");
  }
  decimalValue() {
    return this._convertToJsNull("decimalValue");
  }
  stringValue() {
    return this._convertToJsNull("stringValue");
  }
  dateValue() {
    return this._convertToJsNull("dateValue");
  }
  uInt8ArrayValue() {
    return this._convertToJsNull("uInt8ArrayValue");
  }
  fieldNames() {
    this._unsupportedOperationOrNullDereference("fieldNames");
  }
  fields() {
    this._unsupportedOperationOrNullDereference("fields");
  }
  elements() {
    this._unsupportedOperationOrNullDereference("elements");
  }
  get() {
    return null;
  }
  toString() {
    if (this.getType() == Ion_1.IonTypes.NULL) {
      return "null";
    }
    return "null." + this._ionType.name;
  }
  toJSON() {
    return null;
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeNull(this.getType());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Null) {
      isSupportedType = true;
      valueToCompare = other;
    } else if (!options.onlyCompareIon) {
      if (other === null && this._ionType.name === "null") {
        return true;
      }
    }
    if (!isSupportedType) {
      return false;
    }
    return this._ionType.name === valueToCompare._ionType.name;
  }
}
exports.Null = Null;
Null._supportedIonTypesByOperation = new Map([["booleanValue", new Set([Ion_1.IonTypes.BOOL])], ["numberValue", new Set([Ion_1.IonTypes.INT, Ion_1.IonTypes.FLOAT, Ion_1.IonTypes.DECIMAL])], ["bigIntValue", new Set([Ion_1.IonTypes.INT])], ["decimalValue", new Set([Ion_1.IonTypes.DECIMAL])], ["stringValue", new Set([Ion_1.IonTypes.STRING, Ion_1.IonTypes.SYMBOL])], ["dateValue", new Set([Ion_1.IonTypes.TIMESTAMP])], ["timestampValue", new Set([Ion_1.IonTypes.TIMESTAMP])], ["uInt8ArrayValue", new Set([Ion_1.IonTypes.BLOB, Ion_1.IonTypes.CLOB])], ["fields", new Set([Ion_1.IonTypes.STRUCT])], ["fieldNames", new Set([Ion_1.IonTypes.STRUCT])], ["elements", new Set([Ion_1.IonTypes.LIST, Ion_1.IonTypes.SEXP, Ion_1.IonTypes.STRUCT])]]);

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SExpression = void 0;
const Ion_1 = require("../Ion");
const Sequence_1 = require("./Sequence");
class SExpression extends Sequence_1.Sequence(Ion_1.IonTypes.SEXP) {
  constructor(children) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(children, annotations);
  }
  toString() {
    return "(" + this.join(" ") + ")";
  }
}
exports.SExpression = SExpression;

},{"../Ion":5,"./Sequence":45}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Sequence = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
function Sequence(ionType) {
  return class extends Value_1.Value(Array, ionType, FromJsConstructor_1.FromJsConstructor.NONE) {
    constructor(children) {
      let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
      super();
      for (const child of children) {
        this.push(child);
      }
      this._setAnnotations(annotations);
      return new Proxy(this, {
        set: function (target, index, value) {
          if (!(value instanceof Value_1.Value)) {
            value = Value_1.Value.from(value);
          }
          target[index] = value;
          return true;
        }
      });
    }
    get() {
      for (var _len = arguments.length, pathElements = new Array(_len), _key = 0; _key < _len; _key++) {
        pathElements[_key] = arguments[_key];
      }
      if (pathElements.length === 0) {
        throw new Error("Value#get requires at least one parameter.");
      }
      const [pathHead, ...pathTail] = pathElements;
      if (typeof pathHead !== "number") {
        throw new Error(`Cannot index into a ${this.getType().name} with a ${typeof pathHead}.`);
      }
      const children = this;
      const maybeChild = children[pathHead];
      const child = maybeChild === undefined ? null : maybeChild;
      if (pathTail.length === 0 || child === null) {
        return child;
      }
      return child.get(...pathTail);
    }
    elements() {
      return Object.values(this);
    }
    toString() {
      return "[" + this.join(", ") + "]";
    }
    static _fromJsValue(jsValue, annotations) {
      if (!(jsValue instanceof Array)) {
        throw new Error(`Cannot create a ${this.name} from: ${jsValue.toString()}`);
      }
      const children = jsValue.map(child => Value_1.Value.from(child));
      return new this(children, annotations);
    }
    writeTo(writer) {
      writer.setAnnotations(this.getAnnotations());
      writer.stepIn(ionType);
      for (const child of this) {
        child.writeTo(writer);
      }
      writer.stepOut();
    }
    _valueEquals(other) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        epsilon: null,
        ignoreAnnotations: false,
        ignoreTimestampPrecision: false,
        onlyCompareIon: true
      };
      let isSupportedType = false;
      let valueToCompare = null;
      if (options.onlyCompareIon) {
        if (other.getType() === Ion_1.IonTypes.LIST || other.getType() === Ion_1.IonTypes.SEXP) {
          isSupportedType = true;
          valueToCompare = other.elements();
        }
      } else {
        if (other instanceof Array) {
          isSupportedType = true;
          valueToCompare = other;
        }
      }
      if (!isSupportedType) {
        return false;
      }
      let actualSequence = this.elements();
      let expectedSequence = valueToCompare;
      if (actualSequence.length !== expectedSequence.length) {
        return false;
      }
      for (let i = 0; i < actualSequence.length; i++) {
        if (options.onlyCompareIon) {
          if (!actualSequence[i].ionEquals(expectedSequence[i], options)) {
            return false;
          }
        } else {
          if (!actualSequence[i].equals(expectedSequence[i])) {
            return false;
          }
        }
      }
      return true;
    }
  };
}
exports.Sequence = Sequence;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.String = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const JsValueConversion_1 = require("./JsValueConversion");
const Value_1 = require("./Value");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withPrimitives(FromJsConstructor_1.Primitives.String).withClassesToUnbox(JsValueConversion_1._NativeJsString).build();
class String extends Value_1.Value(JsValueConversion_1._NativeJsString, Ion_1.IonTypes.STRING, _fromJsConstructor) {
  constructor(text) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(text);
    this._setAnnotations(annotations);
  }
  stringValue() {
    return this.toString();
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeString(this.stringValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof String) {
      isSupportedType = true;
      valueToCompare = other.stringValue();
    } else if (!options.onlyCompareIon) {
      if (typeof other === "string" || other instanceof JsValueConversion_1._NativeJsString) {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }
    if (!isSupportedType) {
      return false;
    }
    return this.compareValue(valueToCompare) === 0;
  }
  compareValue(expectedValue) {
    return this.stringValue().localeCompare(expectedValue);
  }
}
exports.String = String;

},{"../Ion":5,"./FromJsConstructor":38,"./JsValueConversion":40,"./Value":50}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Struct = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
class Struct extends Value_1.Value(Object, Ion_1.IonTypes.STRUCT, FromJsConstructor_1.FromJsConstructor.NONE) {
  constructor(fields) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super();
    this._fields = Object.create(null);
    for (const [fieldName, fieldValue] of fields) {
      this._fields[fieldName] = fieldValue instanceof Value_1.Value ? [fieldValue] : fieldValue;
    }
    this._setAnnotations(annotations);
    return new Proxy(this, {
      set: function (target, name, value) {
        if (!(value instanceof Value_1.Value)) {
          value = Value_1.Value.from(value);
        }
        target._fields[name] = [value];
        return true;
      },
      get: function (target, name) {
        if (name in target) {
          return target[name];
        }
        let length = target._fields[name] !== undefined ? target._fields[name].length : -1;
        if (length === -1) {
          return target._fields[name];
        }
        return target._fields[name][length - 1];
      },
      deleteProperty: function (target, name) {
        if (name in target._fields) {
          delete target._fields[name];
        }
        return true;
      }
    });
  }
  get() {
    for (var _len = arguments.length, pathElements = new Array(_len), _key = 0; _key < _len; _key++) {
      pathElements[_key] = arguments[_key];
    }
    if (pathElements.length === 0) {
      throw new Error("Value#get requires at least one parameter.");
    }
    const [pathHead, ...pathTail] = pathElements;
    if (typeof pathHead !== "string") {
      throw new Error(`Cannot index into a struct with a ${typeof pathHead}.`);
    }
    const child = this._fields[pathHead];
    if (child === undefined) {
      return null;
    }
    if (pathTail.length === 0) {
      return child[child.length - 1];
    }
    return child[child.length - 1].get(...pathTail);
  }
  getAll() {
    for (var _len2 = arguments.length, pathElements = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      pathElements[_key2] = arguments[_key2];
    }
    if (pathElements.length === 0) {
      throw new Error("Value#get requires at least one parameter.");
    }
    const [pathHead, ...pathTail] = pathElements;
    if (typeof pathHead !== "string") {
      throw new Error(`Cannot index into a struct with a ${typeof pathHead}.`);
    }
    const child = this._fields[pathHead];
    if (child === undefined) {
      return null;
    }
    if (pathTail.length === 0) {
      return child;
    }
    let values = [];
    child.forEach(value => values.push(...value.getAll(...pathTail)));
    return values;
  }
  fieldNames() {
    return Object.keys(this._fields);
  }
  allFields() {
    return Object.entries(this._fields);
  }
  fields() {
    let singleValueFields = Object.create(null);
    for (const [fieldName, values] of this.allFields()) {
      singleValueFields[fieldName] = values[values.length - 1];
    }
    return Object.entries(singleValueFields);
  }
  elements() {
    return Object.values(this._fields).flat();
  }
  [Symbol.iterator]() {
    return this.fields()[Symbol.iterator]();
  }
  toString() {
    return "{" + [...this.allFields()].map(_ref => {
      let [name, value] = _ref;
      return name + ": " + value;
    }).join(", ") + "}";
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.stepIn(Ion_1.IonTypes.STRUCT);
    for (const [fieldName, values] of this.allFields()) {
      for (let value of values) {
        writer.writeFieldName(fieldName);
        value.writeTo(writer);
      }
    }
    writer.stepOut();
  }
  deleteField(name) {
    if (name in this._fields) {
      delete this._fields[name];
      return true;
    }
    return false;
  }
  toJSON() {
    let normalizedFields = Object.create(Struct.prototype);
    for (const [key, value] of this.fields()) {
      normalizedFields[key] = value;
    }
    return normalizedFields;
  }
  static _fromJsValue(jsValue, annotations) {
    if (!(jsValue instanceof Object)) {
      throw new Error(`Cannot create a dom.Struct from: ${jsValue.toString()}`);
    }
    const fields = Object.entries(jsValue).map(_ref2 => {
      let [key, value] = _ref2;
      return [key, [Value_1.Value.from(value)]];
    });
    return new this(fields, annotations);
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Struct) {
      isSupportedType = true;
      valueToCompare = other.allFields();
    } else if (!options.onlyCompareIon) {
      if (typeof other === "object" || other instanceof Object) {
        isSupportedType = true;
        valueToCompare = Value_1.Value.from(other).allFields();
      }
    }
    if (!isSupportedType) {
      return false;
    }
    if (this.allFields().length !== valueToCompare.length) {
      return false;
    }
    let matchFound = true;
    const paired = new Array(valueToCompare.length);
    for (let i = 0; matchFound && i < this.allFields().length; i++) {
      matchFound = false;
      for (let j = 0; !matchFound && j < valueToCompare.length; j++) {
        if (!paired[j]) {
          const child = this.allFields()[i];
          const expectedChild = valueToCompare[j];
          matchFound = child[0] === expectedChild[0] && this._ionValueEquals(child[1].sort(), expectedChild[1].sort(), options);
          if (matchFound) {
            paired[j] = true;
          }
        }
      }
    }
    for (let i = 0; i < paired.length; i++) {
      if (!paired[i]) {
        matchFound = false;
        break;
      }
    }
    return matchFound;
  }
  _ionValueEquals(child, expectedChild, options) {
    if (child.length !== expectedChild.length) {
      return false;
    }
    for (let i = 0; i < child.length; i++) {
      if (options.onlyCompareIon) {
        if (!child[i].ionEquals(expectedChild[i], options)) {
          return false;
        }
      } else {
        if (!child[i].equals(expectedChild[i])) {
          return false;
        }
      }
    }
    return true;
  }
}
exports.Struct = Struct;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Symbol = void 0;
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withPrimitives(FromJsConstructor_1.Primitives.String).withClassesToUnbox(String).build();
class Symbol extends Value_1.Value(String, Ion_1.IonTypes.SYMBOL, _fromJsConstructor) {
  constructor(symbolText) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    super(symbolText);
    this._setAnnotations(annotations);
  }
  stringValue() {
    return this.toString();
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeSymbol(this.stringValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Symbol) {
      isSupportedType = true;
      valueToCompare = other.stringValue();
    } else if (!options.onlyCompareIon) {
      if (typeof other === "string" || other instanceof String) {
        isSupportedType = true;
        valueToCompare = other.valueOf();
      }
    }
    if (!isSupportedType) {
      return false;
    }
    return this.compareValue(valueToCompare) === 0;
  }
  compareValue(expectedValue) {
    return this.stringValue().localeCompare(expectedValue);
  }
}
exports.Symbol = Symbol;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],49:[function(require,module,exports){
"use strict";

var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Timestamp = void 0;
const ion = __importStar(require("../Ion"));
const Ion_1 = require("../Ion");
const FromJsConstructor_1 = require("./FromJsConstructor");
const Value_1 = require("./Value");
const _fromJsConstructor = new FromJsConstructor_1.FromJsConstructorBuilder().withClasses(Date, ion.Timestamp).build();
class Timestamp extends Value_1.Value(Date, Ion_1.IonTypes.TIMESTAMP, _fromJsConstructor) {
  constructor(dateOrTimestamp) {
    let annotations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    let date;
    let timestamp;
    if (dateOrTimestamp instanceof Date) {
      date = dateOrTimestamp;
      timestamp = Timestamp._timestampFromDate(date);
    } else {
      timestamp = dateOrTimestamp;
      date = timestamp.getDate();
    }
    super(date);
    this._date = date;
    this._timestamp = timestamp;
    this._setAnnotations(annotations);
  }
  static _timestampFromDate(date) {
    const milliseconds = date.getUTCSeconds() * 1000 + date.getUTCMilliseconds();
    const fractionalSeconds = new Ion_1.Decimal(milliseconds, -3);
    return new ion.Timestamp(0, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), fractionalSeconds);
  }
  timestampValue() {
    return this._timestamp;
  }
  dateValue() {
    return this._date;
  }
  writeTo(writer) {
    writer.setAnnotations(this.getAnnotations());
    writer.writeTimestamp(this.timestampValue());
  }
  _valueEquals(other) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
      epsilon: null,
      ignoreAnnotations: false,
      ignoreTimestampPrecision: false,
      onlyCompareIon: true
    };
    let isSupportedType = false;
    let valueToCompare = null;
    if (other instanceof Timestamp) {
      isSupportedType = true;
      valueToCompare = other.timestampValue();
    } else if (!options.onlyCompareIon) {
      if (other instanceof ion.Timestamp) {
        isSupportedType = true;
        valueToCompare = other;
      } else if (other instanceof Date) {
        if (this.dateValue().getTime() === other.getTime()) {
          return true;
        } else {
          return false;
        }
      }
    }
    if (!isSupportedType) {
      return false;
    }
    if (options.ignoreTimestampPrecision) {
      return this.timestampValue().compareTo(valueToCompare) === 0;
    }
    return this.timestampValue().equals(valueToCompare);
  }
}
exports.Timestamp = Timestamp;

},{"../Ion":5,"./FromJsConstructor":38,"./Value":50}],50:[function(require,module,exports){
"use strict";

var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Value = void 0;
const util_1 = require("../util");
const JsValueConversion = __importStar(require("./JsValueConversion"));
const _DOM_VALUE_SIGNET = Symbol("ion.dom.Value");
function Value(BaseClass, ionType, fromJsConstructor) {
  const newClass = class extends BaseClass {
    constructor() {
      super(...arguments);
      this._ionType = ionType;
      this._ionAnnotations = [];
      Object.defineProperty(this, "_ionType", {
        enumerable: false
      });
      Object.defineProperty(this, "_ionAnnotations", {
        enumerable: false
      });
    }
    _unsupportedOperation(functionName) {
      throw new Error(`Value#${functionName}() is not supported by Ion type ${this.getType().name}`);
    }
    getType() {
      return this._ionType;
    }
    _setAnnotations(annotations) {
      this._ionAnnotations = annotations;
    }
    getAnnotations() {
      if (this._ionAnnotations === null) {
        return [];
      }
      return this._ionAnnotations;
    }
    isNull() {
      return false;
    }
    booleanValue() {
      this._unsupportedOperation("booleanValue");
    }
    numberValue() {
      this._unsupportedOperation("numberValue");
    }
    bigIntValue() {
      this._unsupportedOperation("bigIntValue");
    }
    decimalValue() {
      this._unsupportedOperation("decimalValue");
    }
    stringValue() {
      this._unsupportedOperation("stringValue");
    }
    dateValue() {
      this._unsupportedOperation("dateValue");
    }
    timestampValue() {
      this._unsupportedOperation("timestampValue");
    }
    uInt8ArrayValue() {
      this._unsupportedOperation("uInt8ArrayValue");
    }
    fieldNames() {
      this._unsupportedOperation("fieldNames");
    }
    fields() {
      this._unsupportedOperation("fields");
    }
    allFields() {
      this._unsupportedOperation("allFields");
    }
    elements() {
      this._unsupportedOperation("elements");
    }
    get() {
      this._unsupportedOperation("get");
    }
    getAll() {
      this._unsupportedOperation("getAll");
    }
    as(ionValueType) {
      if (this instanceof ionValueType) {
        return this;
      }
      throw new Error(`${this.constructor.name} is not an instance of ${ionValueType.name}`);
    }
    writeTo(writer) {
      this._unsupportedOperation("writeTo");
    }
    deleteField(name) {
      this._unsupportedOperation("deleteField");
    }
    _valueEquals(other) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        epsilon: null,
        ignoreAnnotations: false,
        ignoreTimestampPrecision: false,
        onlyCompareIon: true,
        coerceNumericType: false
      };
      this._unsupportedOperation("_valueEquals");
    }
    equals(other) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        epsilon: null
      };
      let onlyCompareIon = false;
      if (other instanceof Value) {
        onlyCompareIon = true;
      }
      return this._valueEquals(other, {
        onlyCompareIon: onlyCompareIon,
        ignoreTimestampPrecision: true,
        ignoreAnnotations: true,
        epsilon: options.epsilon,
        coerceNumericType: true
      });
    }
    ionEquals(other) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        epsilon: null,
        ignoreAnnotations: false,
        ignoreTimestampPrecision: false
      };
      if (!options.ignoreAnnotations) {
        if (!(other instanceof Value)) {
          return false;
        }
        let actualAnnotations = this.getAnnotations();
        let expectedAnnotations = other.getAnnotations();
        if (actualAnnotations.length !== expectedAnnotations.length) {
          return false;
        }
        for (let i = 0; i < actualAnnotations.length; i++) {
          if (actualAnnotations[i].localeCompare(expectedAnnotations[i]) !== 0) {
            return false;
          }
        }
      }
      let ion_options = {
        onlyCompareIon: true,
        ignoreTimestampPrecision: options.ignoreTimestampPrecision,
        epsilon: options.epsilon,
        coerceNumericType: false
      };
      return this._valueEquals(other, ion_options);
    }
    static _getIonType() {
      return ionType;
    }
    static _fromJsValue(jsValue, annotations) {
      return fromJsConstructor.construct(this, jsValue, annotations);
    }
  };
  Object.defineProperty(newClass, _DOM_VALUE_SIGNET, {
    writable: false,
    enumerable: false,
    value: _DOM_VALUE_SIGNET
  });
  return newClass;
}
exports.Value = Value;
(function (Value) {
  function from(value, annotations) {
    if (value instanceof Value) {
      if (util_1._hasValue(annotations)) {
        throw new Error("Value.from() does not support overriding the annotations on a dom.Value" + " passed as an argument.");
      }
      return value;
    }
    return JsValueConversion._ionValueFromJsValue(value, annotations);
  }
  Value.from = from;
})(Value = exports.Value || (exports.Value = {}));
Object.defineProperty(Value, Symbol.hasInstance, {
  get: () => instance => {
    return util_1._hasValue(instance) && util_1._hasValue(instance.constructor) && _DOM_VALUE_SIGNET in instance.constructor && instance.constructor[_DOM_VALUE_SIGNET] === _DOM_VALUE_SIGNET;
  }
});

},{"../util":55,"./JsValueConversion":40}],51:[function(require,module,exports){
"use strict";

var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function () {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = void 0 && (void 0).__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.load = exports.loadAll = void 0;
const ion = __importStar(require("../Ion"));
const Ion_1 = require("../Ion");
const IonBinaryReader_1 = require("../IonBinaryReader");
const IonTextReader_1 = require("../IonTextReader");
const Blob_1 = require("./Blob");
const Clob_1 = require("./Clob");
const Decimal_1 = require("./Decimal");
const Float_1 = require("./Float");
const Integer_1 = require("./Integer");
const List_1 = require("./List");
const Null_1 = require("./Null");
const SExpression_1 = require("./SExpression");
const Struct_1 = require("./Struct");
const Symbol_1 = require("./Symbol");
const Timestamp_1 = require("./Timestamp");
function loadAll(ionData) {
  const reader = _createReader(ionData);
  const ionValues = [];
  while (reader.next()) {
    ionValues.push(_loadValue(reader));
  }
  return ionValues;
}
exports.loadAll = loadAll;
function load(ionData) {
  const reader = _createReader(ionData);
  if (reader.type() === null) {
    reader.next();
  }
  return reader.type() === null ? null : _loadValue(reader);
}
exports.load = load;
function _createReader(ionData) {
  if (ionData instanceof IonTextReader_1.TextReader || ionData instanceof IonBinaryReader_1.BinaryReader) {
    return ionData;
  }
  return Ion_1.makeReader(ionData);
}
function _loadValue(reader) {
  const ionType = reader.type();
  if (ionType === null) {
    throw new Error("loadValue() called when no further values were available to read.");
  }
  const annotations = reader.annotations();
  if (reader.isNull()) {
    return new Null_1.Null(reader.type(), annotations);
  }
  switch (ionType) {
    case Ion_1.IonTypes.NULL:
      return new Null_1.Null(Ion_1.IonTypes.NULL, annotations);
    case Ion_1.IonTypes.BOOL:
      return new ion.dom.Boolean(reader.booleanValue(), annotations);
    case Ion_1.IonTypes.INT:
      return reader.intSize() == Ion_1.IntSize.Number ? new Integer_1.Integer(reader.numberValue(), annotations) : new Integer_1.Integer(reader.bigIntValue(), annotations);
    case Ion_1.IonTypes.FLOAT:
      return new Float_1.Float(reader.numberValue(), annotations);
    case Ion_1.IonTypes.DECIMAL:
      return new Decimal_1.Decimal(reader.decimalValue(), annotations);
    case Ion_1.IonTypes.TIMESTAMP:
      return new Timestamp_1.Timestamp(reader.timestampValue(), annotations);
    case Ion_1.IonTypes.SYMBOL:
      return new Symbol_1.Symbol(reader.stringValue(), annotations);
    case Ion_1.IonTypes.STRING:
      return new ion.dom.String(reader.stringValue(), annotations);
    case Ion_1.IonTypes.CLOB:
      return new Clob_1.Clob(reader.uInt8ArrayValue(), annotations);
    case Ion_1.IonTypes.BLOB:
      return new Blob_1.Blob(reader.uInt8ArrayValue(), annotations);
    case Ion_1.IonTypes.LIST:
      return _loadList(reader);
    case Ion_1.IonTypes.SEXP:
      return _loadSExpression(reader);
    case Ion_1.IonTypes.STRUCT:
      return _loadStruct(reader);
    default:
      throw new Error(`Unrecognized IonType '${ionType}' found.`);
  }
}
function _loadStruct(reader) {
  const children = new Map();
  const annotations = reader.annotations();
  reader.stepIn();
  while (reader.next()) {
    if (children.has(reader.fieldName())) {
      children.get(reader.fieldName()).push(_loadValue(reader));
    } else {
      children.set(reader.fieldName(), [_loadValue(reader)]);
    }
  }
  reader.stepOut();
  return new Struct_1.Struct(children.entries(), annotations);
}
function _loadList(reader) {
  const annotations = reader.annotations();
  return new List_1.List(_loadSequence(reader), annotations);
}
function _loadSExpression(reader) {
  const annotations = reader.annotations();
  return new SExpression_1.SExpression(_loadSequence(reader), annotations);
}
function _loadSequence(reader) {
  const children = [];
  reader.stepIn();
  while (reader.next()) {
    children.push(_loadValue(reader));
  }
  reader.stepOut();
  return children;
}
var Value_1 = require("./Value");
Object.defineProperty(exports, "Value", {
  enumerable: true,
  get: function () {
    return Value_1.Value;
  }
});
var Null_2 = require("./Null");
Object.defineProperty(exports, "Null", {
  enumerable: true,
  get: function () {
    return Null_2.Null;
  }
});
var Boolean_1 = require("./Boolean");
Object.defineProperty(exports, "Boolean", {
  enumerable: true,
  get: function () {
    return Boolean_1.Boolean;
  }
});
var Integer_2 = require("./Integer");
Object.defineProperty(exports, "Integer", {
  enumerable: true,
  get: function () {
    return Integer_2.Integer;
  }
});
var Float_2 = require("./Float");
Object.defineProperty(exports, "Float", {
  enumerable: true,
  get: function () {
    return Float_2.Float;
  }
});
var Decimal_2 = require("./Decimal");
Object.defineProperty(exports, "Decimal", {
  enumerable: true,
  get: function () {
    return Decimal_2.Decimal;
  }
});
var Timestamp_2 = require("./Timestamp");
Object.defineProperty(exports, "Timestamp", {
  enumerable: true,
  get: function () {
    return Timestamp_2.Timestamp;
  }
});
var String_1 = require("./String");
Object.defineProperty(exports, "String", {
  enumerable: true,
  get: function () {
    return String_1.String;
  }
});
var Symbol_2 = require("./Symbol");
Object.defineProperty(exports, "Symbol", {
  enumerable: true,
  get: function () {
    return Symbol_2.Symbol;
  }
});
var Blob_2 = require("./Blob");
Object.defineProperty(exports, "Blob", {
  enumerable: true,
  get: function () {
    return Blob_2.Blob;
  }
});
var Clob_2 = require("./Clob");
Object.defineProperty(exports, "Clob", {
  enumerable: true,
  get: function () {
    return Clob_2.Clob;
  }
});
var Struct_2 = require("./Struct");
Object.defineProperty(exports, "Struct", {
  enumerable: true,
  get: function () {
    return Struct_2.Struct;
  }
});
var List_2 = require("./List");
Object.defineProperty(exports, "List", {
  enumerable: true,
  get: function () {
    return List_2.List;
  }
});
var SExpression_2 = require("./SExpression");
Object.defineProperty(exports, "SExpression", {
  enumerable: true,
  get: function () {
    return SExpression_2.SExpression;
  }
});

},{"../Ion":5,"../IonBinaryReader":7,"../IonTextReader":25,"./Blob":33,"./Boolean":34,"./Clob":35,"./Decimal":36,"./Float":37,"./Integer":39,"./List":41,"./Null":43,"./SExpression":44,"./String":46,"./Struct":47,"./Symbol":48,"./Timestamp":49,"./Value":50}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventStreamError = void 0;
class EventStreamError extends Error {
  constructor(type, message, index, eventstream) {
    super();
    this.type = type;
    this.index = index;
    this.message = message;
    this.eventstream = eventstream;
  }
}
exports.EventStreamError = EventStreamError;

},{}],53:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IonEventFactory = exports.IonEventType = void 0;
const ComparisonResult_1 = require("../ComparisonResult");
const IonBinaryWriter_1 = require("../IonBinaryWriter");
const IonLocalSymbolTable_1 = require("../IonLocalSymbolTable");
const IonTextWriter_1 = require("../IonTextWriter");
const IonTypes_1 = require("../IonTypes");
const IonUnicode_1 = require("../IonUnicode");
const IonWriteable_1 = require("../IonWriteable");
var IonEventType;
(function (IonEventType) {
  IonEventType[IonEventType["SCALAR"] = 0] = "SCALAR";
  IonEventType[IonEventType["CONTAINER_START"] = 1] = "CONTAINER_START";
  IonEventType[IonEventType["CONTAINER_END"] = 2] = "CONTAINER_END";
  IonEventType[IonEventType["SYMBOL_TABLE"] = 3] = "SYMBOL_TABLE";
  IonEventType[IonEventType["STREAM_END"] = 4] = "STREAM_END";
})(IonEventType = exports.IonEventType || (exports.IonEventType = {}));
class AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    this.eventType = eventType;
    this.ionType = ionType;
    this.fieldName = fieldName;
    this.annotations = annotations;
    this.depth = depth;
    this.ionValue = ionValue;
  }
  write(writer) {
    writer.stepIn(IonTypes_1.IonTypes.STRUCT);
    writer.writeFieldName("event_type");
    writer.writeSymbol(IonEventType[this.eventType]);
    if (this.ionType !== null) {
      writer.writeFieldName("ion_type");
      writer.writeSymbol(this.ionType.name.toUpperCase());
    }
    if (this.fieldName !== null && this.fieldName !== undefined) {
      writer.writeFieldName("field_name");
      writer.stepIn(IonTypes_1.IonTypes.STRUCT);
      writer.writeFieldName("text");
      writer.writeString(this.fieldName);
      writer.stepOut();
    }
    if (this.annotations !== null) {
      writer.writeFieldName("annotations");
      this.writeAnnotations(writer);
    }
    if (this.eventType === IonEventType.SCALAR) {
      this.writeValues(writer);
    }
    writer.writeFieldName("depth");
    writer.writeInt(this.depth);
    writer.stepOut();
  }
  writeAnnotations(writer) {
    if (this.annotations === undefined) {
      writer.writeNull(IonTypes_1.IonTypes.LIST);
      return;
    }
    writer.stepIn(IonTypes_1.IonTypes.LIST);
    for (let i = 0; i < this.annotations.length; i++) {
      writer.stepIn(IonTypes_1.IonTypes.STRUCT);
      writer.writeFieldName("text");
      writer.writeString(this.annotations[i]);
      writer.stepOut();
    }
    writer.stepOut();
  }
  writeSymbolToken(writer, text) {
    writer.writeSymbol(text);
  }
  writeImportDescriptor(writer) {
    writer.writeNull(IonTypes_1.IonTypes.STRUCT);
  }
  writeValues(writer) {
    if (this.eventType === IonEventType.SCALAR) {
      writer.writeFieldName("value_text");
      this.writeTextValue(writer);
      writer.writeFieldName("value_binary");
      this.writeBinaryValue(writer);
    }
  }
  writeTextValue(writer) {
    const tempTextWriter = new IonTextWriter_1.TextWriter(new IonWriteable_1.Writeable());
    this.writeIonValue(tempTextWriter);
    tempTextWriter.close();
    writer.writeString(IonUnicode_1.decodeUtf8(tempTextWriter.getBytes()));
  }
  writeBinaryValue(writer) {
    const tempBinaryWriter = new IonBinaryWriter_1.BinaryWriter(IonLocalSymbolTable_1.defaultLocalSymbolTable(), new IonWriteable_1.Writeable());
    this.writeIonValue(tempBinaryWriter);
    tempBinaryWriter.close();
    const binaryBuffer = tempBinaryWriter.getBytes();
    writer.stepIn(IonTypes_1.IonTypes.LIST);
    for (let i = 0; i < binaryBuffer.length; i++) {
      writer.writeInt(binaryBuffer[i]);
    }
    writer.stepOut();
  }
  equals(expected) {
    return this.compare(expected).result == ComparisonResult_1.ComparisonResultType.EQUAL;
  }
  compare(expected) {
    if (this.eventType !== expected.eventType) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Event types don't match");
    }
    if (this.ionType !== expected.ionType) {
      var _this$ionType, _expected$ionType;
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Ion types don't match " + ((_this$ionType = this.ionType) === null || _this$ionType === void 0 ? void 0 : _this$ionType.name) + " vs. " + ((_expected$ionType = expected.ionType) === null || _expected$ionType === void 0 ? void 0 : _expected$ionType.name));
    }
    if (this.fieldName !== expected.fieldName) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Field names don't match " + this.fieldName + " vs. " + expected.fieldName);
    }
    if (this.depth !== expected.depth) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Event depths don't match " + this.depth + " vs. " + expected.depth);
    }
    const annotationResult = this.annotationCompare(expected.annotations);
    if (annotationResult.result === ComparisonResult_1.ComparisonResultType.NOT_EQUAL) {
      return annotationResult;
    }
    const valueResult = this.valueCompare(expected);
    if (valueResult.result === ComparisonResult_1.ComparisonResultType.NOT_EQUAL) {
      return valueResult;
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
  annotationCompare(expectedAnnotations) {
    if (this.annotations === expectedAnnotations) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    if (this.annotations.length !== expectedAnnotations.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "annotations length don't match" + this.annotations.length + " vs. " + expectedAnnotations.length);
    }
    for (let i = 0; i < this.annotations.length; i++) {
      if (this.annotations[i] !== expectedAnnotations[i]) {
        return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "annotation value doesn't match" + this.annotations[i] + " vs. " + expectedAnnotations[i]);
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
}
class IonEventFactory {
  makeEvent(eventType, ionType, fieldName, depth, annotations, isNull, value) {
    if (isNull) {
      return new IonNullEvent(eventType, ionType, fieldName, annotations, depth);
    }
    switch (eventType) {
      case IonEventType.SCALAR:
      case IonEventType.CONTAINER_START:
        switch (ionType) {
          case IonTypes_1.IonTypes.BOOL:
            {
              return new IonBoolEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.INT:
            {
              return new IonIntEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.FLOAT:
            {
              return new IonFloatEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.DECIMAL:
            {
              return new IonDecimalEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.SYMBOL:
            {
              return new IonSymbolEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.STRING:
            {
              return new IonStringEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.TIMESTAMP:
            {
              return new IonTimestampEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.BLOB:
            {
              return new IonBlobEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.CLOB:
            {
              return new IonClobEvent(eventType, ionType, fieldName, annotations, depth, value);
            }
          case IonTypes_1.IonTypes.LIST:
            {
              return new IonListEvent(eventType, ionType, fieldName, annotations, depth);
            }
          case IonTypes_1.IonTypes.SEXP:
            {
              return new IonSexpEvent(eventType, ionType, fieldName, annotations, depth);
            }
          case IonTypes_1.IonTypes.STRUCT:
            {
              return new IonStructEvent(eventType, ionType, fieldName, annotations, depth);
            }
          default:
            {
              throw new Error("IonType " + ionType.name + " unexpected.");
            }
        }
      case IonEventType.SYMBOL_TABLE:
        throw new Error("symbol tables unsupported.");
      case IonEventType.CONTAINER_END:
        return new IonEndEvent(eventType, depth, ionType);
      case IonEventType.STREAM_END:
        return new IonEndEvent(eventType, depth, ionType);
    }
  }
}
exports.IonEventFactory = IonEventFactory;
class IonNullEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth) {
    super(eventType, ionType, fieldName, annotations, depth, null);
  }
  valueCompare(expected) {
    if (expected instanceof IonNullEvent && this.ionValue === expected.ionValue) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeNull(this.ionType !== null ? this.ionType : IonTypes_1.IonTypes.NULL);
  }
}
class IonIntEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonIntEvent) {
      let actualValue = typeof this.ionValue === "bigint" ? this.ionValue : BigInt(this.ionValue);
      let expectedValue = typeof expected.ionValue === "bigint" ? expected.ionValue : BigInt(expected.ionValue);
      if (actualValue === expectedValue) {
        return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, `${this.ionValue} vs. ${expected.ionValue}`);
  }
  writeIonValue(writer) {
    writer.writeInt(this.ionValue);
  }
}
class IonBoolEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonBoolEvent && this.ionValue === expected.ionValue) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeBoolean(this.ionValue);
  }
}
class IonFloatEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonFloatEvent && Object.is(this.ionValue, expected.ionValue)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeFloat64(this.ionValue);
  }
}
class IonDecimalEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonDecimalEvent && this.ionValue.equals(expected.ionValue)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeDecimal(this.ionValue);
  }
}
class IonSymbolEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonSymbolEvent && this.ionValue === expected.ionValue) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeSymbol(this.ionValue);
  }
}
class IonStringEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonStringEvent && this.ionValue === expected.ionValue) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeString(this.ionValue);
  }
}
class IonTimestampEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (expected instanceof IonTimestampEvent && this.ionValue.equals(expected.ionValue)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {
    writer.writeTimestamp(this.ionValue);
  }
}
class IonBlobEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (!(expected instanceof IonBlobEvent)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL);
    }
    if (this.ionValue.length !== expected.ionValue.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Blob length don't match");
    }
    for (let i = 0; i < this.ionValue.length; i++) {
      if (this.ionValue[i] !== expected.ionValue[i]) {
        return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue[i] + " vs. " + expected.ionValue[i]);
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
  writeIonValue(writer) {
    writer.writeBlob(this.ionValue);
  }
}
class IonClobEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth, ionValue) {
    super(eventType, ionType, fieldName, annotations, depth, ionValue);
  }
  valueCompare(expected) {
    if (!(expected instanceof IonClobEvent)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL);
    }
    if (this.ionValue.length !== expected.ionValue.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
    }
    for (let i = 0; i < this.ionValue.length; i++) {
      if (this.ionValue[i] !== expected.ionValue[i]) {
        return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue[i] + " vs. " + expected.ionValue[i]);
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
  writeIonValue(writer) {
    writer.writeClob(this.ionValue);
  }
}
class AbsIonContainerEvent extends AbstractIonEvent {
  constructor(eventType, ionType, fieldName, annotations, depth) {
    super(eventType, ionType, fieldName, annotations, depth, null);
  }
  writeIonValue(writer) {}
}
class IonStructEvent extends AbsIonContainerEvent {
  constructor(eventType, ionType, fieldName, annotations, depth) {
    super(eventType, ionType, fieldName, annotations, depth);
  }
  valueCompare(expected) {
    if (!(expected instanceof IonStructEvent)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Event types don't match");
    }
    const container = this.ionValue == null ? [] : this.ionValue;
    const expectedContainer = expected.ionValue == null ? [] : expected.ionValue;
    if (container.length !== expectedContainer.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Struct length don't match");
    }
    return this.structsCompare(container, expectedContainer);
  }
  structsCompare(actualEvents, expectedEvents) {
    let matchFound = new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    const paired = new Array(expectedEvents.length);
    for (let i = 0; matchFound && i < actualEvents.length; i++) {
      matchFound.result = ComparisonResult_1.ComparisonResultType.NOT_EQUAL;
      for (let j = 0; matchFound.result == ComparisonResult_1.ComparisonResultType.NOT_EQUAL && j < expectedEvents.length; j++) {
        if (!paired[j]) {
          const child = actualEvents[i];
          const expectedChild = expectedEvents[j];
          matchFound = child.compare(expectedChild);
          if (matchFound.result == ComparisonResult_1.ComparisonResultType.EQUAL) {
            paired[j] = true;
          }
          if (matchFound.result == ComparisonResult_1.ComparisonResultType.EQUAL && child.eventType === IonEventType.CONTAINER_START) {
            for (let k = 0; k < expectedChild.ionValue.length; k++) {
              paired[k + j + 1] = true;
            }
            i += child.ionValue.length;
          }
        }
      }
    }
    for (let i = 0; i < paired.length; i++) {
      if (!paired[i]) {
        matchFound = new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Didn't find matching field for " + expectedEvents[i].fieldName);
        break;
      }
    }
    return matchFound;
  }
}
class IonListEvent extends AbsIonContainerEvent {
  constructor(eventType, ionType, fieldName, annotations, depth) {
    super(eventType, ionType, fieldName, annotations, depth);
  }
  valueCompare(expected) {
    if (!(expected instanceof IonListEvent)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Event types don't match");
    }
    const container = this.ionValue == null ? [] : this.ionValue;
    const expectedContainer = expected.ionValue == null ? [] : expected.ionValue;
    if (container.length !== expectedContainer.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "List length don't match");
    }
    for (let i = 0; i < container.length; i++) {
      const child = container[i];
      if (child.compare(expectedContainer[i]).result == ComparisonResult_1.ComparisonResultType.NOT_EQUAL) {
        return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, `${child.ionValue} vs. ${expectedContainer[i].ionValue}`, i + 1, i + 1);
      } else if (child.eventType === IonEventType.CONTAINER_START) {
        i += child.ionValue.length;
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
}
class IonSexpEvent extends AbsIonContainerEvent {
  constructor(eventType, ionType, fieldName, annotations, depth) {
    super(eventType, ionType, fieldName, annotations, depth);
  }
  valueCompare(expected) {
    if (!(expected instanceof IonSexpEvent)) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "Event types don't match");
    }
    const container = this.ionValue == null ? [] : this.ionValue;
    const expectedContainer = expected.ionValue == null ? [] : expected.ionValue;
    if (container.length !== expectedContainer.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, "S-expression length don't match");
    }
    for (let i = 0; i < container.length; i++) {
      const child = container[i];
      const eventResult = child.compare(expectedContainer[i]);
      if (eventResult.result == ComparisonResult_1.ComparisonResultType.NOT_EQUAL) {
        return eventResult;
      } else if (child.eventType === IonEventType.CONTAINER_START) {
        i += child.ionValue.length;
      }
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
  }
}
class IonEndEvent extends AbstractIonEvent {
  constructor(eventType, depth, ionType) {
    if (eventType === IonEventType.STREAM_END) {
      super(eventType, null, null, [], depth, undefined);
    } else {
      super(eventType, ionType, null, [], depth, undefined);
    }
  }
  valueCompare(expected) {
    if (expected instanceof IonEndEvent && this.ionValue === expected.ionValue) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.EQUAL);
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_1.ComparisonResultType.NOT_EQUAL, this.ionValue + " vs. " + expected.ionValue);
  }
  writeIonValue(writer) {}
}

},{"../ComparisonResult":3,"../IonBinaryWriter":8,"../IonLocalSymbolTable":13,"../IonTextWriter":26,"../IonTypes":29,"../IonUnicode":30,"../IonWriteable":31}],54:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IonEventStream = void 0;
const ComparisonResult_1 = require("../ComparisonResult");
const ComparisonResult_2 = require("../ComparisonResult");
const Ion_1 = require("../Ion");
const IonBinaryReader_1 = require("../IonBinaryReader");
const IonSpan_1 = require("../IonSpan");
const IonTypes_1 = require("../IonTypes");
const EventStreamError_1 = require("./EventStreamError");
const IonEvent_1 = require("./IonEvent");
const READ = "READ";
const WRITE = "WRITE";
class IonEventStream {
  constructor(reader) {
    this.events = [];
    this.reader = reader;
    this.eventFactory = new IonEvent_1.IonEventFactory();
    this.isEventStream = false;
    this.generateStream();
  }
  writeEventStream(writer) {
    writer.writeSymbol("$ion_event_stream");
    for (let i = 0; i < this.events.length; i++) {
      this.events[i].write(writer);
    }
  }
  writeIon(writer) {
    try {
      let tempEvent;
      let isEmbedded = false;
      for (let indice = 0; indice < this.events.length; indice++) {
        tempEvent = this.events[indice];
        if (tempEvent.fieldName !== null) {
          writer.writeFieldName(tempEvent.fieldName);
        }
        if ((tempEvent.ionType == IonTypes_1.IonTypes.SEXP || tempEvent.ionType == IonTypes_1.IonTypes.LIST) && this.isEmbedded(tempEvent)) {
          isEmbedded = true;
        }
        writer.setAnnotations(tempEvent.annotations);
        switch (tempEvent.eventType) {
          case IonEvent_1.IonEventType.SCALAR:
            if (tempEvent.ionValue == null) {
              writer.writeNull(tempEvent.ionType);
              return;
            }
            if (isEmbedded) {
              writer.writeString(tempEvent.ionValue.toString());
              break;
            }
            switch (tempEvent.ionType) {
              case IonTypes_1.IonTypes.BOOL:
                writer.writeBoolean(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.STRING:
                writer.writeString(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.SYMBOL:
                writer.writeSymbol(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.INT:
                writer.writeInt(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.DECIMAL:
                writer.writeDecimal(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.FLOAT:
                writer.writeFloat64(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.NULL:
                writer.writeNull(tempEvent.ionType);
                break;
              case IonTypes_1.IonTypes.TIMESTAMP:
                writer.writeTimestamp(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.CLOB:
                writer.writeClob(tempEvent.ionValue);
                break;
              case IonTypes_1.IonTypes.BLOB:
                writer.writeBlob(tempEvent.ionValue);
                break;
              default:
                throw new Error("unexpected type: " + tempEvent.ionType.name);
            }
            break;
          case IonEvent_1.IonEventType.CONTAINER_START:
            writer.stepIn(tempEvent.ionType);
            break;
          case IonEvent_1.IonEventType.CONTAINER_END:
            if (isEmbedded) {
              isEmbedded = false;
            }
            writer.stepOut();
            break;
          case IonEvent_1.IonEventType.STREAM_END:
            break;
          case IonEvent_1.IonEventType.SYMBOL_TABLE:
            throw new Error("Symboltables unsupported.");
          default:
            throw new Error("Unexpected event type: " + tempEvent.eventType);
        }
      }
      writer.close();
    } catch (error) {
      throw new EventStreamError_1.EventStreamError(WRITE, error.message, this.events.length, this.events);
    }
  }
  getEvents() {
    return this.events;
  }
  equals(expected) {
    return this.compare(expected).result == ComparisonResult_2.ComparisonResultType.EQUAL;
  }
  compare(expected) {
    let actualIndex = 0;
    let expectedIndex = 0;
    if (this.events.length != expected.events.length) {
      return new ComparisonResult_1.ComparisonResult(ComparisonResult_2.ComparisonResultType.NOT_EQUAL, "The event streams have different lengths");
    }
    while (actualIndex < this.events.length && expectedIndex < expected.events.length) {
      const actualEvent = this.events[actualIndex];
      const expectedEvent = expected.events[expectedIndex];
      if (actualEvent.eventType === IonEvent_1.IonEventType.SYMBOL_TABLE) {
        actualIndex++;
      }
      if (expectedEvent.eventType === IonEvent_1.IonEventType.SYMBOL_TABLE) {
        expectedIndex++;
      }
      if (actualEvent.eventType === IonEvent_1.IonEventType.SYMBOL_TABLE || expectedEvent.eventType === IonEvent_1.IonEventType.SYMBOL_TABLE) {
        continue;
      }
      switch (actualEvent.eventType) {
        case IonEvent_1.IonEventType.SCALAR:
          {
            const eventResult = actualEvent.compare(expectedEvent);
            if (eventResult.result == ComparisonResult_2.ComparisonResultType.NOT_EQUAL) {
              eventResult.actualIndex = actualIndex;
              eventResult.expectedIndex = expectedIndex;
              return eventResult;
            }
            break;
          }
        case IonEvent_1.IonEventType.CONTAINER_START:
          {
            const eventResult = actualEvent.compare(expectedEvent);
            if (eventResult.result == ComparisonResult_2.ComparisonResultType.NOT_EQUAL) {
              actualIndex += eventResult.actualIndex;
              expectedIndex += eventResult.expectedIndex;
              eventResult.actualIndex = actualIndex;
              eventResult.expectedIndex = expectedIndex;
              return eventResult;
            } else {
              if (actualEvent.ionValue !== null && expectedEvent.ionValue !== null) {
                actualIndex = actualIndex + actualEvent.ionValue.length;
                expectedIndex = expectedIndex + expectedEvent.ionValue.length;
              }
            }
            break;
          }
        case IonEvent_1.IonEventType.CONTAINER_END:
        case IonEvent_1.IonEventType.STREAM_END:
          {
            break;
          }
        default:
          {
            throw new Error("Unexpected event type: " + actualEvent.eventType);
          }
      }
      actualIndex++;
      expectedIndex++;
    }
    return new ComparisonResult_1.ComparisonResult(ComparisonResult_2.ComparisonResultType.EQUAL);
  }
  isEmbedded(event) {
    if (event.annotations[0] === "embedded_documents") {
      return true;
    }
    return false;
  }
  generateStream() {
    try {
      let tid = this.reader.next();
      if (tid === IonTypes_1.IonTypes.SYMBOL && this.reader.stringValue() === "$ion_event_stream") {
        this.marshalStream();
        this.isEventStream = true;
        return;
      }
      const currentContainer = [];
      const currentContainerIndex = [];
      while (true) {
        if (this.reader.isNull()) {
          this.events.push(this.eventFactory.makeEvent(IonEvent_1.IonEventType.SCALAR, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), true, this.reader.value()));
        } else {
          switch (tid) {
            case IonTypes_1.IonTypes.LIST:
            case IonTypes_1.IonTypes.SEXP:
            case IonTypes_1.IonTypes.STRUCT:
              {
                const containerEvent = this.eventFactory.makeEvent(IonEvent_1.IonEventType.CONTAINER_START, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, null);
                this.events.push(containerEvent);
                currentContainer.push(containerEvent);
                currentContainerIndex.push(this.events.length);
                this.reader.stepIn();
                break;
              }
            case null:
              {
                if (this.reader.depth() === 0) {
                  this.events.push(this.eventFactory.makeEvent(IonEvent_1.IonEventType.STREAM_END, IonTypes_1.IonTypes.NULL, null, this.reader.depth(), [], false, undefined));
                  return;
                } else {
                  this.reader.stepOut();
                  this.endContainer(currentContainer.pop(), currentContainerIndex.pop());
                }
                break;
              }
            default:
              {
                this.events.push(this.eventFactory.makeEvent(IonEvent_1.IonEventType.SCALAR, tid, this.reader.fieldName(), this.reader.depth(), this.reader.annotations(), false, this.reader.value()));
                break;
              }
          }
        }
        tid = this.reader.next();
      }
    } catch (error) {
      throw new EventStreamError_1.EventStreamError(READ, error.message, this.events.length, this.events);
    }
  }
  endContainer(thisContainer, thisContainerIndex) {
    this.events.push(this.eventFactory.makeEvent(IonEvent_1.IonEventType.CONTAINER_END, thisContainer.ionType, null, thisContainer.depth, [], false, null));
    thisContainer.ionValue = this.events.slice(thisContainerIndex, this.events.length);
  }
  marshalStream() {
    this.events = [];
    const currentContainer = [];
    const currentContainerIndex = [];
    for (let tid = this.reader.next(); tid === IonTypes_1.IonTypes.STRUCT; tid = this.reader.next()) {
      this.reader.stepIn();
      const tempEvent = this.marshalEvent();
      if (tempEvent.eventType === IonEvent_1.IonEventType.CONTAINER_START) {
        currentContainer.push(tempEvent);
        this.events.push(tempEvent);
        currentContainerIndex.push(this.events.length);
      } else if (tempEvent.eventType === IonEvent_1.IonEventType.CONTAINER_END) {
        this.endContainer(currentContainer.pop(), currentContainerIndex.pop());
      } else if (tempEvent.eventType === IonEvent_1.IonEventType.SCALAR || tempEvent.eventType === IonEvent_1.IonEventType.STREAM_END) {
        this.events.push(tempEvent);
      } else {
        throw new Error("Unexpected eventType: " + tempEvent.eventType);
      }
      this.reader.stepOut();
    }
  }
  marshalEvent() {
    const currentEvent = {};
    for (let tid; tid = this.reader.next();) {
      const fieldName = this.reader.fieldName();
      if (fieldName && currentEvent[fieldName] !== undefined) {
        throw new Error("Repeated event field: " + fieldName);
      }
      switch (fieldName) {
        case "event_type":
          {
            currentEvent[fieldName] = this.reader.stringValue();
            break;
          }
        case "ion_type":
          {
            currentEvent[fieldName] = this.parseIonType();
            break;
          }
        case "field_name":
          {
            currentEvent[fieldName] = this.resolveFieldNameFromSerializedSymbolToken();
            break;
          }
        case "annotations":
          {
            currentEvent[fieldName] = this.parseAnnotations();
            break;
          }
        case "value_text":
          {
            let tempString = this.reader.stringValue();
            if (tempString.substr(0, 5) === "$ion_") {
              tempString = "$ion_user_value::" + tempString;
            }
            const tempReader = Ion_1.makeReader(tempString);
            tempReader.next();
            const tempValue = tempReader.value();
            currentEvent["isNull"] = tempReader.isNull();
            currentEvent[fieldName] = tempValue;
            break;
          }
        case "value_binary":
          {
            currentEvent[fieldName] = this.parseBinaryValue();
            break;
          }
        case "imports":
          {
            currentEvent[fieldName] = this.parseImports();
            break;
          }
        case "depth":
          {
            currentEvent[fieldName] = this.reader.numberValue();
            break;
          }
        default:
          throw new Error("Unexpected event field: " + fieldName);
      }
    }
    let eventType;
    switch (currentEvent["event_type"]) {
      case "CONTAINER_START":
        eventType = IonEvent_1.IonEventType.CONTAINER_START;
        break;
      case "STREAM_END":
        eventType = IonEvent_1.IonEventType.STREAM_END;
        break;
      case "CONTAINER_END":
        eventType = IonEvent_1.IonEventType.CONTAINER_END;
        break;
      case "SCALAR":
        eventType = IonEvent_1.IonEventType.SCALAR;
        break;
      case "SYMBOL_TABLE":
        throw new Error("Symbol tables unsupported");
    }
    const fieldname = currentEvent["field_name"] !== undefined ? currentEvent["field_name"] : null;
    if (!currentEvent["annotations"]) {
      currentEvent["annotations"] = [];
    }
    const textEvent = this.eventFactory.makeEvent(eventType, currentEvent["ion_type"], fieldname, currentEvent["depth"], currentEvent["annotations"], currentEvent["isNull"], currentEvent["value_text"]);
    if (eventType === IonEvent_1.IonEventType.SCALAR) {
      const binaryEvent = this.eventFactory.makeEvent(eventType, currentEvent["ion_type"], fieldname, currentEvent["depth"], currentEvent["annotations"], currentEvent["isNull"], currentEvent["value_binary"]);
      if (!textEvent.equals(binaryEvent)) {
        throw new Error(`Text event ${currentEvent["value_text"]} does not equal binary event ${currentEvent["value_binary"]}`);
      }
    }
    return textEvent;
  }
  parseIonType() {
    const input = this.reader.stringValue().toLowerCase();
    switch (input) {
      case "null":
        {
          return IonTypes_1.IonTypes.NULL;
        }
      case "bool":
        {
          return IonTypes_1.IonTypes.BOOL;
        }
      case "int":
        {
          return IonTypes_1.IonTypes.INT;
        }
      case "float":
        {
          return IonTypes_1.IonTypes.FLOAT;
        }
      case "decimal":
        {
          return IonTypes_1.IonTypes.DECIMAL;
        }
      case "timestamp":
        {
          return IonTypes_1.IonTypes.TIMESTAMP;
        }
      case "symbol":
        {
          return IonTypes_1.IonTypes.SYMBOL;
        }
      case "string":
        {
          return IonTypes_1.IonTypes.STRING;
        }
      case "clob":
        {
          return IonTypes_1.IonTypes.CLOB;
        }
      case "blob":
        {
          return IonTypes_1.IonTypes.BLOB;
        }
      case "list":
        {
          return IonTypes_1.IonTypes.LIST;
        }
      case "sexp":
        {
          return IonTypes_1.IonTypes.SEXP;
        }
      case "struct":
        {
          return IonTypes_1.IonTypes.STRUCT;
        }
      default:
        {
          throw new Error("i: " + input);
        }
    }
  }
  parseAnnotations() {
    const annotations = [];
    if (this.reader.isNull()) {
      return annotations;
    } else {
      this.reader.stepIn();
      for (let tid; tid = this.reader.next();) {
        if (tid == IonTypes_1.IonTypes.STRUCT) {
          this.reader.stepIn();
          const type = this.reader.next();
          if (this.reader.fieldName() == "text" && type == IonTypes_1.IonTypes.STRING) {
            const text = this.reader.stringValue();
            if (text !== null) {
              annotations.push(text);
            }
          } else if (this.reader.fieldName() == "importLocation" && type == IonTypes_1.IonTypes.INT) {
            const symtab = Ion_1.defaultLocalSymbolTable();
            const symbol = symtab.getSymbolText(this.reader.numberValue());
            if (symbol === undefined || symbol === null) {
              throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
            }
            annotations.push(symbol);
          }
          this.reader.stepOut();
        }
      }
      this.reader.stepOut();
      return annotations;
    }
  }
  parseBinaryValue() {
    if (this.reader.isNull()) {
      return null;
    }
    const numBuffer = [];
    this.reader.stepIn();
    let tid = this.reader.next();
    while (tid) {
      numBuffer.push(this.reader.numberValue());
      tid = this.reader.next();
    }
    this.reader.stepOut();
    const bufArray = new Uint8Array(numBuffer);
    const tempReader = new IonBinaryReader_1.BinaryReader(new IonSpan_1.BinarySpan(bufArray));
    tempReader.next();
    return tempReader.value();
  }
  parseImports() {
    return this.reader.value();
  }
  resolveFieldNameFromSerializedSymbolToken() {
    if (this.reader.isNull()) {
      return null;
    }
    this.reader.stepIn();
    const type = this.reader.next();
    if (this.reader.fieldName() == "text" && type == IonTypes_1.IonTypes.STRING) {
      const text = this.reader.stringValue();
      if (text !== null) {
        this.reader.stepOut();
        return text;
      }
    } else if (this.reader.fieldName() == "importLocation" && type == IonTypes_1.IonTypes.INT) {
      const symtab = Ion_1.defaultLocalSymbolTable();
      const symbol = symtab.getSymbolText(this.reader.numberValue());
      if (symbol === undefined || symbol === null) {
        throw new Error("Unresolvable symbol ID, symboltokens unsupported.");
      }
      this.reader.stepOut();
      return symbol;
    }
    return null;
  }
}
exports.IonEventStream = IonEventStream;

},{"../ComparisonResult":3,"../Ion":5,"../IonBinaryReader":7,"../IonSpan":19,"../IonTypes":29,"./EventStreamError":52,"./IonEvent":53}],55:[function(require,module,exports){
"use strict";

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
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSafeInteger = exports._assertDefined = exports._hasValue = exports._sign = void 0;
function _sign(x) {
  return x < 0 || x === 0 && 1 / x === -Infinity ? -1 : 1;
}
exports._sign = _sign;
function _hasValue(v) {
  return v !== undefined && v !== null;
}
exports._hasValue = _hasValue;
function _assertDefined(value) {
  if (value === undefined) {
    throw new Error("Expected value to be defined");
  }
}
exports._assertDefined = _assertDefined;
function isSafeInteger(value) {
  return value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER;
}
exports.isSafeInteger = isSafeInteger;

},{}],56:[function(require,module,exports){
function _extends() {
  module.exports = _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }, module.exports.__esModule = true, module.exports["default"] = module.exports;
  return _extends.apply(this, arguments);
}
module.exports = _extends, module.exports.__esModule = true, module.exports["default"] = module.exports;
},{}],57:[function(require,module,exports){
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;
},{}]},{},[5])(5)
});
