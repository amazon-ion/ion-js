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

// IonParserTextRaw
//
// Handles parsing the Ion text values from a text span.
// Returns on any value with value type. The _start and _end
// members are set for scalar types.

import * as IonText from "./IonText";

import { IonType } from "./IonType";
import { IonTypes } from "./IonTypes";
import { Span } from "./IonSpan";

const EOF = -1;  // EOF is end of container, distinct from undefined which is value has been consumed
const ERROR           = -2;
const T_NULL          =  1;
const T_BOOL          =  2;
const T_INT           =  3;
const T_HEXINT        =  4;
const T_FLOAT         =  5;
const T_FLOAT_SPECIAL =  6;
const T_DECIMAL       =  7;
const T_TIMESTAMP     =  8;
const T_IDENTIFIER    =  9;
const T_OPERATOR      = 10;
const T_STRING1       = 11;
const T_STRING2       = 12;
const T_STRING3       = 13;
const T_CLOB2         = 14;
const T_CLOB3         = 15;
const T_BLOB          = 16;
const T_SEXP          = 17;
const T_LIST          = 18;
const T_STRUCT        = 19;
const T_SEXP_CLOSE    = 20;
const T_LIST_CLOSE    = 21;
const T_STRUCT_CLOSE  = 22;

const CH_CR =  13; // '\r'
const CH_NL =  10; // '\n'
const CH_BS =  92; // '\\'
const CH_FORWARD_SLASH = "/".charCodeAt(0); // 47
const CH_AS =  42; // '*'
const CH_SQ =  39; // '\'' 
const CH_DQ =  34; // '\"' 
const CH_CM =  44; // ';'
const CH_OP =  40; // '('
const CH_CP =  41; // ')'
const CH_OC = 123; // '{'
const CH_CC = 125; // '}' 
const CH_OS =  91; // '['
const CH_CS =  93; // ']'
const CH_CL =  58; // ':'
const CH_DT =  46; // '.'
const CH_EQ =  61; // '='
const CH_PS =  43; // '+'
const CH_MS =  45; // '-'
const CH_0  =  48; // '0'
const CH_D  =  68; // 'D'
const CH_E  =  69; // 'E'
const CH_F  =  70; // 'F'
const CH_T  =  84; // 'T'
const CH_X  =  88; // 'X'
const CH_Z  =  90; // 'Z'
const CH_d  = 100; // 'd'
const CH_e  = 101; // 'e'
const CH_f  = 102; // 'f'
const CH_i  = 105; // 'i'
const CH_n  = 110; // 'n'
const CH_x  = 120; // 'x'

const ESC_0 =     48; //  values['0'] = 0;        //    \u0000  \0  alert NUL
const ESC_a =     97; //  values['a'] = 7;        //    \u0007  \a  alert BEL
const ESC_b =     98; //  values['b'] = 8;        //    \u0008  \b  backspace BS
const ESC_t =    116; //  values['t'] = 9;        //    \u0009  \t  horizontal tab HT
const ESC_nl =   110; //  values['n'] = '\n';     //    \ u000A  \ n  linefeed LF
const ESC_ff =   102; //  values['f'] = 0x0c;     //    \u000C  \f  form feed FF
const ESC_cr =   114; //  values['r'] = '\r';     //    \ u000D  \ r  carriage return CR
const ESC_v =    118; //  values['v'] = 0x0b;     //    \u000B  \v  vertical tab VT
const ESC_dq = CH_DQ; //  values['"'] = '"';      //    \u0022  \"  double quote
const ESC_sq = CH_SQ; //  values['\''] = '\'';    //    \u0027  \'  single quote
const ESC_qm =    63; //  values['?'] = '?';      //    \u003F  \?  question mark
const ESC_bs =    92; //  values['\\'] = '\\';    //    \u005C  \\  backslash
const ESC_fs =    47; //  values['/'] = '/';      //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
const ESC_nl2 =   10; //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
const ESC_nl3 =   13; //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
const ESC_x =   CH_x; //  values['x'] = ESCAPE_HEX;      //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
const ESC_u =    117; //  values['u'] = ESCAPE_LITTLE_U; //    any  \ uHHHH  4-digit hexadecimal unicode character
const ESC_U =     85; //  values['U'] = ESCAPE_BIG_U;    //    any  \ UHHHHHHHH  8-digit hexadecimal unicode character

const empty_array: any[] = [];

const INF = [ CH_i, CH_n, CH_f ];

function get_ion_type(t) : IonType {
  switch(t) {
    case EOF:             return undefined;
    case ERROR:           return undefined;
    case T_NULL:          return IonTypes.NULL;
    case T_BOOL:          return IonTypes.BOOL;
    case T_INT:           return IonTypes.INT;
    case T_HEXINT:        return IonTypes.INT;
    case T_FLOAT:         return IonTypes.FLOAT;
    case T_FLOAT_SPECIAL: return IonTypes.FLOAT;
    case T_DECIMAL:       return IonTypes.DECIMAL;
    case T_TIMESTAMP:     return IonTypes.TIMESTAMP;
    case T_IDENTIFIER:    return IonTypes.SYMBOL;
    case T_OPERATOR:      return IonTypes.SYMBOL;
    case T_STRING1:       return IonTypes.STRING;
    case T_STRING2:       return IonTypes.STRING;
    case T_STRING3:       return IonTypes.STRING;
    case T_CLOB2:         return IonTypes.CLOB;
    case T_CLOB3:         return IonTypes.CLOB;
    case T_BLOB:          return IonTypes.BLOB;
    case T_SEXP:          return IonTypes.SEXP;
    case T_LIST:          return IonTypes.LIST;
    case T_STRUCT:        return IonTypes.STRUCT;
    case T_SEXP_CLOSE:    return undefined;
    case T_LIST_CLOSE:    return undefined;
    case T_STRUCT_CLOSE:  return undefined;
    default:              return undefined;
  }
}

