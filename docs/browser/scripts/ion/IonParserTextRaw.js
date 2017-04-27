define(["require", "exports", "./IonText", "./IonTypes"], function (require, exports, IonText, IonTypes_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    const CH_DOUBLE_QUOTE = "\"".charCodeAt(0);
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
    const empty_array = [];
    const INF = [CH_i, CH_n, CH_f];
    function get_ion_type(t) {
        switch (t) {
            case EOF: return undefined;
            case ERROR: return undefined;
            case T_NULL: return IonTypes_1.IonTypes.NULL;
            case T_BOOL: return IonTypes_1.IonTypes.BOOL;
            case T_INT: return IonTypes_1.IonTypes.INT;
            case T_HEXINT: return IonTypes_1.IonTypes.INT;
            case T_FLOAT: return IonTypes_1.IonTypes.FLOAT;
            case T_FLOAT_SPECIAL: return IonTypes_1.IonTypes.FLOAT;
            case T_DECIMAL: return IonTypes_1.IonTypes.DECIMAL;
            case T_TIMESTAMP: return IonTypes_1.IonTypes.TIMESTAMP;
            case T_IDENTIFIER: return IonTypes_1.IonTypes.SYMBOL;
            case T_OPERATOR: return IonTypes_1.IonTypes.SYMBOL;
            case T_STRING1: return IonTypes_1.IonTypes.STRING;
            case T_STRING2: return IonTypes_1.IonTypes.STRING;
            case T_STRING3: return IonTypes_1.IonTypes.STRING;
            case T_CLOB2: return IonTypes_1.IonTypes.CLOB;
            case T_CLOB3: return IonTypes_1.IonTypes.CLOB;
            case T_BLOB: return IonTypes_1.IonTypes.BLOB;
            case T_SEXP: return IonTypes_1.IonTypes.SEXP;
            case T_LIST: return IonTypes_1.IonTypes.LIST;
            case T_STRUCT: return IonTypes_1.IonTypes.STRUCT;
            default: return undefined;
        }
    }
    exports.get_ion_type = get_ion_type;
    function get_keyword_type(str) {
        if (str === "null")
            return T_NULL;
        if (str === "true")
            return T_BOOL;
        if (str === "false")
            return T_BOOL;
        if (str === "nan")
            return T_FLOAT_SPECIAL;
        if (str === "+inf")
            return T_FLOAT_SPECIAL;
        if (str === "-inf")
            return T_FLOAT_SPECIAL;
        return undefined;
    }
    function get_type_from_name(str) {
        if (str === "null")
            return T_NULL;
        if (str === "bool")
            return T_BOOL;
        if (str === "int")
            return T_INT;
        if (str === "float")
            return T_FLOAT;
        if (str === "decimal")
            return T_DECIMAL;
        if (str === "timestamp")
            return T_TIMESTAMP;
        if (str === "symbol")
            return T_IDENTIFIER;
        if (str === "string")
            return T_STRING1;
        if (str === "clob")
            return T_CLOB2;
        if (str === "blob")
            return T_BLOB;
        if (str === "sexp")
            return T_SEXP;
        if (str === "list")
            return T_LIST;
        if (str === "struct")
            return T_STRUCT;
        return undefined;
    }
    function is_keyword(str) {
        return (get_keyword_type(str) != undefined);
    }
    function get_hex_value(ch) {
        switch (ch) {
            case 48: return 0;
            case 49: return 1;
            case 50: return 2;
            case 51: return 3;
            case 52: return 4;
            case 53: return 5;
            case 54: return 6;
            case 55: return 7;
            case 56: return 8;
            case 57: return 9;
            case 97: return 10;
            case 98: return 11;
            case 99: return 12;
            case 100: return 13;
            case 101: return 14;
            case 102: return 15;
            case 65: return 10;
            case 66: return 11;
            case 67: return 12;
            case 68: return 13;
            case 69: return 14;
            case 70: return 15;
        }
        throw new Error("unexpected bad hex digit in checked data");
    }
    function is_valid_base64_length(char_length, trailer_length) {
        if (trailer_length > 2)
            return false;
        if (((char_length + trailer_length) & 0x3) != 0)
            return false;
        return true;
    }
    function is_valid_string_char(ch, allow_new_line) {
        if (ch == CH_CR)
            return allow_new_line;
        if (ch == CH_NL)
            return allow_new_line;
        if (IonText.is_whitespace(ch))
            return true;
        if (ch < 32)
            return false;
        return true;
    }
    class ParserTextRaw {
        constructor(source) {
            this._read_value_helper_minus = function (ch1, accept_operator_symbols, calling_op) {
                var op = undefined, ch2 = this._peek();
                if (ch2 == CH_i) {
                    ch2 = this._peek("inf");
                    if (IonText.is_numeric_terminator(ch2)) {
                        op = this._read_minus_inf;
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
                    this._ops.unshift(op);
                    this._unread(ch1);
                }
                else {
                    this._error("operator symbols are not valid outside of sexp's");
                }
            };
            this._read_string_helper = function (terminator, allow_new_line) {
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
                        this._error("invalid character " + ch + " in string");
                        break;
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
            this._ann = empty_array;
            this._msg = "";
            let helpers = {
                40: this._read_value_helper_paren,
                91: this._read_value_helper_square,
                123: this._read_value_helper_curly,
                43: this._read_value_helper_plus,
                45: this._read_value_helper_minus,
                39: this._read_value_helper_single,
                34: this._read_value_helper_double,
            };
            let set_helper = function (str, fn) {
                var i = str.length, ch;
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
        annotations() {
            return this._ann;
        }
        _read_datagram_values() {
            var ch = this._peek();
            if (ch == EOF) {
                this._value_push(EOF);
            }
            else {
                this._ops.unshift(this._read_datagram_values);
                this._ops.unshift(this._read_value);
            }
        }
        _read_sexp_values() {
            var ch = this._read_after_whitespace(true);
            if (ch == CH_CP) {
                this._value_push(EOF);
            }
            else {
                this._unread(ch);
                this._ops.unshift(this._read_sexp_values);
                this._ops.unshift(this._read_sexp_value);
            }
        }
        _read_list_values() {
            var ch = this._read_after_whitespace(true);
            if (ch == CH_CS) {
                this._value_push(EOF);
            }
            else {
                this._unread(ch);
                this._ops.unshift(this._read_list_comma);
                this._ops.unshift(this._read_value);
            }
        }
        _read_struct_values() {
            var op = this._done_with_error, ch = this._read_after_whitespace(true);
            switch (ch) {
                case CH_SQ:
                    op = this._read_string1;
                    if (this._peek("\'\'") != ERROR) {
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
                    if (IonText.is_letter(ch)) {
                        op = this._read_symbol;
                    }
                    break;
            }
            if (op === this._done_with_error) {
                this._error("expected field name (or close struct '}') not found");
            }
            else {
                op.call(this);
                this._load_field_name();
                ch = this._read_after_whitespace(true);
                if (ch != CH_CL)
                    this._error("expected ':'");
                this._ops.unshift(this._read_struct_comma);
                this._ops.unshift(this._read_value);
            }
        }
        _read_list_comma() {
            var ch = this._read_after_whitespace(true);
            if (ch == CH_CM) {
                ch = this._read_after_whitespace(true);
                if (ch == CH_CS) {
                    this._value_push(EOF);
                }
                else {
                    this._unread(ch);
                    this._ops.unshift(this._read_list_comma);
                    this._ops.unshift(this._read_value);
                }
            }
            else if (ch == CH_CS) {
                this._value_push(EOF);
            }
            else {
                this._error("expected ',' or ']'");
            }
        }
        _read_struct_comma() {
            var ch = this._read_after_whitespace(true);
            if (ch == CH_CM) {
                ch = this._read_after_whitespace(true);
                if (ch == CH_CC) {
                    this._value_push(EOF);
                }
                else {
                    this._unread(ch);
                    this._ops.unshift(this._read_struct_values);
                }
            }
            else if (ch == CH_CC) {
                this._value_push(EOF);
            }
            else {
                this._error("expected ',' or '}'");
            }
        }
        _load_field_name() {
            var v = this._value_pop(), s = this.get_value_as_string(v);
            switch (v) {
                case T_IDENTIFIER:
                    if (is_keyword(s)) {
                        this._error("can't use '" + s + "' as a fieldname without quotes");
                        break;
                    }
                case T_STRING1:
                case T_STRING2:
                case T_STRING3:
                    this._fieldname = s;
                    break;
                default:
                    this._error("invalid fieldname");
                    break;
            }
        }
        _read_value() {
            this._read_value_helper(false, this._read_value);
        }
        _read_sexp_value() {
            this._read_value_helper(true, this._read_sexp_value);
        }
        _read_value_helper(accept_operator_symbols, calling_op) {
            let ch = this._read_after_whitespace(true);
            if (ch == EOF) {
                this._read_value_helper_EOF(ch, accept_operator_symbols, calling_op);
            }
            else {
                let fn = this._read_value_helper_helpers[ch];
                if (fn != undefined) {
                    fn.call(this, ch, accept_operator_symbols, calling_op);
                }
                else {
                    this._error("unexpected character '" + IonText.asAscii(ch) + "'");
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
            var ch3, ch2 = this._read();
            if (ch2 == CH_LEFT_CURLY) {
                ch3 = this._read_after_whitespace(false);
                if (ch3 == CH_SQ) {
                    this._ops.unshift(this._read_clob_string3);
                }
                else if (ch3 == CH_DOUBLE_QUOTE) {
                    this._ops.unshift(this._read_clob_string2);
                }
                else {
                    this._unread(ch3);
                    this._ops.unshift(this._read_blob);
                }
            }
            else {
                this._unread(ch2);
                this._value_push(T_STRUCT);
                this._ops.unshift(this._read_struct_values);
            }
        }
        _read_value_helper_plus(ch1, accept_operator_symbols, calling_op) {
            var ch2 = this._peek("inf");
            this._unread(ch1);
            if (IonText.is_numeric_terminator(ch2)) {
                this._ops.unshift(this._read_plus_inf);
            }
            else if (accept_operator_symbols) {
                this._ops.unshift(this._read_operator_symbol);
            }
            else {
                this._error("unexpected '+'");
            }
        }
        _read_value_helper_digit(ch1, accept_operator_symbols, calling_op) {
            var ch2 = this._peek_4_digits(ch1);
            this._unread(ch1);
            if (ch2 == CH_T || ch2 == CH_MS) {
                this._ops.unshift(this._read_timestamp);
            }
            else {
                this._ops.unshift(this._read_number);
            }
        }
        _read_value_helper_single(ch1, accept_operator_symbols, calling_op) {
            var op;
            if (this._peek("\'\'") != ERROR) {
                op = this._read_string3;
            }
            else {
                op = this._read_string1;
            }
            op.call(this);
            if (this._test_string_as_annotation(op)) {
                this._ops.unshift(calling_op);
            }
        }
        _read_value_helper_double(ch1, accept_operator_symbols, calling_op) {
            this._ops.unshift(this._read_string2);
        }
        _read_value_helper_letter(ch1, accept_operator_symbols, calling_op) {
            this._read_symbol();
            if (this._test_symbol_as_annotation()) {
                this._ops.unshift(calling_op);
            }
        }
        _read_value_helper_operator(ch1, accept_operator_symbols, calling_op) {
            if (accept_operator_symbols) {
                this._unread(ch1);
                this._ops.unshift(this._read_operator_symbol);
            }
            else {
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
            var ch, t;
            this._start = this._in.position();
            ch = this._read();
            if (ch == CH_MS)
                ch = this._read();
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
                else if (ch == CH_e || ch == CH_E || ch == CH_f || ch == CH_F) {
                    t = T_FLOAT;
                    ch = this._read_exponent();
                }
            }
            if (!IonText.is_numeric_terminator(ch)) {
                this._error("invalid character after number");
            }
            else {
                this._unread(ch);
                this._end = this._in.position();
                this._value_push(t);
            }
        }
        _read_hex_int() {
            var ch = this._read();
            if (ch == CH_x || ch == CH_X) {
                ch = this._read();
                ch = this._read_required_hex_digits(ch);
            }
            if (IonText.is_numeric_terminator(ch)) {
                this._unread(ch);
                this._value_push(T_HEXINT);
            }
            else {
                this._error("invalid character after number");
            }
        }
        _read_exponent() {
            var ch = this._read();
            if (ch == CH_MS || ch == CH_PS) {
                ch = this._read();
            }
            ch = this._read_required_digits(ch);
            return ch;
        }
        _read_plus_inf() {
            if (this._read() == CH_PS) {
                this._read_inf_helper();
            }
            else {
                this._error("expected +inf");
            }
        }
        _read_minus_inf() {
            if (this._read() == CH_MS) {
                this._read_inf_helper();
            }
            else {
                this._error("expected -inf");
            }
        }
        _read_inf_helper() {
            var ii, ch;
            for (ii = 0; ii < 3; ii++) {
                ch = this._read();
                if (ch != INF[ii]) {
                    this._error("expected 'inf'");
                    return;
                }
            }
            if (IonText.is_numeric_terminator(this._peek())) {
                this._end = this._in.position() - 1;
                this._start = this._end - 4;
                this._value_push(T_FLOAT_SPECIAL);
            }
            else {
                this._error("invalid numeric terminator after 'inf'");
            }
        }
        _read_timestamp() {
            var ch;
            this._start = this._in.position();
            ch = this._read_N_digits(4);
            if (ch == CH_T) {
                ch = this._read();
            }
            else if (ch == CH_MS) {
                ch = this._read_N_digits(2);
                if (ch == CH_MS) {
                    ch = this._read_N_digits(2);
                }
                ch = this._read_optional_time(ch);
            }
            ch = this._read_optional_time_offset(ch);
            if (IonText.is_numeric_terminator(ch)) {
                this._unread(ch);
                this._end = this._in.position();
                this._value_push(T_TIMESTAMP);
            }
            else {
                this._error("invalid character after timestamp");
            }
        }
        _read_optional_time(ch) {
            if (ch != CH_T)
                return ch;
            ch = this._read();
            if (!IonText.is_numeric_terminator(ch)) {
                ch = this._read_hours_and_minutes(ch);
                if (ch == CH_CL) {
                    ch = this._read_N_digits(2);
                    if (ch == CH_DT) {
                        ch = this._read();
                        ch = this._read_required_digits(ch);
                    }
                }
            }
            return ch;
        }
        _read_optional_time_offset(ch) {
            if (ch == CH_MS || ch == CH_PS) {
                ch = this._read();
                ch = this._read_hours_and_minutes(ch);
            }
            else if (ch == CH_Z) {
                ch = this._read();
            }
            return ch;
        }
        _read_symbol() {
            var ch;
            this._start = this._in.position() - 1;
            for (;;) {
                ch = this._read();
                if (!IonText.is_letter_or_digit(ch))
                    break;
            }
            this._end = this._in.position() - 1;
            this._unread(ch);
            this._value_push(T_IDENTIFIER);
        }
        _read_operator_symbol() {
            var ch;
            for (;;) {
                ch = this._read();
                if (!IonText.is_operator_char(ch))
                    break;
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
        _read_string3() {
            var ch;
            if (this._read() != CH_SQ || this._read() != CH_SQ) {
                this._error("expected triple quote");
            }
            this._start = this._in.position();
            for (;;) {
                for (;;) {
                    this._read_string_helper(CH_SQ, true);
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
                this._read();
                this._read();
            }
            this._value_push(T_STRING3);
        }
        _read_string_escape_sequence() {
            var ch = this._read();
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
                    if (ch != ESC_nl2)
                        this._unread(ch);
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
                    this._error("unexpected character after escape slash");
            }
        }
        _test_string_as_annotation(op) {
            var s, ch, is_ann, t = this._value_pop();
            if (t != T_STRING1 && t != T_STRING3)
                this._error("expecting quoted symbol here");
            s = this.get_value_as_string(t);
            ch = this._read_after_whitespace(true);
            if (ch == CH_CL && this._peek() == CH_CL) {
                this._read();
                this._ann.push(s);
                is_ann = true;
            }
            else {
                this._unread(ch);
                this._value_push(t);
                is_ann = false;
            }
            return is_ann;
        }
        _test_symbol_as_annotation() {
            var s, ii, ch, kwt, is_ann = true, t = this._value_pop();
            if (t != T_IDENTIFIER)
                this._error("expecting symbol here");
            s = this.get_value_as_string(t);
            kwt = get_keyword_type(s);
            ch = this._read_after_whitespace(true);
            if (ch == CH_CL && this._peek() == CH_CL) {
                if (kwt != undefined)
                    this._error("the keyword '" + s + "' can't be used as an annotation without quotes");
                this._read();
                this._ann.push(s);
                is_ann = true;
            }
            else {
                if (kwt == undefined)
                    kwt = T_IDENTIFIER;
                this._unread(ch);
                is_ann = false;
                if (kwt === T_NULL) {
                    this._value_null = true;
                    ch = this._peek();
                    if (ch === CH_DT) {
                        this._read();
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
                this._value_push(kwt);
            }
            return is_ann;
        }
        _read_clob_string2() {
            var t;
            this._read_string2();
            t = this._value_pop();
            if (t != T_STRING2)
                this._error("string expected");
            this._value_push(T_CLOB2);
            this._ops.unshift(this._read_close_double_brace);
        }
        _read_clob_string3() {
            var t;
            this._read_string3();
            t = this._value_pop();
            if (t != T_STRING3)
                this._error("string expected");
            this._value_push(T_CLOB2);
            this._ops.unshift(this._read_close_double_brace);
        }
        _read_blob() {
            var ch, base64_chars = 0, trailers = 0;
            for (;;) {
                ch = this._read();
                if (IonText.is_base64_char(ch)) {
                    base64_chars++;
                }
                else if (!IonText.is_whitespace(ch)) {
                    break;
                }
            }
            while (ch == CH_EQ) {
                trailers++;
                ch = this._read_after_whitespace(false);
            }
            if (ch != CH_CC || this._read() != CH_CC) {
                this._error("invalid blob");
            }
            else {
                if (!is_valid_base64_length(base64_chars, trailers)) {
                    this._error("invalid base64 value");
                }
                else {
                    this._end = this._in.position() - 1;
                    this._value_push(T_BLOB);
                }
            }
        }
        _read_comma() {
            var ch = this._read_after_whitespace(true);
            if (ch != CH_CM)
                this._error("expected ','");
        }
        _read_close_double_brace() {
            var ch = this._read_after_whitespace(true);
            if (ch != CH_CC || this._read() != CH_CC) {
                this._error("expected '}}'");
            }
        }
        isNull() {
            return this._curr_null;
        }
        numberValue() {
            var n, s = this.get_value_as_string(this._value_type);
            switch (this._value_type) {
                case T_INT:
                case T_HEXINT:
                case T_FLOAT:
                    n = Number(s);
                    break;
                case T_FLOAT_SPECIAL:
                    if (s == "+inf")
                        n = Number.POSITIVE_INFINITY;
                    else if (s == "-inf")
                        n = Number.NEGATIVE_INFINITY;
                    else if (s == "nan")
                        n = Number.NaN;
                    else
                        throw new Error("can't convert to number");
                    break;
                default:
                    throw new Error("can't convert to number");
            }
            return n;
        }
        booleanValue() {
            if (this._value_type !== T_BOOL) {
                return undefined;
            }
            let s = this.get_value_as_string(T_BOOL);
            if (s == "true") {
                return true;
            }
            else if (s == "false") {
                return false;
            }
            else {
                return undefined;
            }
        }
        get_value_as_string(t) {
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
                    for (ii = this._start; ii < this._end; ii++) {
                        s += String.fromCharCode(this._in.valueAt(ii));
                    }
                    break;
                case T_STRING1:
                case T_STRING2:
                case T_CLOB2:
                    for (ii = this._start; ii < this._end; ii++) {
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
                    for (ii = this._start; ii < this._end; ii++) {
                        ch = this._in.valueAt(ii);
                        if (ch == CH_SQ) {
                            if (ii + 2 < this._end && this._in.valueAt(ii + 1) == CH_SQ && this._in.valueAt(ii + 1) == CH_SQ) {
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
        _skip_triple_quote_gap(ii, end) {
            ii += 2;
            while (ii < end) {
                let ch = this._in.valueAt(ii);
                if (IonText.is_whitespace(ch)) {
                }
                else if (ch == CH_SQ) {
                    ii += 3;
                    if (ii > end || this._in.valueAt(ii - 2) != CH_SQ || this._in.valueAt(ii - 1) != CH_SQ) {
                        return ii;
                    }
                }
                else {
                    this._error("unexpected character");
                }
            }
            return ii;
        }
        _read_escape_sequence(ii, end) {
            var ch;
            if (ii + 1 >= end) {
                this._error("invalid escape sequence");
                return;
            }
            ch = this._in.valueAt(ii + 1);
            this._esc_len = 1;
            switch (ch) {
                case ESC_0: return 0;
                case ESC_a: return 7;
                case ESC_b: return 8;
                case ESC_t: return 9;
                case ESC_nl: return 10;
                case ESC_ff: return 12;
                case ESC_cr: return 13;
                case ESC_v: return 11;
                case ESC_dq: return 34;
                case ESC_sq: return 39;
                case ESC_qm: return 63;
                case ESC_bs: return 92;
                case ESC_fs: return 47;
                case ESC_nl2: return -1;
                case ESC_nl3:
                    if (ii + 3 < end && this._in.valueAt(ii + 3) == CH_NL) {
                        this._esc_len = 2;
                    }
                    return IonText.ESCAPED_NEWLINE;
                case ESC_x:
                    if (ii + 3 >= end) {
                        this._error("invalid escape sequence");
                        return;
                    }
                    ch = this._get_N_hexdigits(ii + 2, ii + 4);
                    this._esc_len = 3;
                    break;
                case ESC_u:
                    if (ii + 5 >= end) {
                        this._error("invalid escape sequence");
                        return;
                    }
                    ch = this._get_N_hexdigits(ii + 2, ii + 6);
                    this._esc_len = 5;
                    break;
                case ESC_U:
                    if (ii + 9 >= end) {
                        this._error("invalid escape sequence");
                        return;
                    }
                    ch = this._get_N_hexdigits(ii + 2, ii + 10);
                    this._esc_len = 9;
                    break;
                default:
                    this._error("unexpected character after escape slash");
            }
            return;
        }
        _get_N_hexdigits(ii, end) {
            var ch, v = 0;
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
            var t = this._value_type;
            this._value_type = ERROR;
            return t;
        }
        next() {
            if (this._value_type === ERROR) {
                this._run();
            }
            this._curr = this._value_pop();
            let t;
            if (this._curr === ERROR) {
                this._value.push(ERROR);
                t = undefined;
            }
            else {
                t = this._curr;
            }
            this._curr_null = this._value_null;
            this._value_null = false;
            return t;
        }
        _run() {
            var op;
            while (this._ops.length > 0 && (this._value_type === ERROR)) {
                op = this._ops.shift();
                op.call(this);
            }
        }
        _read() {
            var ch = this._in.next();
            return ch;
        }
        _read_skipping_comments() {
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
        _read_to_newline() {
            var ch;
            for (;;) {
                ch = this._read();
                if (ch == EOF)
                    break;
                if (ch == CH_NL)
                    break;
                if (ch == CH_CR) {
                    ch = this._read();
                    if (ch != CH_NL)
                        this._unread(ch);
                    break;
                }
            }
        }
        _read_to_close_comment() {
            var ch;
            for (;;) {
                ch = this._read();
                if (ch == EOF)
                    break;
                if (ch == CH_AS) {
                    ch = this._read();
                    if (ch == CH_FORWARD_SLASH)
                        break;
                }
            }
        }
        _unread(ch) {
            this._in.unread(ch);
        }
        _read_after_whitespace(recognize_comments) {
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
        _peek(expected) {
            var ch, ii = 0;
            if (expected === undefined || expected.length < 1) {
                ch = this._read();
                this._unread(ch);
                return ch;
            }
            while (ii < expected.length) {
                ch = this._read();
                if (ch != expected.charCodeAt(ii))
                    break;
                ii++;
            }
            if (ii == expected.length) {
                ch = this._peek();
            }
            else {
                this._unread(ch);
                ch = ERROR;
            }
            while (ii > 0) {
                ii--;
                this._unread(expected.charCodeAt(ii));
            }
            return ch;
        }
        _peek_after_whitespace(recognize_comments) {
            var ch = this._read_after_whitespace(recognize_comments);
            this._unread(ch);
            return ch;
        }
        _peek_4_digits(ch1) {
            var ii, ch, is_digits = true, chars = [];
            if (!IonText.is_digit(ch1))
                return ERROR;
            for (ii = 0; ii < 3; ii++) {
                ch = this._read();
                chars.push(ch);
                if (!IonText.is_digit(ch)) {
                    is_digits = false;
                    break;
                }
            }
            ch = (is_digits && ii == 3) ? this._peek() : ERROR;
            while (chars.length > 0) {
                this._unread(chars.pop());
            }
            return ch;
        }
        _read_required_digits(ch) {
            if (!IonText.is_digit(ch))
                return ERROR;
            for (;;) {
                ch = this._read();
                if (!IonText.is_digit(ch))
                    break;
            }
            return ch;
        }
        _read_optional_digits(ch) {
            while (IonText.is_digit(ch)) {
                ch = this._read();
            }
            return ch;
        }
        _read_N_digits(n) {
            var ch, ii = 0;
            while (ii < n) {
                ch = this._read();
                if (!IonText.is_digit(ch)) {
                    this._error("" + n + " digits required " + ii + " found");
                    return ERROR;
                }
                ii++;
            }
            return this._read();
        }
        _read_required_hex_digits(ch) {
            if (!IonText.is_hex_digit(ch))
                return ERROR;
            for (;;) {
                ch = this._read();
                if (!IonText.is_hex_digit(ch))
                    break;
            }
            return ch;
        }
        _read_N_hexdigits(n) {
            var ch, ii = 0;
            while (ii < n) {
                ch = this._read();
                if (!IonText.is_hex_digit(ch)) {
                    this._error("" + n + " digits required " + ii + " found");
                    return ERROR;
                }
                ii++;
            }
            return ch;
        }
        _read_hours_and_minutes(ch) {
            if (!IonText.is_digit(ch))
                return ERROR;
            ch = this._read_N_digits(1);
            if (ch == CH_CL) {
                ch = this._read_N_digits(2);
            }
            else {
                ch = ERROR;
            }
            return ch;
        }
        _check_for_keywords() {
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
        _error(msg) {
            this._ops.unshift(this._done_with_error);
            this._error_msg = msg;
        }
    }
    exports.ParserTextRaw = ParserTextRaw;
});
//# sourceMappingURL=IonParserTextRaw.js.map