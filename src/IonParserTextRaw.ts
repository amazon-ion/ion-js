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

// IonParserTextRaw
//
// Handles parsing the Ion text values from a text span.
// Returns on any value with value type. The _start and _end
// members are set for scalar types.

import {
  asAscii,
  ESCAPED_NEWLINE,
  isNumericTerminator,
  is_base64_char,
  is_digit,
  is_hex_digit,
  is_keyword,
  is_letter,
  is_letter_or_digit,
  is_operator_char,
  is_whitespace,
  WHITESPACE_COMMENT1,
  WHITESPACE_COMMENT2,
} from "./IonText";

import { StringSpan } from "./IonSpan";
import { SymbolToken } from "./IonSymbolToken";
import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";

const EOF = -1; // EOF is end of container, distinct from undefined which is value has been consumed
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

const CH_CR = 13; // '\r'
const CH_NL = 10; // '\n'
const CH_BS = 92; // '\\'
const CH_FORWARD_SLASH = "/".charCodeAt(0); // 47
const CH_AS = 42; // '*'
const CH_SQ = 39; // '\''
const CH_DOUBLE_QUOTE = '"'.charCodeAt(0); // 34
const CH_CM = 44; // ';'
const CH_OP = 40; // '('
const CH_CP = 41; // ')'
const CH_LEFT_CURLY: number = "{".charCodeAt(0); // 123
const CH_CC = 125; // '}'
const CH_OS = 91; // '['
const CH_CS = 93; // ']'
const CH_CL = 58; // ':'
const CH_DT = 46; // '.'
const CH_EQ = 61; // '='
const CH_PS = 43; // '+'
const CH_MS = 45; // '-'
const CH_0 = 48; // '0'
const CH_D = 68; // 'D'
const CH_E = 69; // 'E'
const CH_F = 70; // 'F'
const CH_T = 84; // 'T'
const CH_X = 88; // 'X'
const CH_Z = 90; // 'Z'
const CH_d = 100; // 'd'
const CH_e = 101; // 'e'
const CH_f = 102; // 'f'
const CH_i = 105; // 'i'
const CH_n = 110; // 'n'
const CH_x = 120; // 'x'

const ESC_0 = 48; //  values['0'] = 0;        //    \u0000  \0  alert NUL
const ESC_a = 97; //  values['a'] = 7;        //    \u0007  \a  alert BEL
const ESC_b = 98; //  values['b'] = 8;        //    \u0008  \b  backspace BS
const ESC_t = 116; //  values['t'] = 9;        //    \u0009  \t  horizontal tab HT
const ESC_nl = 110; //  values['n'] = '\n';     //    \ u000A  \ n  linefeed LF
const ESC_ff = 102; //  values['f'] = 0x0c;     //    \u000C  \f  form feed FF
const ESC_cr = 114; //  values['r'] = '\r';     //    \ u000D  \ r  carriage return CR
const ESC_v = 118; //  values['v'] = 0x0b;     //    \u000B  \v  vertical tab VT
const ESC_dq = CH_DOUBLE_QUOTE; //  values['"'] = '"';      //    \u0022  \"  double quote
const ESC_sq = CH_SQ; //  values['\''] = '\'';    //    \u0027  \'  single quote
const ESC_qm = 63; //  values['?'] = '?';      //    \u003F  \?  question mark
const ESC_bs = 92; //  values['\\'] = '\\';    //    \u005C  \\  backslash
const ESC_fs = 47; //  values['/'] = '/';      //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
const ESC_nl2 = 10; //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
const ESC_nl3 = 13; //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
const ESC_x = CH_x; //  values['x'] = ESCAPE_HEX;      //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
const ESC_u = 117; //  values['u'] = ESCAPE_LITTLE_U; //    any  \ uHHHH  4-digit hexadecimal unicode character
const ESC_U = 85; //  values['U'] = ESCAPE_BIG_U;    //    any  \ UHHHHHHHH  8-digit hexadecimal unicode character

const INF = [CH_i, CH_n, CH_f];

// mask the 6 hi-order bits of a UTF-16 surrogate; the 10 low-order bits are the ones of interest
const _UTF16_MASK = 0x03ff;

export function get_ion_type(t: number): IonType | null {
  switch (t) {
    case EOF:
      return null;
    case ERROR:
      return null;
    case T_NULL:
      return IonTypes.NULL;
    case T_BOOL:
      return IonTypes.BOOL;
    case T_INT:
      return IonTypes.INT;
    case T_HEXINT:
      return IonTypes.INT;
    case T_FLOAT:
      return IonTypes.FLOAT;
    case T_FLOAT_SPECIAL:
      return IonTypes.FLOAT;
    case T_DECIMAL:
      return IonTypes.DECIMAL;
    case T_TIMESTAMP:
      return IonTypes.TIMESTAMP;
    case T_IDENTIFIER:
      return IonTypes.SYMBOL;
    case T_OPERATOR:
      return IonTypes.SYMBOL;
    case T_STRING1:
      return IonTypes.SYMBOL;
    case T_STRING2:
      return IonTypes.STRING;
    case T_STRING3:
      return IonTypes.STRING;
    case T_CLOB2:
      return IonTypes.CLOB;
    case T_CLOB3:
      return IonTypes.CLOB;
    case T_BLOB:
      return IonTypes.BLOB;
    case T_SEXP:
      return IonTypes.SEXP;
    case T_LIST:
      return IonTypes.LIST;
    case T_STRUCT:
      return IonTypes.STRUCT;
    default:
      throw new Error("Unknown type: " + String(t) + ".");
  }
}