function get_keyword_type(str: string) : number {
  if (str === "null")  return T_NULL;
  if (str === "true")  return T_BOOL;
  if (str === "false") return T_BOOL;
  if (str === "nan")   return T_FLOAT_SPECIAL;
  if (str === "+inf")  return T_FLOAT_SPECIAL;
  if (str === "-inf")  return T_FLOAT_SPECIAL;
  return undefined;
}

function get_type_from_name(str: string) : number {
  if (str === "null")      return T_NULL;
  if (str === "bool")      return T_BOOL;
  if (str === "int")       return T_INT;
  if (str === "float")     return T_FLOAT;
  if (str === "decimal")   return T_DECIMAL;
  if (str === "timestamp") return T_TIMESTAMP;
  if (str === "symbol")    return T_IDENTIFIER;
  if (str === "string")    return T_STRING1;
  if (str === "clob")      return T_CLOB2;
  if (str === "blob")      return T_BLOB;
  if (str === "sexp")      return T_SEXP;
  if (str === "list")      return T_LIST;
  if (str === "struct")    return T_STRUCT;
  return undefined;
}

function is_keyword(str: string) : boolean {
  return (get_keyword_type(str) != undefined);
}

function get_hex_value(ch: number) : number {
  switch(ch) { // quick and dirty - we need a better impl TODO 
    case  48: return  0; // '0'
    case  49: return  1; // '1'
    case  50: return  2; // '2'
    case  51: return  3; // '3'
    case  52: return  4; // '4'
    case  53: return  5; // '5'
    case  54: return  6; // '6'
    case  55: return  7; // '7'
    case  56: return  8; // '8'
    case  57: return  9; // '9'
    case  97: return 10; // 'a'
    case  98: return 11; // 'b'
    case  99: return 12; // 'c'
    case 100: return 13; // 'd'
    case 101: return 14; // 'e'
    case 102: return 15; // 'f'
    case  65: return 10; // 'A'
    case  66: return 11; // 'B'
    case  67: return 12; // 'C'
    case  68: return 13; // 'D'
    case  69: return 14; // 'E'
    case  70: return 15; // 'F'
  }
  throw new Error("unexpected bad hex digit in checked data");
}

function is_valid_base64_length(char_length: number, trailer_length: number) : boolean {
  if (trailer_length > 2) return false;
  if (((char_length + trailer_length) & 0x3) != 0) return false;
  return true;
}

function is_valid_string_char(ch: number, allow_new_line: boolean ) : boolean {
  if (ch == CH_CR) return allow_new_line;
  if (ch == CH_NL) return allow_new_line;
  if (IonText.is_whitespace(ch)) return true;
  if (ch < 32) return false;
  return true;
}

export class ParserTextRaw {
  private _in: Span;
  private _ops: any[];
  private _value_type: any;
  private _value: any[];
  private _start: number;
  private _end: number;
  private _esc_len: number;
  private _curr: any;
  private _ann: any[];
  private _msg: string;
  private _error_msg: string;
  private _fieldname: string;

  private readonly _read_value_helper_helpers: any;

  constructor(source: Span) {
    this._in         = source; // should be a span
    this._ops        = [ this._read_datagram_values ];
    this._value_type = ERROR;
    this._value      = [];     // value gets a new array since it will modify it
    this._start      = -1;
    this._end        = -1;
    this._esc_len    = -1;
    this._curr       = EOF;
    this._ann        = empty_array; // ann can use a static empty array, a new one will be created only if there are some annotations to  put into it - the exception case
    this._msg        = "";

    let helpers = {
    //  -1 : this._read_value_helper_EOF,    //      == EOF
        40 : this._read_value_helper_paren,  // '('  == CH_OP
        91 : this._read_value_helper_square, // '['  == CH_OS
       123 : this._read_value_helper_curly,  // '{'  == CH_OC
        43 : this._read_value_helper_plus,   // '+'  == CH_PS // we'll have to patch these two back in after 
        45 : this._read_value_helper_minus,  // '-'  == CH_MS // we apply the operator characters fn
        39 : this._read_value_helper_single, // '\'' == CH_SQ
        34 : this._read_value_helper_double, // '\"' == CH_DQ
    };
    let set_helper = function(str: string, fn ) {
      var i = str.length, ch;
      while (i > 0) {
        i--;
        ch = str.charCodeAt(i);
        helpers[ch] = fn;
      }
    }

    set_helper("0123456789", this._read_value_helper_digit);
    set_helper("_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", this._read_value_helper_letter);
    set_helper("!#%&*+-./;<=>?@^`|~", this._read_value_helper_operator);
    // patch (back) in the two special to the operator functions
    helpers[CH_PS] = this._read_value_helper_plus; // '+'
    helpers[CH_MS] = this._read_value_helper_minus; // '-'

    this._read_value_helper_helpers = helpers;
  }

  fieldName() : string {
    return this._fieldname;
  }

  annotations() : string[] {
    return this._ann;
  }

  private _read_datagram_values() {
    var ch = this._peek();
    if (ch == EOF) {
      this._value_push( EOF );
    }
    else {
      // these get put in the ops list in reverse order
      this._ops.unshift( this._read_datagram_values );
      this._ops.unshift( this._read_value );
    }
  }

