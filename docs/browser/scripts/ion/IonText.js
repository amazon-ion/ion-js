define(["require", "exports", "./IonUtilities"], function (require, exports, IonUtilities_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        DOUBLE_QUOTE: "\\\"",
        SINGLE_QUOTE: "\\\'",
        SLASH: "\\\\",
    };
    function _make_bool_array(str) {
        let i = str.length;
        let a = [];
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
    const _is_numeric_terminator = _make_bool_array("{}[](),\"\'\ \t\n\r\u000c");
    const _is_operator_char = _make_bool_array("!#%&*+-./;<=>?@^`|~");
    const _is_whitespace = _make_bool_array(" \t\r\n\u000b\u000c");
    const isIdentifierArray = _make_bool_array("_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    function is_digit(ch) {
        if (ch < 48 || ch > 57)
            return false;
        return true;
    }
    exports.is_digit = is_digit;
    function asAscii(s) {
        if (typeof s === 'undefined') {
            s = "undefined::null";
        }
        else if (typeof s == 'number') {
            s = "" + s;
        }
        else if (typeof s != 'string') {
            var esc = nextEscape(s, s.length);
            if (esc >= 0) {
                s = escapeString(s, esc);
            }
        }
        return s;
    }
    exports.asAscii = asAscii;
    function nextEscape(s, prev) {
        while (prev-- > 0) {
            if (needsEscape(s.charCodeAt(prev)))
                break;
        }
        return prev;
    }
    exports.nextEscape = nextEscape;
    function needsEscape(c) {
        if (c < 32)
            return true;
        if (c > 126)
            return true;
        if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === SLASH)
            return true;
        return false;
    }
    exports.needsEscape = needsEscape;
    function escapeString(s, pos) {
        var fixes = [], c, old_len, new_len, ii, s2;
        while (pos >= 0) {
            c = s.charCodeAt(pos);
            if (!needsEscape(c))
                break;
            fixes.push([pos, c]);
            pos = nextEscape(s, pos);
        }
        if (fixes.length > 0) {
            s2 = "";
            ii = fixes.length;
            pos = s.length;
            while (ii--) {
                let fix = fixes[ii];
                let tail_len = pos - fix[0] - 1;
                if (tail_len > 0) {
                    s2 = escapeSequence(fix[1]) + s.substring(fix[0] + 1, pos) + s2;
                }
                else {
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
        var s = _escapeStrings[c];
        if (typeof s === 'undefined') {
            if (c < 256) {
                s = "\\x" + toHex(c, 2);
            }
            else if (c <= 0xFFFF) {
                s = "\\u" + toHex(c, 4);
            }
            else {
                s = "\\U" + toHex(c, 8);
            }
        }
        return s;
    }
    exports.escapeSequence = escapeSequence;
    function toHex(c, len) {
        var s = "";
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
    function is_numeric_terminator(ch) {
        if (ch == -1)
            return true;
        return _is_numeric_terminator[ch];
    }
    exports.is_numeric_terminator = is_numeric_terminator;
    function is_letter_or_digit(ch) {
        return _is_letter_or_digit[ch];
    }
    exports.is_letter_or_digit = is_letter_or_digit;
    function is_operator_char(ch) {
        return _is_operator_char[ch];
    }
    exports.is_operator_char = is_operator_char;
    function is_whitespace(ch) {
        if (ch > 32)
            return false;
        if (ch == this.WHITESPACE_COMMENT1)
            return true;
        if (ch == this.WHITESPACE_COMMENT2)
            return true;
        if (ch == this.ESCAPED_NEWLINE)
            return true;
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
    let BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let BASE64_PADDING = "=";
    const TWO_BIT_MASK = 0x3;
    const FOUR_BIT_MASK = 0xF;
    const SIX_BIT_MASK = 0x3F;
    function toBase64(value) {
        let result = "";
        let i = 0;
        for (; i < value.length - 2; i += 3) {
            let octet1 = value[i];
            let octet2 = value[i + 1];
            let octet3 = value[i + 2];
            let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
            let index2 = ((octet1 & TWO_BIT_MASK) << 4) | ((octet2 >>> 4) & FOUR_BIT_MASK);
            let index3 = ((octet2 & FOUR_BIT_MASK) << 2) | ((octet3 >>> 6) & TWO_BIT_MASK);
            let index4 = octet3 & SIX_BIT_MASK;
            result += BASE64[index1];
            result += BASE64[index2];
            result += BASE64[index3];
            result += BASE64[index4];
        }
        if ((value.length - i) === 2) {
            let octet1 = value[i];
            let octet2 = value[i + 1];
            let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
            let index2 = ((octet1 & TWO_BIT_MASK) << 4) | ((octet2 >>> 4) & FOUR_BIT_MASK);
            let index3 = (octet2 & FOUR_BIT_MASK) << 2;
            result += BASE64[index1];
            result += BASE64[index2];
            result += BASE64[index3];
            result += BASE64_PADDING;
        }
        else if ((value.length - i) === 1) {
            let octet1 = value[i];
            let index1 = (octet1 >>> 2) & SIX_BIT_MASK;
            let index2 = (octet1 & TWO_BIT_MASK) << 4;
            result += BASE64[index1];
            result += BASE64[index2];
            result += BASE64_PADDING;
            result += BASE64_PADDING;
        }
        return result;
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
        CharCodes[CharCodes["LEFT_PARENTHESIS"] = '('.charCodeAt(0)] = "LEFT_PARENTHESIS";
        CharCodes[CharCodes["RIGHT_PARENTHESIS"] = ')'.charCodeAt(0)] = "RIGHT_PARENTHESIS";
        CharCodes[CharCodes["LEFT_BRACE"] = '{'.charCodeAt(0)] = "LEFT_BRACE";
        CharCodes[CharCodes["RIGHT_BRACE"] = '}'.charCodeAt(0)] = "RIGHT_BRACE";
        CharCodes[CharCodes["LEFT_BRACKET"] = '['.charCodeAt(0)] = "LEFT_BRACKET";
        CharCodes[CharCodes["RIGHT_BRACKET"] = ']'.charCodeAt(0)] = "RIGHT_BRACKET";
        CharCodes[CharCodes["COMMA"] = ','.charCodeAt(0)] = "COMMA";
        CharCodes[CharCodes["SPACE"] = ' '.charCodeAt(0)] = "SPACE";
        CharCodes[CharCodes["LOWERCASE_U"] = 'u'.charCodeAt(0)] = "LOWERCASE_U";
        CharCodes[CharCodes["COLON"] = ':'.charCodeAt(0)] = "COLON";
    })(CharCodes = exports.CharCodes || (exports.CharCodes = {}));
    function backslashEscape(s) {
        return [CharCodes.BACKSLASH, s.charCodeAt(0)];
    }
    function toCharCodes(s) {
        let charCodes = new Array(s.length);
        for (let i = 0; i < s.length; i++) {
            charCodes[i] = s.charCodeAt(i);
        }
        return charCodes;
    }
    function unicodeEscape(codePoint) {
        let prefix = [CharCodes.BACKSLASH, CharCodes.LOWERCASE_U];
        let hexEscape = codePoint.toString(16);
        while (hexEscape.length < 4) {
            hexEscape = "0" + hexEscape;
        }
        return prefix.concat(toCharCodes(hexEscape));
    }
    exports.ClobEscapes = {};
    exports.ClobEscapes[CharCodes.NULL] = backslashEscape("0");
    exports.ClobEscapes[CharCodes.BELL] = backslashEscape("a");
    exports.ClobEscapes[CharCodes.BACKSPACE] = backslashEscape("b");
    exports.ClobEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape("t");
    exports.ClobEscapes[CharCodes.LINE_FEED] = backslashEscape("n");
    exports.ClobEscapes[CharCodes.VERTICAL_TAB] = backslashEscape("v");
    exports.ClobEscapes[CharCodes.FORM_FEED] = backslashEscape("f");
    exports.ClobEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape("r");
    exports.ClobEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
    exports.ClobEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
    exports.ClobEscapes[CharCodes.FORWARD_SLASH] = backslashEscape("/");
    exports.ClobEscapes[CharCodes.QUESTION_MARK] = backslashEscape("?");
    exports.ClobEscapes[CharCodes.BACKSLASH] = backslashEscape("\\");
    function unicodeEscapes(escapes, start, end) {
        if (IonUtilities_1.isUndefined(end)) {
            escapes[start] = unicodeEscape(start);
        }
        else {
            for (let i = start; i < end; i++) {
                escapes[i] = unicodeEscape(i);
            }
        }
    }
    let CommonEscapes = {};
    CommonEscapes[CharCodes.NULL] = backslashEscape('0');
    unicodeEscapes(CommonEscapes, 1, 6);
    CommonEscapes[CharCodes.BELL] = backslashEscape('a');
    CommonEscapes[CharCodes.BACKSPACE] = backslashEscape('b');
    CommonEscapes[CharCodes.HORIZONTAL_TAB] = backslashEscape('t');
    CommonEscapes[CharCodes.LINE_FEED] = backslashEscape('n');
    CommonEscapes[CharCodes.VERTICAL_TAB] = backslashEscape('v');
    CommonEscapes[CharCodes.FORM_FEED] = backslashEscape('f');
    CommonEscapes[CharCodes.CARRIAGE_RETURN] = backslashEscape['r'];
    CommonEscapes[CharCodes.BACKSLASH] = backslashEscape('\\');
    exports.StringEscapes = Object['assign']({}, CommonEscapes);
    exports.StringEscapes[CharCodes.DOUBLE_QUOTE] = backslashEscape('"');
    exports.SymbolEscapes = Object['assign']({}, CommonEscapes);
    exports.SymbolEscapes[CharCodes.SINGLE_QUOTE] = backslashEscape("'");
    function isIdentifier(s) {
        if (is_digit(s.charCodeAt(0))) {
            return false;
        }
        for (let i = 0; i < s.length; i++) {
            let c = s.charCodeAt(i);
            let b = isIdentifierArray[c];
            if (!b) {
                return false;
            }
        }
        return true;
    }
    exports.isIdentifier = isIdentifier;
    function isOperator(s) {
        for (let i = 0; i < s.length; i++) {
            let c = s.charCodeAt(i);
            let b = _is_operator_char[c];
            if (!b) {
                return false;
            }
        }
        return true;
    }
    exports.isOperator = isOperator;
    function* escape(s, escapes) {
        for (let i = 0; i < s.length; i++) {
            let charCode = s.charCodeAt(i);
            let escape = escapes[charCode];
            if (!IonUtilities_1.isUndefined(escape)) {
                for (let j = 0; j < escape.length; j++) {
                    yield escape[j];
                }
            }
            else {
                yield charCode;
            }
        }
    }
    exports.escape = escape;
});
//# sourceMappingURL=IonText.js.map