// needs to differentiate between quoted text of 'null' and the symbol keyword null
function get_keyword_type(str: string): number {
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

function get_type_from_name(str: string): number {
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

function get_hex_value(ch: number): number {
  switch (
    ch // quick and dirty - we need a better impl TODO
  ) {
    case 48:
      return 0; // '0'
    case 49:
      return 1; // '1'
    case 50:
      return 2; // '2'
    case 51:
      return 3; // '3'
    case 52:
      return 4; // '4'
    case 53:
      return 5; // '5'
    case 54:
      return 6; // '6'
    case 55:
      return 7; // '7'
    case 56:
      return 8; // '8'
    case 57:
      return 9; // '9'
    case 97:
      return 10; // 'a'
    case 98:
      return 11; // 'b'
    case 99:
      return 12; // 'c'
    case 100:
      return 13; // 'd'
    case 101:
      return 14; // 'e'
    case 102:
      return 15; // 'f'
    case 65:
      return 10; // 'A'
    case 66:
      return 11; // 'B'
    case 67:
      return 12; // 'C'
    case 68:
      return 13; // 'D'
    case 69:
      return 14; // 'E'
    case 70:
      return 15; // 'F'
  }
  throw new Error("Unexpected bad hex digit in checked data.");
}

function is_valid_base64_length(
  char_length: number,
  trailer_length: number
): boolean {
  if (trailer_length > 2) {
    return false;
  }
  if (((char_length + trailer_length) & 0x3) != 0) {
    return false;
  }
  return true;
}

function is_valid_string_char(ch: number, allow_new_line: boolean): boolean {
  if (ch == CH_CR) {
    return allow_new_line;
  }
  if (ch == CH_NL) {
    return allow_new_line;
  }
  if (is_whitespace(ch)) {
    return true;
  }
  if (ch < 32) {
    return false;
  }
  return true;
}

type ReadValueHelper = (
  ch: number,
  accept_operator_symbols: boolean,
  calling_op: ReadValueHelper
) => void;

type ReadValueHelpers = { [index: number]: ReadValueHelper };

export class ParserTextRaw {
  private _in: StringSpan;
  private _ops: any[];
  private _value_type: any;
  private _value_null: boolean = false;
  private _value: any[];
  private _start: number;
  private _end: number;
  private _esc_len: number;
  private _curr: number;
  private _curr_null: boolean = false;
  private _ann: SymbolToken[];
  private _msg: string;
  private _error_msg: string;
  private _fieldname: string | null;
  private _fieldnameType: number | null;

  private readonly _read_value_helper_helpers: ReadValueHelpers;

  constructor(source: StringSpan) {
    this._in = source; // should be a span
    this._ops = [this._read_datagram_values];
    this._value_type = ERROR;
    this._value = []; // value gets a new array since it will modify it
    this._start = -1;
    this._end = -1;
    this._esc_len = -1;
    this._curr = EOF;
    this._ann = [];
    this._msg = "";
    this._fieldname = null;
    this._fieldnameType = null;

    const helpers: ReadValueHelpers = {
      //  -1 : this._read_value_helper_EOF,    //      == EOF
      40: this._read_value_helper_paren, // '('  == CH_OP
      91: this._read_value_helper_square, // '['  == CH_OS
      123: this._read_value_helper_curly, // '{'  == CH_LEFT_CURLY
      43: this._read_value_helper_plus, // '+'  == CH_PS // we'll have to patch these two back in after
      45: this._read_value_helper_minus, // '-'  == CH_MS // we apply the operator characters fn
      39: this._read_value_helper_single, // '\'' == CH_SQ
      34: this._read_value_helper_double, // '\"' == CH_DQ
    };
    const set_helper = function (str: string, fn: ReadValueHelper) {
      let i = str.length,
        ch;
      while (i > 0) {
        i--;
        ch = str.charCodeAt(i);
        helpers[ch] = fn;
      }
    };

    set_helper("0123456789", this._read_value_helper_digit);
    set_helper(
      "_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
      this._read_value_helper_letter
    );
    set_helper("!#%&*+-./;<=>?@^`|~", this._read_value_helper_operator);
    // patch (back) in the two special to the operator functions
    helpers[CH_PS] = this._read_value_helper_plus; // '+'
    helpers[CH_MS] = this._read_value_helper_minus; // '-'

    this._read_value_helper_helpers = helpers;
  }

  fieldName(): string | null {
    return this._fieldname;
  }

  fieldNameType(): number | null {
    return this._fieldnameType;
  }

  source(): StringSpan {
    return this._in;
  }

  annotations(): SymbolToken[] {
    return this._ann;
  }

  clearFieldName(): void {
    this._fieldname = null;
    this._fieldnameType = null;
  }

  isNull(): boolean {
    return this._curr_null;
  }

  bigIntValue(): bigint | null {
    if (this.isNull()) {
      return null;
    }
    const intText = this.get_value_as_string(this._curr).toLowerCase();

    switch (this._curr) {
      case T_INT:
      case T_HEXINT:
        // Negative hex ints are not supported by BigInt
        if (intText.startsWith("-")) {
          const i = BigInt(intText.slice(1));
          return -i;
        }

        return BigInt(intText);
      default:
        throw new Error(
          "intValue() was called when the current value was not an integer."
        );
    }
  }

  numberValue(): number | null {
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

  booleanValue(): boolean | null {
    if (this.isNull()) {
      return null;
    }
    const s: string = this.get_value_as_string(T_BOOL);
    if (s === "true") {
      return true;
    } else if (s === "false") {
      return false;
    }
    throw new Error("Unrecognized Boolean value '" + s + "'");
  }

  get_value_as_string(t: number): string {
    let index: number;
    let ch: number;
    let s: string = "";
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
          if (is_base64_char(ch)) {
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
              // convert from UTF-16 surrogate pair to a codepoint
              const hiSurrogate = ch;
              const loSurrogate = tempChar;
              const codepoint =
                0x10000 +
                ((hiSurrogate & _UTF16_MASK) << 10) +
                (loSurrogate & _UTF16_MASK);
              s += String.fromCodePoint(codepoint);
            } else {
              throw new Error("expected a low surrogate, but found: " + ch);
            }
          } else if (this.isLowSurrogate(ch)) {
            throw new Error("unexpected low surrogate: " + ch);
          } else if (
            t === T_STRING3 &&
            ch === CH_SQ &&
            !isEscaped &&
            this.verifyTriple(index)
          ) {
            index = this._skip_triple_quote_gap(
              index,
              this._end,
              /*acceptComments*/ true
            );
          } else if (ch >= 0) {
            if (isEscaped) {
              s += String.fromCodePoint(ch);
            } else {
              if (
                t === T_STRING3 &&
                ch === ESC_nl3 &&
                this._in.valueAt(index + 1) === ESC_nl2
              ) {
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

  get_value_as_uint8array(t: number): Uint8Array {
    const bytes: number[] = [];
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
              index = this._skip_triple_quote_gap(
                index,
                this._end,
                /*acceptComments*/ false
              );
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

  next(): number | undefined {
    this.clearFieldName();
    this._ann = [];
    if (this._value_type === ERROR) {
      this._run();
    }
    this._curr = this._value_pop();

    let t: number;
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

  private _read_datagram_values() {
    const ch = this._peek();
    if (ch == EOF) {
      this._value_push(EOF);
    } else {
      // these get put in the ops list in reverse order
      this._ops.unshift(this._read_datagram_values);
      this._ops.unshift(this._read_value);
    }
  }

  private _read_sexp_values() {
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

  private _read_list_values() {
    const ch = this._read_after_whitespace(true);
    if (ch == CH_CS) {
      // degenerate case of an empty list
      this._value_push(EOF);
    } else {
      // otherwise we read a value and continue
      this._unread(ch);
      this._ops.unshift(this._read_list_comma);
      this._ops.unshift(this._read_value);
    }
  }

  private _read_struct_values() {
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
        if (is_letter(ch)) {
          op = this._read_symbol;
        }
        break;
    }
    if (op === this._done_with_error) {
      this._error("expected field name (or close struct '}') not found");
    } else {
      op.call(this); // this puts a value on the stack, which we don't return to the caller directly
      this._load_field_name(); // this will consume that value
      // so we skip over the expected colon, read the actual value, and try for another value
      ch = this._read_after_whitespace(true);
      if (ch != CH_CL) {
        this._error("expected ':'");
        return;
      }
      this._ops.unshift(this._read_struct_comma);
      this._ops.unshift(this._read_value);
    }
  }

  private _read_list_comma(): void {
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

  private _read_struct_comma(): void {
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

  private _load_field_name() {
    this._fieldnameType = this._value_pop();
    const s = this.get_value_as_string(this._fieldnameType!);

    switch (this._fieldnameType) {
      case T_IDENTIFIER:
        if (is_keyword(s)) {
          throw new Error(
            "can't use '" + s + "' as a fieldname without quotes"
          );
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

  private _read_value(): void {
    this._read_value_helper(false, this._read_value);
  }

  private _read_sexp_value() {
    this._read_value_helper(true, this._read_sexp_value);
  }

  private _read_value_helper(
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    const ch: number = this._read_after_whitespace(true);
    if (ch == EOF) {
      // since we can't index into our object with a value of -1
      this._read_value_helper_EOF(ch, accept_operator_symbols, calling_op);
    } else {
      const fn: ReadValueHelper = this._read_value_helper_helpers[ch];
      if (fn != undefined) {
        fn.call(this, ch, accept_operator_symbols, calling_op);
      } else {
        this._error("unexpected character '" + asAscii(ch) + "'");
      }
    }
  }

  // helper for the read_value_helper function
  private _read_value_helper_EOF(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    this._ops.unshift(this._done);
  }

  private _read_value_helper_paren(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    this._value_push(T_SEXP);
    this._ops.unshift(this._read_sexp_values);
  }

  private _read_value_helper_square(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    this._value_push(T_LIST);
    this._ops.unshift(this._read_list_values);
  }

  private _read_value_helper_curly(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
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

  private _read_value_helper_plus(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    const ch2 = this._peek("inf");
    this._unread(ch1); // in any case we'll leave this character for the next function to use
    if (isNumericTerminator(ch2)) {
      this._ops.unshift(this._read_plus_inf);
    } else if (accept_operator_symbols) {
      this._ops.unshift(this._read_operator_symbol);
    } else {
      this._error("unexpected '+'");
    }
  }

  private _read_value_helper_minus = function (
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    let op,
      ch2 = this._peek();
    if (ch2 == CH_i) {
      ch2 = this._peek("inf");
      if (isNumericTerminator(ch2)) {
        op = this._read_minus_inf;
      } else if (accept_operator_symbols) {
        op = this._read_operator_symbol;
      }
    } else if (is_digit(ch2)) {
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

  private _read_value_helper_digit(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    const ch2 = this._peek_4_digits(ch1);
    this._unread(ch1);
    if (ch2 == CH_T || ch2 == CH_MS) {
      this._ops.unshift(this._readTimestamp);
    } else {
      this._ops.unshift(this._read_number);
    }
  }

  private _read_value_helper_single(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    let op;
    if (this._peek("''") != ERROR) {
      op = this._read_string3;
      op.call(this);
    } else {
      op = this._read_string1;
      op.call(this);
      if (this._test_string_as_annotation(op)) {
        // this was an annotation, so we need to try again for the actual value
        this._ops.unshift(calling_op);
      }
    }
  }

  private _read_value_helper_double(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    this._ops.unshift(this._read_string2);
  }

  private _read_value_helper_letter(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    this._read_symbol();
    const type = this._value_pop();
    if (type != T_IDENTIFIER) {
      throw new Error("Expecting symbol here.");
    }

    let symbol = this.get_value_as_string(type);

    if (is_keyword(symbol)) {
      let kwt = get_keyword_type(symbol);
      if (kwt === T_NULL) {
        this._value_null = true;
        if (this._peek() === CH_DT) {
          this._read(); // consume the dot
          const ch = this._read();
          if (is_letter(ch) !== true) {
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
        this._read(); // consume the colon character
        const sid = this._parseSymbolId(symbol);
        if (sid === 0) {
          throw new Error("Symbol ID zero is not supported.");
        } else if (isNaN(sid)) {
          this._ann.push(new SymbolToken(symbol));
        } else {
          this._ann.push(new SymbolToken(null, sid));
        }
        this._ops.unshift(calling_op);
      } else {
        const kwt = T_IDENTIFIER;
        this._unread(ch);
        this._value_push(kwt); // put the value back on the stack
      }
    }
  }

  private _read_value_helper_operator(
    ch1: number,
    accept_operator_symbols: boolean,
    calling_op: ReadValueHelper
  ) {
    if (accept_operator_symbols) {
      this._unread(ch1);
      this._ops.unshift(this._read_operator_symbol);
    } else {
      this._error("unexpected operator character");
    }
  }

  private _done() {
    this._value_push(EOF);
  }

  private _done_with_error() {
    this._value_push(ERROR);
    throw new Error(this._error_msg);
  }

  private _read_number() {
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
      if (is_digit(ch)) {
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
    if (!isNumericTerminator(ch)) {
      if (ch == CH_d || ch == CH_D) {
        t = T_DECIMAL;
        ch = this._read_exponent();
      } else if (ch == CH_e || ch == CH_E || ch == CH_f || ch == CH_F) {
        t = T_FLOAT;
        ch = this._read_exponent();
      }
    }
    if (!isNumericTerminator(ch)) {
      this._error("invalid character after number");
    } else {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(t);
    }
  }

  private _read_hex_int(): void {
    let ch = this._read(); // re-read the 'x' we peeked at earlier
    if (ch == CH_x || ch == CH_X) {
      ch = this._read(); // read the first hex digits
      ch = this._read_required_hex_digits(ch);
    }
    if (isNumericTerminator(ch)) {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(T_HEXINT);
    } else {
      this._error("invalid character after number");
    }
  }

  private _read_exponent(): number {
    let ch = this._read();
    if (ch == CH_MS || ch == CH_PS) {
      ch = this._read();
    }
    ch = this._read_required_digits(ch);
    return ch;
  }

  private _read_plus_inf() {
    this._start = this._in.position();
    if (this._read() == CH_PS) {
      this._read_inf_helper();
    } else {
      this._error("expected +inf");
    }
  }

  private _read_minus_inf() {
    this._start = this._in.position();
    if (this._read() == CH_MS) {
      this._read_inf_helper();
    } else {
      this._error("expected -inf");
    }
  }

  private _read_inf_helper() {
    let ii, ch;
    for (ii = 0; ii < 3; ii++) {
      ch = this._read();
      if (ch != INF[ii]) {
        this._error("expected 'inf'");
        return;
      }
    }
    if (isNumericTerminator(this._peek())) {
      this._end = this._in.position();
      this._value_push(T_FLOAT_SPECIAL);
    } else {
      this._error("invalid numeric terminator after 'inf'");
    }
  }

  private _readTimestamp(): void {
    this._start = this._in.position();
    let ch = this._readPastNDigits(4); // reads past year, throws on non digits.
    if (ch === CH_T) {
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_MS) {
      throw new Error("Timestamp year must be followed by '-' or 'T'.");
    }

    ch = this._readPastNDigits(2); // reads past month, throws on non digits.
    if (ch === CH_T) {
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_MS) {
      throw new Error("Timestamp month must be followed by '-' or 'T'.");
    }

    ch = this._readPastNDigits(2); // reads past day, throws on non digits.
    if (isNumericTerminator(ch)) {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (ch !== CH_T) {
      throw new Error(
        "Timestamp day must be followed by a numeric stop character ."
      );
    }

    const peekChar = this._in.peek();
    if (isNumericTerminator(peekChar)) {
      // checks to see if timestamp value has terminated.
      this._end = this._in.position();
      this._value_push(T_TIMESTAMP);
      return;
    } else if (!is_digit(peekChar)) {
      throw new Error(
        "Timestamp DATE must be followed by numeric terminator or additional TIME digits."
      );
    }

    ch = this._readPastNDigits(2); // read past hour.
    if (ch !== CH_CL) {
      // :
      throw new Error("Timestamp time(hr:min) requires format of 00:00");
    }

    ch = this._readPastNDigits(2); // read past minutes.
    if (ch === CH_CL) {
      // read seconds
      ch = this._readPastNDigits(2);
      if (ch === CH_DT) {
        // read fractional seconds
        if (!is_digit(this._read())) {
          throw new Error(
            "W3C timestamp spec requires atleast one digit after decimal point."
          );
        }
        while (is_digit((ch = this._read()))) {}
      }
    }

    if (ch === CH_Z) {
      if (!isNumericTerminator(this._peek())) {
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
    if (!isNumericTerminator(ch)) {
      throw new Error("Improperly formatted timestamp.");
    }
    this._end = this._in.position();
    this._value_push(T_TIMESTAMP);
  }

  private _read_symbol(): void {
    let ch;
    this._start = this._in.position() - 1;
    for (;;) {
      ch = this._read();
      if (!is_letter_or_digit(ch)) {
        break;
      }
    }
    this._unread(ch);
    this._end = this._in.position();
    this._value_push(T_IDENTIFIER);
  }

  private _read_operator_symbol(): void {
    let ch;
    this._start = this._in.position();
    for (;;) {
      ch = this._read();
      if (!is_operator_char(ch)) {
        break;
      }
    }
    this._end = this._in.position() - 1;
    this._unread(ch);
    this._value_push(T_OPERATOR);
  }

  private _read_string1(): void {
    this._read_string_helper(CH_SQ, false);
    this._end = this._in.position() - 1;
    this._value_push(T_STRING1);
  }

  private _read_string2(): void {
    this._read_string_helper(CH_DOUBLE_QUOTE, false);
    this._end = this._in.position() - 1;
    this._value_push(T_STRING2);
  }

  private _read_string3(recognizeComments?): void {
    if (recognizeComments === undefined) {
      recognizeComments = true;
    }
    let ch: number;
    this._unread(this._peek(""));
    // read sequence of triple quoted strings
    for (
      this._start = this._in.position() + 3;
      this._peek("'''") !== ERROR;
      this._in.unread(this._read_after_whitespace(recognizeComments))
    ) {
      for (let i: number = 0; i < 3; i++) {
        this._read();
      }
      // in tripleQuotes, index content of current triple quoted string,
      // looking for more triple quotes
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
        // read single quoted strings until we see the triple quoted terminator
        // if it's not a triple quote, it's just content
      }
      // mark the possible end of the series of triplequotes, set the end of the value, it will reset later if further triple quotes are found after indexing through whitespace.
      this._end = this._in.position();
      // Index past the triple quote.
      for (let i: number = 0; i < 3; i++) {
        this._read();
      }
      // the reader will parse values from the source so that it can be roundtripped.
      // eat next whitespace sequence until first non white char found.
    }
    this._value_push(T_STRING3);
  }

  private verifyTriple(entryIndex: number): boolean {
    return (
      this._in.valueAt(entryIndex) === CH_SQ &&
      this._in.valueAt(entryIndex + 1) === CH_SQ &&
      this._in.valueAt(entryIndex + 2) === CH_SQ
    );
  }

  private _read_string_helper = function (
    terminator: number,
    allow_new_line: boolean
  ): void {
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

  private _read_string_escape_sequence(): void {
    // just reads the code points in the escape
    let ch = this._read();
    switch (ch) {
      case ESC_0: // =  48, //  values['0']  = 0;       //    \u0000  \0  alert NUL
      case ESC_a: // =  97, //  values['a']  = 7;       //    \u0007  \a  alert BEL
      case ESC_b: // =  98, //  values['b']  = 8;       //    \u0008  \b  backspace BS
      case ESC_t: // = 116, //  values['t']  = 9;       //    \u0009  \t  horizontal tab HT
      case ESC_nl: // = 110, //  values['n']  = '\n';    //    \ u000A  \ n  linefeed LF
      case ESC_ff: // = 102, //  values['f']  = 0x0c;    //    \u000C  \f  form feed FF
      case ESC_cr: // = 114, //  values['r']  = '\r';    //    \ u000D  \ r  carriage return CR
      case ESC_v: // = 118, //  values['v']  = 0x0b;    //    \u000B  \v  vertical tab VT
      case ESC_dq: // =  34, //  values['"']  = '"';     //    \u0022  \"  double quote
      case ESC_sq: // =  39, //  values['\''] = '\'';    //    \u0027  \'  single quote
      case ESC_qm: // =  63, //  values['?']  = '?';     //    \u003F  \?  question mark
      case ESC_bs: // =  92, //  values['\\'] = '\\';    //    \u005C  \\  backslash
      case ESC_fs: // =  47, //  values['/']  = '/';     //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
      case ESC_nl2: // =  10, //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
        break;
      case ESC_nl3: // =  13, //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
        ch = this._read();
        if (ch != ESC_nl2) {
          this._unread(ch);
        }
        break;
      case ESC_x: // = CH_x, //  values['x'] = ESCAPE_HEX; //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
        ch = this._read_N_hexdigits(2);
        this._unread(ch);
        break;
      case ESC_u: // = 117, //  values['u'] = ESCAPE_LITTLE_U; //    any  \ uHHHH  4-digit hexadecimal unicode character
        ch = this._read_N_hexdigits(4);
        this._unread(ch);
        break;
      case ESC_U: // = 85, //  values['U'] = ESCAPE_BIG_U; //    any  \ UHHHHHHHH  8-digit hexa
        ch = this._read_N_hexdigits(8);
        this._unread(ch);
        break;
      default:
        this._error("unexpected character: " + ch + " after escape slash");
    }
  }

  private _test_string_as_annotation(op): boolean {
    // we could use op to validate the string type (1 or 3) vs the op - meh
    let s, ch, is_ann;
    const t = this._value_pop();
    if (t != T_STRING1 && t != T_STRING3) {
      this._error("expecting quoted symbol here");
    }
    s = this.get_value_as_string(t);
    ch = this._read_after_whitespace(true);
    if (ch == CH_CL && this._peek() == CH_CL) {
      this._read(); // consume the colon character
      this._ann.push(new SymbolToken(s));
      is_ann = true;
    } else {
      this._unread(ch);
      this._value_push(t); // put the value back on the stack
      is_ann = false;
    }
    return is_ann;
  }

  private _read_clob_string2(): void {
    let t;
    this._read_string2();
    t = this._value_pop();
    if (t != T_STRING2) {
      this._error("string expected");
    }
    this._value_push(T_CLOB2);
    this._ops.unshift(this._read_close_double_brace);
  }

  private _read_clob_string3(): void {
    let t;
    this._read_string3(false);
    t = this._value_pop();
    if (t != T_STRING3) {
      this._error("string expected");
    }
    this._value_push(T_CLOB3);
    this._ops.unshift(this._read_close_double_brace);
  }

  private _read_blob(): void {
    let ch,
      base64_chars = 0,
      trailers = 0;
    this._start = this._in.position(); // is this going to be accurate where is the start being set that leads to this value?
    while (true) {
      ch = this._read();
      if (is_base64_char(ch)) {
        base64_chars++;
        this._end = this._in.position();
      } else if (!is_whitespace(ch)) {
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

  private _read_close_double_brace(): void {
    const ch = this._read_after_whitespace(false);
    if (ch != CH_CC || this._read() != CH_CC) {
      this._error("expected '}}'");
    }
  }

  private isHighSurrogate(ch: number): boolean {
    return ch >= 0xd800 && ch <= 0xdbff;
  }

  private isLowSurrogate(ch: number): boolean {
    return ch >= 0xdc00 && ch <= 0xdfff;
  }

  private indexWhiteSpace(index: number, acceptComments: boolean): number {
    let ch: number = this._in.valueAt(index);
    if (!acceptComments) {
      for (; is_whitespace(ch); ch = this._in.valueAt(index++)) {}
    } else {
      for (
        ;
        is_whitespace(ch) || ch === CH_FORWARD_SLASH;
        ch = this._in.valueAt(index++)
      ) {
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

  private indexToNewLine(index: number) {
    let ch: number = this._in.valueAt(index);
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

  private indexToCloseComment(index: number): number {
    while (
      this._in.valueAt(index) !== CH_AS &&
      this._in.valueAt(index + 1) !== CH_FORWARD_SLASH
    ) {
      index++;
    }
    return index;
  }

  private _skip_triple_quote_gap(
    entryIndex: number,
    end: number,
    acceptComments: boolean
  ): number {
    let tempIndex: number = entryIndex + 3;
    tempIndex = this.indexWhiteSpace(tempIndex, acceptComments);
    if (tempIndex + 2 <= end && this.verifyTriple(tempIndex)) {
      // index === ' index + 1 === ' index + 2 === ' and not at the end of the value
      return tempIndex + 4; // indexes us past the triple quote we just found
    } else {
      return tempIndex + 1;
    }
  }

  private readClobEscapes(ii: number, end: number): number {
    // actually converts the escape sequence to a byte
    let ch;
    if (ii + 1 >= end) {
      throw new Error("invalid escape sequence");
    }
    ch = this._in.valueAt(ii + 1);
    this._esc_len = 1;
    switch (ch) {
      case ESC_0:
        return 0; // =  48, //  values['0']  = 0;       //    \0  alert NUL
      case ESC_a:
        return 7; // =  97, //  values['a']  = 7;       //    \a  alert BEL
      case ESC_b:
        return 8; // =  98, //  values['b']  = 8;       //    \b  backspace BS
      case ESC_t:
        return 9; // = 116, //  values['t']  = 9;       //    \t  horizontal tab HT
      case ESC_nl:
        return 10; // = 110, //  values['n']  = '\n';    //    \ n  linefeed LF
      case ESC_ff:
        return 12; // = 102, //  values['f']  = 0x0c;    //    \f  form feed FF
      case ESC_cr:
        return 13; // = 114, //  values['r']  = '\r';    //    \ r  carriage return CR
      case ESC_v:
        return 11; // = 118, //  values['v']  = 0x0b;    //    \v  vertical tab VT
      case ESC_dq:
        return 34; // =  34, //  values['"']  = '"';     //    \"  double quote
      case ESC_sq:
        return 39; // =  39, //  values['\''] = '\'';    //    \'  single quote
      case ESC_qm:
        return 63; // =  63, //  values['?']  = '?';     //    \\?  question mark
      case ESC_bs:
        return 92; // =  92, //  values['\\'] = '\\';    //    \\  backslash
      case ESC_fs:
        return 47; // =  47, //  values['/']  = '/';     //    \/  forward slash nothing  \NL  escaped NL expands to nothing
      case ESC_nl2:
        return -1; // =  10, //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
      case ESC_nl3: // =  13, //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
        if (ii + 2 < end && this._in.valueAt(ii + 2) == CH_NL) {
          this._esc_len = 2;
        }
        return ESCAPED_NEWLINE;
      case ESC_x: // = CH_x, //  values['x'] = ESCAPE_HEX; //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
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

  private _read_escape_sequence(ii: number, end: number): number {
    // actually converts the escape sequence to the code point
    let ch;
    if (ii + 1 >= end) {
      throw new Error("Invalid escape sequence.");
    }
    ch = this._in.valueAt(ii + 1);
    this._esc_len = 1;
    switch (ch) {
      case ESC_0:
        return 0; // =  48, //  values['0']  = 0;       //    \u0000  \0  alert NUL
      case ESC_a:
        return 7; // =  97, //  values['a']  = 7;       //    \u0007  \a  alert BEL
      case ESC_b:
        return 8; // =  98, //  values['b']  = 8;       //    \u0008  \b  backspace BS
      case ESC_t:
        return 9; // = 116, //  values['t']  = 9;       //    \u0009  \t  horizontal tab HT
      case ESC_nl:
        return 10; // = 110, //  values['n']  = '\n';    //    \ u000A  \ n  linefeed LF
      case ESC_ff:
        return 12; // = 102, //  values['f']  = 0x0c;    //    \u000C  \f  form feed FF
      case ESC_cr:
        return 13; // = 114, //  values['r']  = '\r';    //    \ u000D  \ r  carriage return CR
      case ESC_v:
        return 11; // = 118, //  values['v']  = 0x0b;    //    \u000B  \v  vertical tab VT
      case ESC_dq:
        return 34; // =  34, //  values['"']  = '"';     //    \u0022  \"  double quote
      case ESC_sq:
        return 39; // =  39, //  values['\''] = '\'';    //    \u0027  \'  single quote
      case ESC_qm:
        return 63; // =  63, //  values['?']  = '?';     //    \u003F  \?  question mark
      case ESC_bs:
        return 92; // =  92, //  values['\\'] = '\\';    //    \u005C  \\  backslash
      case ESC_fs:
        return 47; // =  47, //  values['/']  = '/';     //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
      case ESC_nl2:
        return -1; // =  10, //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
      case ESC_nl3: // =  13, //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
        if (ii + 2 < end && this._in.valueAt(ii + 2) == CH_NL) {
          this._esc_len = 2;
        }
        return ESCAPED_NEWLINE;
      case ESC_x: // = CH_x, //  values['x'] = ESCAPE_HEX; //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
        if (ii + 3 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 4);
        this._esc_len = 3;
        break;
      case ESC_u: // = 117, //  values['u'] = ESCAPE_LITTLE_U; //    any  \ uHHHH  4-digit hexadecimal unicode character
        if (ii + 5 >= end) {
          throw new Error("invalid escape sequence");
        }
        ch = this._get_N_hexdigits(ii + 2, ii + 6);
        this._esc_len = 5;
        break;
      case ESC_U: // = 85, //  values['U'] = ESCAPE_BIG_U; //    any  \ UHHHHHHHH  8-digit hexa
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

  private _get_N_hexdigits(ii: number, end: number): number {
    let ch,
      v = 0;
    while (ii < end) {
      ch = this._in.valueAt(ii);
      v = v * 16 + get_hex_value(ch);
      ii++;
    }
    return v;
  }

  private _value_push(t): void {
    if (this._value_type !== ERROR) {
      this._error("unexpected double push of value type!");
    }
    this._value_type = t;
  }

  private _value_pop() {
    const t = this._value_type;
    this._value_type = ERROR;
    return t;
  }

  private _run() {
    let op;
    while (this._ops.length > 0 && this._value_type === ERROR) {
      op = this._ops.shift();
      op.call(this);
    }
  }

  private _read(): number {
    const ch = this._in.next();
    return ch;
  }

  private _read_skipping_comments() {
    let ch = this._read();
    if (ch == CH_FORWARD_SLASH) {
      ch = this._read();
      if (ch == CH_FORWARD_SLASH) {
        this._read_to_newline();
        ch = WHITESPACE_COMMENT1;
      } else if (ch == CH_AS) {
        this._read_to_close_comment();
        ch = WHITESPACE_COMMENT2;
      } else {
        this._unread(ch);
        ch = CH_FORWARD_SLASH;
      }
    }
    return ch;
  }

  private _read_to_newline() {
    let ch;
    for (;;) {
      ch = this._read(); // since this only happens in _read, after reading a double forward slash we can go straight to the input Span
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

  private _read_to_close_comment() {
    let ch;
    for (;;) {
      ch = this._read(); // since this only happens in _read, after reading a forward slash asterisk we can go straight to the input Span
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

  private _unread(ch: number) {
    this._in.unread(ch);
  }

  private _read_after_whitespace(recognize_comments: boolean) {
    let ch;
    if (recognize_comments) {
      ch = this._read_skipping_comments();
      while (is_whitespace(ch)) {
        ch = this._read_skipping_comments();
      }
    } else {
      ch = this._read();
      while (is_whitespace(ch)) {
        ch = this._read();
      }
    }
    return ch;
  }

  // peek does not work with the different types of string input.
  private _peek(expected?: string): number {
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
      ch = this._peek(); // if we did match we need to read the next character
    } else {
      this._unread(ch); // if we didn't match we've read an extra character
      ch = ERROR;
    }
    while (ii > 0) {
      // unread whatever matched
      ii--;
      this._unread(expected.charCodeAt(ii));
    }
    return ch;
  }

  private _peek_4_digits(ch1: number): number {
    let ii: number,
      ch: number,
      is_digits = true;
    const chars: number[] = [];
    if (!is_digit(ch1)) {
      return ERROR;
    }
    for (ii = 0; ii < 3; ii++) {
      ch = this._read();
      chars.push(ch);
      if (!is_digit(ch)) {
        is_digits = false;
        break;
      }
    }
    ch = is_digits && ii == 3 ? this._peek() : ERROR;
    while (chars.length > 0) {
      this._unread(chars.pop()!);
    }
    return ch;
  }

  private _read_required_digits(ch: number): number {
    if (!is_digit(ch)) {
      return ERROR;
    }
    for (;;) {
      ch = this._read();
      if (!is_digit(ch)) {
        break;
      }
    }
    return ch;
  }

  private _read_optional_digits(ch: number): number {
    while (is_digit(ch)) {
      ch = this._read();
    }
    return ch;
  }

  private _readNDigits(n: number): number {
    let ch: number;
    if (n <= 0) {
      throw new Error("Cannot read a lack of or negative number of digits.");
    }
    while (n--) {
      if (!is_digit((ch = this._read()))) {
        throw new Error("Expected digit, got: " + String.fromCharCode(ch));
      }
    }
    return ch!;
  }

  private _readPastNDigits(n: number): number {
    // This is clearly bugged it reads n + 1 digits.
    this._readNDigits(n);
    return this._read();
  }

  private _read_required_hex_digits(ch: number): number {
    if (!is_hex_digit(ch)) {
      return ERROR;
    }
    for (;;) {
      ch = this._read();
      if (!is_hex_digit(ch)) {
        break;
      }
    }
    return ch;
  }

  private _read_N_hexdigits(n: number): number {
    let ch,
      ii = 0;
    while (ii < n) {
      ch = this._read();
      if (!is_hex_digit(ch)) {
        this._error("" + n + " digits required " + ii + " found");
        return ERROR;
      }
      ii++;
    }
    return ch;
  }

  /**
   * Attempts to parse a SID from a string such as "$5".  Specifically:
   * if s starts with '$', and the remaining chars are in the range ['0'..'9']
   * and can be parsed as an int, returns the int value;  otherwise returns NaN.
   */
  private _parseSymbolId(s: string): number {
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

  private _error(msg: string): void {
    this._ops.unshift(this._done_with_error);
    this._error_msg = msg;
  }
}