  private _read_sexp_values() {
    var ch = this._read_after_whitespace(true);
    if (ch == CH_CP) {
      this._value_push( T_SEXP_CLOSE );
    }
    else {
      this._unread(ch);
      this._ops.unshift( this._read_sexp_values );
      this._ops.unshift( this._read_sexp_value );
    }
  }

  private _read_list_values() {
    var ch = this._read_after_whitespace(true);
    if (ch == CH_CS) {
      // degenerate case of an empty list
      this._value_push( T_LIST_CLOSE );
    }
    else {
      // otherwise we read a value and continue
      this._unread(ch);
      this._ops.unshift( this._read_list_comma );
      this._ops.unshift( this._read_value );
    }
  }

  private _read_struct_values() {
    var op = this._done_with_error, 
        ch = this._read_after_whitespace(true);

    switch (ch) {
      case CH_SQ :
        op = this._read_string1;
        if (this._peek("\'\'") != ERROR) {
          op = this._read_string3;
        }
        break;
      case CH_DQ :
        op = this._read_string2;
        break;
      case CH_CC :
        this._value_push( T_STRUCT_CLOSE );
        return;
      default : 
        if (IonText.is_letter(ch)) {
          op = this._read_symbol;
        }
        break;
    }
    if (op === this._done_with_error) {
      this._error("expected field name (or close struct '}') not found");
    }
    else {
      op.call(this);            // this puts a value on the stack, which we don't return to the caller directly
      this._load_field_name();  // this will consume that value
      // so we skip over the expected colon, read the actual value, and try for another value
      ch = this._read_after_whitespace(true);
      if (ch != CH_CL) this._error( "expected ':'" );
      this._ops.unshift( this._read_struct_comma )
      this._ops.unshift( this._read_value );
    }
  }

  private _read_list_comma() : void {
    var ch = this._read_after_whitespace(true);
    if (ch == CH_CM) {
      ch = this._read_after_whitespace(true);
      if (ch == CH_CS) {
        this._value_push( T_LIST_CLOSE );
      }
      else {
        this._unread(ch);
        this._ops.unshift( this._read_list_comma );
        this._ops.unshift( this._read_value );
      }
    }
    else if (ch == CH_CS) {
      this._value_push( T_LIST_CLOSE );
    }
    else {
      this._error("expected ',' or ']'");
    }
  }

  private _read_struct_comma() : void {
    var ch = this._read_after_whitespace(true);
    if (ch == CH_CM) {
      ch = this._read_after_whitespace(true);
      if (ch == CH_CC) {
        this._value_push(T_STRUCT_CLOSE );
      }
      else {
        this._unread(ch);
        this._ops.unshift( this._read_struct_values );
      }
    }
    else if (ch == CH_CC) {
      this._value_push( T_STRUCT_CLOSE );
    }
    else {
      this._error("expected ',' or '}'");
    }
  }

  private _load_field_name() {
    var v = this._value_pop(),
        s = this.get_value_as_string(v);
    switch (v) {
    case T_IDENTIFIER:
      if (is_keyword(s)) {
        this._error( "can't use '"+s+"' as a fieldname without quotes");
        break;
      }
    case T_STRING1:
    case T_STRING2:
    case T_STRING3:
      this._fieldname = s;
      break;
    default:
      this._error( "invalid fieldname" );
      break;
    }
  }

  private _read_value() : void {
    this._read_value_helper(false, this._read_value);
  }

  private _read_sexp_value() {
    this._read_value_helper(true, this._read_sexp_value);
  }

  private _read_value_helper( accept_operator_symbols, calling_op ) {
    var fn, ch1 = this._read_after_whitespace(true)
    if (ch1 == EOF) {  // since we can't index into our object with a value of -1
      this._read_value_helper_EOF(ch1, accept_operator_symbols, calling_op);
    }
    else {
      fn = this._read_value_helper_helpers[ ch1 ];
      if (fn != undefined) {
        fn.call(this, ch1, accept_operator_symbols, calling_op);
      }
      else {
        this._error( "unexpected character '" + IonText.asAscii( ch1 )+"'" );
      }
    }
  }

  // helper for the read_value_helper function
  private _read_value_helper_EOF( ch1, accept_operator_symbols, calling_op ) {
    this._ops.unshift( this._done );
  }

  private _read_value_helper_paren( ch1, accept_operator_symbols, calling_op ) {
    this._value_push( T_SEXP );
    this._ops.unshift( this._read_sexp_values );
  }

  private _read_value_helper_square( ch1, accept_operator_symbols, calling_op ) {
    this._value_push( T_LIST );
    this._ops.unshift( this._read_list_values );
  }

  private _read_value_helper_curly( ch1, accept_operator_symbols, calling_op ) {
    var ch3, ch2 = this._read();
    if (ch2 == CH_OC) {
      ch3 = this._read_after_whitespace(false);
      if ( ch3 == CH_SQ ) {
        this._ops.unshift( this._read_clob_string3 );
      }
      else if( ch3 == CH_DQ ) {
        this._ops.unshift( this._read_clob_string2 );
      }
      else {
        this._unread( ch3 );
        this._ops.unshift( this._read_blob );
      }
    }
    else { 
      this._unread( ch2 );
      this._value_push( T_STRUCT );
      this._ops.unshift( this._read_struct_values ) 
    }
  }

  private _read_value_helper_plus( ch1, accept_operator_symbols: boolean, calling_op ) {
    var ch2 = this._peek("inf");
    this._unread(ch1); // in any case we'll leave this character for the next function to use
    if (IonText.is_numeric_terminator(ch2)) {
      this._ops.unshift( this._read_plus_inf );
    }
    else if (accept_operator_symbols) {
          this._ops.unshift( this._read_operator_symbol );
    }
    else {
      this._error("unexpected '+'");
    }
  }

  private _read_value_helper_minus = function( ch1, accept_operator_symbols: boolean, calling_op ) {
    var op = undefined,
        ch2 = this._peek();
    if (ch2 == CH_i) {
      ch2 = this._peek("inf");
      if (IonText.is_numeric_terminator(ch2)) {
        op =  this._read_minus_inf;
      }
      else if (accept_operator_symbols) {
        op = this._read_operator_symbol;
      }
    }
    else if (IonText.is_digit(ch2)) {
      op = this._read_number;
    }
    else if (accept_operator_symbols) {
      op = this._read_operator_symbol;
    }
    if (op != undefined) {
      this._ops.unshift( op );
      this._unread(ch1);
    }
    else {
      this._error("operator symbols are not valid outside of sexp's");
    }
  }

  private _read_value_helper_digit( ch1, accept_operator_symbols: boolean, calling_op ) {
    var ch2 = this._peek_4_digits(ch1);
    this._unread(ch1);
    if (ch2 == CH_T || ch2 == CH_MS) {
      this._ops.unshift( this._read_timestamp );
    }
    else {
      this._ops.unshift( this._read_number );
    }
  }

  private _read_value_helper_single( ch1, accept_operator_symbols: boolean, calling_op ) {
    var op;
    if (this._peek("\'\'") != ERROR) {
      op = this._read_string3;
    }
    else {
      op = this._read_string1;
    }
    op.call(this);
    if (this._test_string_as_annotation(op)) {
      // this was an annoation, so we need to try again for the actual value
      this._ops.unshift( calling_op ); 
    }
  }

  private _read_value_helper_double( ch1, accept_operator_symbols: boolean, calling_op ) {
    this._ops.unshift( this._read_string2 );
  }

  private _read_value_helper_letter( ch1, accept_operator_symbols: boolean, calling_op ) {
    this._read_symbol();
    if (this._test_symbol_as_annotation()) {
      // this was an annoation, so we need to try again for the actual value
      this._ops.unshift( calling_op );
    }
  }

  private _read_value_helper_operator( ch1, accept_operator_symbols: boolean, calling_op ) {
    if (accept_operator_symbols) {
      this._unread(ch1)
      this._ops.unshift( this._read_operator_symbol );
    }
    else {
       this._error( "unexpected operator character" );
    }
  }

  private _done() {
    this._value_push( EOF );
  }

  private _done_with_error() {
    this._value_push( ERROR );
    throw new Error(this._error_msg);
  }

  private _read_number() {
    var ch, t;
    this._start = this._in.position();
    ch = this._read();
    if (ch == CH_MS) ch = this._read();
    if (ch == CH_0) {
      ch = this._peek();
      if (ch == CH_x || ch == CH_X) {
        this._read_hex_int();
        return;
      }
      if (IonText.is_digit(ch)) {
        this._error("leading zero's are not allowed");
      }
      ch = CH_0;
    }
    t = T_INT;
    ch = this._read_required_digits(ch);
    if (ch == CH_DT) {
      t = T_DECIMAL;
      ch = this._read_optional_digits(this._read());
    }
    if (!IonText.is_numeric_terminator(ch)) {
      if (ch == CH_d || ch == CH_D) {
        ch = this._read_exponent();
      }
      else if (ch == CH_e || ch == CH_E || ch == CH_f || ch == CH_F ) {
        t = T_FLOAT;
        ch = this._read_exponent();
      }
    }
    if (!IonText.is_numeric_terminator(ch)) {
      this._error( "invalid character after number" );
    }
    else {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push( t );
    }
  }

  private _read_hex_int() : void {
    var ch = this._read(); // re-read the 'x' we peeked at earlier
    if (ch == CH_x || ch == CH_X) {
      ch = this._read(); // read the first hex digits
      ch = this._read_required_hex_digits(ch);
    }
    if (IonText.is_numeric_terminator(ch)) {
      this._unread(ch);
      this._value_push( T_HEXINT );
    }
    else {
      this._error( "invalid character after number" );
    }
  }

  private _read_exponent() : number {
    var ch = this._read();
    if (ch == CH_MS || ch == CH_PS) {
      ch = this._read();
    }
    ch = this._read_required_digits(ch);
    return ch;
  }
 
  private _read_plus_inf() {
    if (this._read() == CH_PS) {
     this._read_inf_helper();
    }
    else {
      this._error( "expected +inf" );
    }
  }

  private _read_minus_inf() {
    if (this._read() == CH_MS) {
     this._read_inf_helper();
    }
    else {
      this._error( "expected -inf" );
    }
  }

  private _read_inf_helper() {
    var ii, ch;
    for (ii=0; ii<3; ii++) {
      ch = this._read();
      if (ch != INF[ii]) {
        this._error( "expected 'inf'" );
        return;
      }
    }
    if (IonText.is_numeric_terminator( this._peek() )) {
      this._end = this._in.position() - 1;
      this._start = this._end - 4; // -4 to include the sign we've already read
      this._value_push( T_FLOAT_SPECIAL ); 
    }
    else {
      this._error( "invalid numeric terminator after 'inf'" );
    }
  }

  private _read_timestamp() : void {
    var ch;
    this._start = this._in.position();
    ch = this._read_N_digits( 4 );      // read year
    if (ch == CH_T) {
      ch = this._read();  // this is needed as we disallow yyyyThh:mm - TODO really !?
    }
    else if (ch == CH_MS) {
      ch = this._read_N_digits( 2 );    // read month
      if (ch == CH_MS) {
        ch = this._read_N_digits( 2 );  // read day
      }
      ch = this._read_optional_time(ch);  // no time unless you at least include month - TODO really !?
    }
    ch = this._read_optional_time_offset(ch); // we only allow an offset 
    if (IonText.is_numeric_terminator(ch)) {
      this._unread(ch);
      this._end = this._in.position();
      this._value_push( T_TIMESTAMP );
    }
    else {
      this._error( "invalid character after timestamp" );
    }
  }

  private _read_optional_time(ch: number) : number {
    if (ch != CH_T) return ch; // no 'T", no time
    ch = this._read();
    if (!IonText.is_numeric_terminator(ch)) {
      // then it has to be, at least hours and minutes
      ch = this._read_hours_and_minutes(ch);
      if (ch == CH_CL) {
        ch = this._read_N_digits( 2 );         // seconds
        if (ch == CH_DT) {
          ch = this._read();
          ch = this._read_required_digits(ch); // fractional seconds (apparently required)
        }
      }
    }
    return ch;
  }

  private _read_optional_time_offset(ch: number) : number {
    if (ch == CH_MS || ch == CH_PS) {
      ch = this._read();
      ch = this._read_hours_and_minutes( ch ); // of the time offset
    }
    else if (ch == CH_Z) {
      ch =  this._read();
    }
    return ch;
  }

  private _read_symbol() : void {
    var ch;
    this._start = this._in.position() - 1;  
    for(;;) {
      ch = this._read();
      if (!IonText.is_letter_or_digit(ch)) break;
    }
    this._end = this._in.position() - 1;
    this._unread(ch);
    this._value_push( T_IDENTIFIER );
  }

  private _read_operator_symbol() : void {
    var ch;
    for(;;) {
      ch = this._read();
      if (!IonText.is_operator_char(ch))  break;
    }
    this._end = this._in.position() - 1;
    this._unread(ch);
    this._value_push( T_OPERATOR );
  }

  private _read_string1() : void {
    this._read_string_helper(CH_SQ, false);
    this._end = this._in.position() - 1;
    this._value_push( T_STRING1 );
  }

  private _read_string2() : void {
    this._read_string_helper(CH_DQ, false);
    this._end = this._in.position() - 1;
    this._value_push( T_STRING2 );
  }

  private _read_string3() : void {
    var ch;
    if (this._read() != CH_SQ || this._read() != CH_SQ) {
      this._error( "expected triple quote" );
    }
    this._start = this._in.position();
    for(;;) {  // read sequence of triple quoted strings
      for(;;) { // read single quoted strings until we see the triple quoted terminator
        this._read_string_helper(CH_SQ, true);
        // if it's not a triple quote, it's just content
        if (this._read() == CH_SQ && this._read() == CH_SQ) {
          this._end = this._in.position() - 3;
          break;
        }
      }
      ch = this._read_after_whitespace(true);
      if (ch != CH_SQ) {
        this._unread(ch);
        break;
      }
      if (this._peek("\'\'") == ERROR) {
        break;
      }
      this._read(); // consume the 2 pending single quotes
      this._read();
    }
    this._value_push( T_STRING3 );
  }

  private _read_string_helper = function(terminator: number, allow_new_line: boolean) : void {
    var ch;
    this._start = this._in.position();
    for (;;) {
      ch = this._read();
      if (ch == CH_BS) {
        this._read_string_escape_sequence();
      }
      else if (ch == terminator) {
        break;
      }
      else if (!is_valid_string_char(ch, allow_new_line)) {
        this._error( "invalid character "+ch+" in string" );
        break;
      }
    }
  }

  private _read_string_escape_sequence() : void {
    // just reads the code points in the escape
    var ch = this._read();
    switch(ch) {
      case ESC_0:   // =  48, //  values['0']  = 0;       //    \u0000  \0  alert NUL
      case ESC_a:   // =  97, //  values['a']  = 7;       //    \u0007  \a  alert BEL
      case ESC_b:   // =  98, //  values['b']  = 8;       //    \u0008  \b  backspace BS
      case ESC_t:   // = 116, //  values['t']  = 9;       //    \u0009  \t  horizontal tab HT
      case ESC_nl:  // = 110, //  values['n']  = '\n';    //    \ u000A  \ n  linefeed LF
      case ESC_ff:  // = 102, //  values['f']  = 0x0c;    //    \u000C  \f  form feed FF
      case ESC_cr:  // = 114, //  values['r']  = '\r';    //    \ u000D  \ r  carriage return CR
      case ESC_v:   // = 118, //  values['v']  = 0x0b;    //    \u000B  \v  vertical tab VT
      case ESC_dq:  // =  34, //  values['"']  = '"';     //    \u0022  \"  double quote
      case ESC_sq:  // =  39, //  values['\''] = '\'';    //    \u0027  \'  single quote
      case ESC_qm:  // =  63, //  values['?']  = '?';     //    \u003F  \?  question mark
      case ESC_bs:  // =  92, //  values['\\'] = '\\';    //    \u005C  \\  backslash
      case ESC_fs:  // =  47, //  values['/']  = '/';     //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
      case ESC_nl2: // =  10, //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
        break;
      case ESC_nl3: // =  13, //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
        ch = this._read();
        if (ch != ESC_nl2) this._unread(ch);
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
        this._error("unexpected character after escape slash");
    }
  }

  private _test_string_as_annotation( op ) : boolean {  // we could use op to validate the string type (1 or 3) vs the op - meh
    var s, ch, is_ann, t = this._value_pop();
    if (t != T_STRING1 && t != T_STRING3) this._error("expecting quoted symbol here");
    s = this.get_value_as_string(t);
    ch = this._read_after_whitespace(true);
    if (ch == CH_CL && this._peek() == CH_CL) {
      this._read(); // consume the colon character
      this._ann.push(s);
      is_ann = true;
    }
    else {
      this._unread(ch);
      this._value_push(t); // put the value back on the stack
      is_ann = false;
    }
    return is_ann;
  }

  private _test_symbol_as_annotation() : boolean {
    var s, ii, ch, kwt, 
        is_ann = true,
        t = this._value_pop();
    if (t != T_IDENTIFIER) this._error("expecting symbol here");
    s = this.get_value_as_string(t);
    kwt = get_keyword_type(s);
    ch = this._read_after_whitespace(true);
    if (ch == CH_CL && this._peek() == CH_CL) {
      if (kwt != undefined) this._error("the keyword '"+s+"' can't be used as an annotation without quotes");
      this._read(); // consume the colon character
      this._ann.push(s);
      is_ann = true;
    }
    else {
      // if this is a keyword, we'll just keep it's type, otherwise switch back to the generic "identifier"
      if (kwt == undefined) kwt = T_IDENTIFIER;
      this._unread(ch);
      is_ann = false;
      if (kwt === T_NULL) {
        ch = this._peek();
        if (ch === CH_DT) {
          this._read(); // consume the dot
          ch = this._read();
          if (IonText.is_letter(ch) !== true) {
            this._error("expected type name after 'null.'");
            return undefined;
          }
          this._read_symbol();
          if (this._value_pop() != T_IDENTIFIER) {
            this._error("expected type name after 'null.'");
            return undefined;
          }
          s = this.get_value_as_string(T_IDENTIFIER);
          kwt = get_type_from_name(s);
        }
        this._start = -1;
        this._end = -1;
      }
      this._value_push(kwt); // put the value back on the stack
    }
    return is_ann;
  }

  private _read_clob_string2() : void {
    var t;
    this._read_string2();
    t = this._value_pop();
    if (t != T_STRING2) this._error("string expected");
    this._value_push(T_CLOB2);
    this._ops.unshift( this._read_close_double_brace );
  }

  private _read_clob_string3() : void {
    var t;
    this._read_string3();
    t = this._value_pop();
    if (t != T_STRING3) this._error("string expected");
    this._value_push(T_CLOB2);
    this._ops.unshift( this._read_close_double_brace );
  }

  private _read_blob() : void {
    var ch, base64_chars = 0, trailers = 0;
    for (;;) {
      ch = this._read()
      if (IonText.is_base64_char(ch)) {
        base64_chars++;
      }
      else if (!IonText.is_whitespace(ch)) {
        break;
      }
    }
    while (ch == CH_EQ) {
      trailers++
      ch = this._read_after_whitespace(false);
    }
    if (ch != CH_CC || this._read() != CH_CC) {
      this._error("invalid blob");
    }
    else {
      if (!is_valid_base64_length(base64_chars, trailers)) {
        this._error( "invalid base64 value" );
      }
      else {
        this._end = this._in.position() - 1;
        this._value_push( T_BLOB );
      }
    }
  }

  private _read_comma() : void {
    var ch = this._read_after_whitespace(true);
    if (ch != CH_CM) this._error( "expected ','" );
  }

  private _read_close_double_brace() : void {
    var ch = this._read_after_whitespace(true);
    if (ch != CH_CC || this._read() != CH_CC) {
      this._error( "expected '}}'" );
    }
  }

  isNull() : boolean {
    if (this._value_type === T_NULL) return true;
    if (this._start == -1) return true;
    return false;
  }

  numberValue() : number {
    var n, s = this.get_value_as_string(this._value_type);
    switch (this._value_type) {
      case T_INT:
      case T_HEXINT:
      case T_FLOAT:
        n = Number(s);
        break;
      case T_FLOAT_SPECIAL:
        if (s == "+inf")      n = Number.POSITIVE_INFINITY;
        else if (s == "-inf") n = Number.NEGATIVE_INFINITY;
        else if (s == "nan")  n = Number.NaN;
        else throw new Error("can't convert to number"); 
        break;
      default:
        throw new Error("can't convert to number");
    }
    return n;
  }

  booleanValue() : boolean {
    if (this._value_type !== T_BOOL) {
      return undefined;
    }
    let s: string = this.get_value_as_string(T_BOOL);
    if (s == "true") {
      return true;
    } else if (s == "false") {
      return false;
    } else {
      return undefined;
    }
  }

  get_value_as_string(t: number) : string {
    var ii, ch, s = "";
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
      case T_BLOB:
        for (ii=this._start; ii<this._end; ii++) {
          s += String.fromCharCode(this._in.valueAt(ii));
        }
        break;
      case T_STRING1:
      case T_STRING2:
      case T_CLOB2:
        for (ii=this._start; ii<this._end; ii++) {
          ch = this._in.valueAt(ii);
          if (ch == CH_BS) {
            s += this._read_escape_sequence(ii, this._end);
            ii += this._esc_len;
          } 
          else {
            s += String.fromCharCode(ch);
          }
        }
        break;
      case T_CLOB3:
      case T_STRING3:
        for (ii=this._start; ii<this._end; ii++) {
          ch = this._in.valueAt(ii);
          if (ch == CH_SQ) {
            if (ii+2<this._end && this._in.valueAt(ii+1) == CH_SQ && this._in.valueAt(ii+1) == CH_SQ) {
              this._skip_triple_quote_gap(ii, this._end);
            }
            else {
              s += "\'";
            }
          }
          else if (ch == CH_BS) {
            s += this._read_escape_sequence(ii, this._end);
            ii += this._esc_len;
          }
          else {
            s += String.fromCharCode(ch);
          }
        }
        break;
      default:
        this._error("can't get this value as a string");
        break;
    }
    return s;
  }

  private _skip_triple_quote_gap(ii: number, end: number) : number {
    ii += 2; // skip the two quotes we peeked ahead to see
    while (ii<end) {
      let ch: number = this._in.valueAt(ii);
      if (IonText.is_whitespace(ch)) {
        // do nothing
      }
      else if (ch == CH_SQ) {
        ii+= 3;
        if (ii > end || this._in.valueAt(ii-2) != CH_SQ || this._in.valueAt(ii-1) != CH_SQ) {
          return ii;
        }
      }
      else {
        this._error("unexpected character");
      }
    }
    return ii;
  }

  private _read_escape_sequence(ii: number, end: number) : number {
    // actually converts the escape sequence to the code point
    var ch;
    if (ii+1 >= end) {
      this._error("invalid escape sequence");
      return;
    }
    ch = this._in.valueAt(ii+1);
    this._esc_len = 1;
    switch(ch) {
      case ESC_0:   return 0; // =  48, //  values['0']  = 0;       //    \u0000  \0  alert NUL
      case ESC_a:   return 7; // =  97, //  values['a']  = 7;       //    \u0007  \a  alert BEL
      case ESC_b:   return 8; // =  98, //  values['b']  = 8;       //    \u0008  \b  backspace BS
      case ESC_t:   return 9; // = 116, //  values['t']  = 9;       //    \u0009  \t  horizontal tab HT
      case ESC_nl:  return 10; // = 110, //  values['n']  = '\n';    //    \ u000A  \ n  linefeed LF
      case ESC_ff:  return 12;  // = 102, //  values['f']  = 0x0c;    //    \u000C  \f  form feed FF
      case ESC_cr:  return 13; // = 114, //  values['r']  = '\r';    //    \ u000D  \ r  carriage return CR
      case ESC_v:   return 11; // = 118, //  values['v']  = 0x0b;    //    \u000B  \v  vertical tab VT
      case ESC_dq:  return 34; // =  34, //  values['"']  = '"';     //    \u0022  \"  double quote
      case ESC_sq:  return 39; // =  39, //  values['\''] = '\'';    //    \u0027  \'  single quote
      case ESC_qm:  return 63; // =  63, //  values['?']  = '?';     //    \u003F  \?  question mark
      case ESC_bs:  return 92; // =  92, //  values['\\'] = '\\';    //    \u005C  \\  backslash
      case ESC_fs:  return 47; // =  47, //  values['/']  = '/';     //    \u002F  \/  forward slash nothing  \NL  escaped NL expands to nothing
      case ESC_nl2: return -1; // =  10, //  values['\n'] = ESCAPE_REMOVES_NEWLINE;  // slash-new line the new line eater
      case ESC_nl3: // =  13, //  values['\r'] = ESCAPE_REMOVES_NEWLINE2;  // slash-new line the new line eater
        if (ii+3 < end && this._in.valueAt(ii+3) == CH_NL) {
          this._esc_len = 2;
        }
        return IonText.ESCAPED_NEWLINE;
      case ESC_x: // = CH_x, //  values['x'] = ESCAPE_HEX; //    any  \xHH  2-digit hexadecimal unicode character equivalent to \ u00HH
        if (ii+3 >= end) {
          this._error("invalid escape sequence");
          return;
        }
        ch = this._get_N_hexdigits(ii+2, ii+4);
        this._esc_len = 3;
        break;
      case ESC_u: // = 117, //  values['u'] = ESCAPE_LITTLE_U; //    any  \ uHHHH  4-digit hexadecimal unicode character
        if (ii+5 >= end) {
          this._error("invalid escape sequence");
          return;
        }
        ch = this._get_N_hexdigits(ii+2, ii+6);
        this._esc_len = 5;
        break;
      case ESC_U: // = 85, //  values['U'] = ESCAPE_BIG_U; //    any  \ UHHHHHHHH  8-digit hexa
        if (ii+9 >= end) {
          this._error("invalid escape sequence");
          return;
        }
        ch = this._get_N_hexdigits(ii+2, ii+10);
        this._esc_len = 9;
        break;
      default:
        this._error("unexpected character after escape slash");
    }
    return;
  }

  private _get_N_hexdigits(ii: number, end: number) : number {
    var ch, v = 0;
    while (ii < end) {
      ch = this._in.valueAt(ii);
      v = v*16 + get_hex_value(ch);
      ii++;
    }
    return v;
  }

  private _value_push(t) : void {
    if (this._value_type !== ERROR) {
      this._error( "unexpected double push of value type!" );
    }
    this._value_type = t;
  }

  private _value_pop() {
    var t = this._value_type;
    this._value_type = ERROR;
    return t;
  }

  next() {
    var t;
    if (this._value_type === ERROR) {
      this._run();
    }
    this._curr = this._value_pop();
    if (this._curr == ERROR) {
      this._value.push(ERROR);
      t = undefined;
    }
    else {
      //t = get_ion_type(this._curr);
      t = this._curr;
    }
    return t;
  }

  private get_ion_type(t) {
    return get_ion_type(t);
  }

  private _run() {
    var op;
    while (this._ops.length > 0 && (this._value_type === ERROR)) {
      op = this._ops.shift();
      op.call(this);
    }
  }

  private _read() : number {
    var ch = this._in.next();
    return ch;
  }

  private _read_skipping_comments() {
    var ch = this._read();
    if (ch == CH_FORWARD_SLASH) {
      ch = this._read();
      if (ch == CH_FORWARD_SLASH) {
        this._read_to_newline();
        ch = IonText.WHITESPACE_COMMENT1;
      }
      else if (ch == CH_AS) {
        this._read_to_close_comment();
        ch = IonText.WHITESPACE_COMMENT2;
      }
      else {
        this._unread(ch);
        ch = CH_FORWARD_SLASH;
      }
    }
    return ch;
  }

  private _read_to_newline() {
    var ch;
    for (;;) {
      ch = this._read(); // since this only happens in _read, after reading a double forward slash we can go straight to the input Span
      if (ch == EOF) break;
      if (ch == CH_NL) break;
      if (ch == CH_CR) {
        ch = this._read();
        if (ch != CH_NL) this._unread(ch);
        break;
      }
    }
  }

  private _read_to_close_comment() {
    var ch;
    for (;;) {
      ch = this._read(); // since this only happens in _read, after reading a forward slash asterisk we can go straight to the input Span
      if (ch == EOF) break;
      if (ch == CH_AS) {
        ch = this._read();
        if (ch == CH_FORWARD_SLASH) break;
      }
    }
  }

  private _unread(ch: number) {
    this._in.unread(ch);
  }

  private _read_after_whitespace(recognize_comments: boolean) {
    var ch;
    if (recognize_comments) {
      ch = this._read_skipping_comments();
      while (IonText.is_whitespace(ch)) {
        ch = this._read_skipping_comments();
      }
    }
    else {
      ch = this._read();
      while (IonText.is_whitespace(ch)) {
        ch = this._read();
      }
    }
    return ch;
  }

  private _peek(expected?: string) : number {
    var ch, ii=0;
    if (expected === undefined || expected.length<1) { 
      ch = this._read();
      this._unread(ch);
      return ch;
    }
    while (ii<expected.length) { 
      ch = this._read();
      if (ch != expected.charCodeAt(ii)) break;
      ii++;
    }
    if (ii == expected.length) {
      ch = this._peek(); // if we did match we need to read the next character
    }
    else {
      this._unread(ch); // if we didn't match we've read an extra character
      ch = ERROR;
    }
    while (ii > 0) { // unread whatever matched
      ii--;
      this._unread(expected.charCodeAt(ii));
    }
    return ch;
  }

  private _peek_after_whitespace(recognize_comments: boolean) : number {
    var ch = this._read_after_whitespace(recognize_comments);
    this._unread(ch);
    return ch;
  }

  private _peek_4_digits(ch1: number) : number {
    var ii, ch, is_digits = true, chars = [];
    if (!IonText.is_digit(ch1)) return ERROR;
    for (ii=0; ii<3; ii++) {
      ch = this._read();
      chars.push(ch);
      if (!IonText.is_digit(ch)) {
        is_digits = false;
        break;
      }
    }
    ch = (is_digits && ii == 3) ? this._peek() : ERROR ;
    while (chars.length > 0) {
      this._unread(chars.pop());
    }
    return ch;
  }

  private _read_required_digits(ch: number) : number {
    if (!IonText.is_digit(ch)) return ERROR;
    for (;;) {
      ch = this._read()
      if (!IonText.is_digit(ch)) break;
    }
    return ch;
  }

  private _read_optional_digits(ch: number) : number {
    while (IonText.is_digit(ch)) {
      ch = this._read()
    }
    return ch;
  }

  private _read_N_digits(n: number) : number {
    var ch, ii=0;
    while ( ii < n ) {
      ch = this._read();
      if (!IonText.is_digit(ch)) {
        this._error( ""+n+" digits required "+ii+" found" );
        return ERROR;
      }
      ii++;
    }
    return this._read();
  }

  private _read_required_hex_digits(ch: number) : number {
    if (!IonText.is_hex_digit(ch)) return ERROR;
    for (;;) {
      ch = this._read()
      if (!IonText.is_hex_digit(ch)) break;
    }
    return ch;
  }

  private _read_N_hexdigits(n: number) : number {
    var ch, ii=0;
    while ( ii < n ) {
      ch = this._read();
      if (!IonText.is_hex_digit(ch)) {
        this._error( ""+n+" digits required "+ii+" found" );
        return ERROR;
      }
      ii++;
    }
    return ch;
  }

  private _read_hours_and_minutes(ch: number) : number {
    if (!IonText.is_digit(ch)) return ERROR;
    ch = this._read_N_digits( 1 );   // rest of hours
    if (ch == CH_CL) {
      ch = this._read_N_digits( 2 ); // minutes
    }
    else {
      ch = ERROR; // if there are hours you have to include minutes
    }
    return ch;
  }

  private _check_for_keywords() : void {
    var len, s, v = this._value_pop();
    if (v == T_IDENTIFIER) {
      len = this._end - this._start;
      if (len >= 3 && len <= 5) {
        s = this.get_value_as_string(v);
        v = get_keyword_type(s);
      }
    }
    this._value_push(v);
  }

  private _error(msg: string) : void {
    this._ops.unshift(this._done_with_error);
    this._error_msg = msg;
  }
}
