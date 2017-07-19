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
define(
    [
        'intern',
        'intern!object',
        'intern/chai!assert',
        'dist/amd/es6/IonTests',
    ],
    function(intern, registerSuite, assert, ion) {
        function make_parser(str) {
            var reader = ion.makeReader(str, { raw_tokens: true });
            var parser = reader.raw_parser();
            return parser;
        }

        function next(parser, expected_type, expected_value) {
            var t = parser.next();
            if (false) {
                console.log("t = " + JSON.stringify(t));
                console.log("start = " + parser.start());
                console.log("end = " + parser.end());
                console.log("s = " + parser.get_value_as_string(t));
                console.log("raw = " + parser.get_raw_token());
                console.log("type(t) = " + JSON.stringify(ion.getIonType(t)));
                console.log("exp = " + JSON.stringify(expected_type));
            }
            assert.equal(ion.getIonType(t), expected_type);
            assert.equal(parser.get_value_as_string(t), expected_value);
        }

        function test_token(type, str, exp) {
            if (exp === undefined) exp = str;
            var parser = make_parser(str);
            next(parser, type, exp);
            assert.equal(parser.get_raw_token(), str);
            assert.equal(parser.next(), -1);
        }

        function test_null(s) {
            test_token(ion.IonTypes.NULL, s);
        }
        function test_bool(s) {
            test_token(ion.IonTypes.BOOL, s);
        }
        function test_int(s) {
            test_token(ion.IonTypes.INT, s);
        }
        function test_decimal(s) {
            test_token(ion.IonTypes.DECIMAL, s);
        }
        function test_float(s) {
            test_token(ion.IonTypes.FLOAT, s);
        }
        function test_timestamp(s) {
            test_token(ion.IonTypes.TIMESTAMP, s);
        }
        function test_symbol(s) {
            test_token(ion.IonTypes.SYMBOL, s);
        }
        function test_string(s, ps) {
            test_token(ion.IonTypes.STRING, s, ps);
        }
        function test_blob(s) {
            test_token(ion.IonTypes.BLOB, s);
        }
        function test_clob(s, ps) {
            test_token(ion.IonTypes.CLOB, s, ps);
        }

        var suite = {
            name: 'Tokens'
        };
        if (false) {  // for isolating failures within a single test
            console.log("+++++++ DEBUGGING MODE, don't check this in!! ++++++");
            suite['foo'] = function() {
                test_int("0x10");
            };
        } else {
            suite['null'] = function() {
                test_null("null");
                for (var t in ion.IonTypes) {
                    var type = ion.IonTypes[t];
                    if (type.bid >= 0 && type.bid < 16) {
                        test_null("null." + type.name);
                    }
                }
            };

            suite['bool'] = function() {
                test_bool("true");
                test_bool("false");
            };

            suite['int'] = function() {
                test_int("0");
                test_int("-0");
                test_int("88888888888888888888888888888888888888888888");
                test_int("0x10");
            };

            suite['decimal'] = function() {
                test_decimal("0.0");
                test_decimal("-0.0");
                test_decimal("0d0");
                test_decimal("88888888888888888888888888888888888888888888.0");
            };

            suite['float'] = function() {
                test_float("nan");
                test_float("+inf");
                test_float("-inf");
                test_float("0.0e0");
            };

            suite['timestamp'] = function() {
                test_timestamp("1999-12-25T00:00:00Z");
            };

            suite['symbol'] = function() {
                test_symbol("ab");
                test_symbol("a");
                test_symbol("$3");
            };

            suite['string'] = function() {
                test_string("\"abc\"", "abc");
                test_string("'''abc'''", "abc");
                test_string('"ab\\"c"', 'ab"c');
                test_string("'''abc''' // cmt\n'''def'''", "abcdef");
                test_string("'''abc''' /* cmt */'''def'''", "abcdef");
            };

            suite['blob'] = function() {
                test_blob("{{OiBTIKUgTyAASb8=}}");
            };


            suite['clob'] = function() {
                test_clob('{{"a b c"}}', "a b c");
                test_clob("{{ '''line 1'''\n    '''line 2'''\n}}", 'line 1line 2');
                test_clob('{{ "line 3 \\" line 4" }}', 'line 3 " line 4');
                test_clob('{{ "line 3 \\n line 4" }}', 'line 3 \n line 4');
            };

            suite['empty list'] = function() {
                var parser = make_parser("[]");
                next(parser, ion.IonTypes.SYMBOL, "[");
                next(parser, ion.IonTypes.SYMBOL, "]");
                assert.equal(parser.next(), -1);
            };

            suite['empty sexp'] = function() {
                var parser = make_parser("()");
                next(parser, ion.IonTypes.SYMBOL, "(");
                next(parser, ion.IonTypes.SYMBOL, ")");
                assert.equal(parser.next(), -1);
            };

            suite['empty struct'] = function() {
                var parser = make_parser("{}");
                next(parser, ion.IonTypes.SYMBOL, "{");
                next(parser, ion.IonTypes.SYMBOL, "}");
                assert.equal(parser.next(), -1);
            };

            suite['annotation'] = function() {
                var parser = make_parser("abc::def");
                next(parser, ion.IonTypes.SYMBOL, "abc");
                next(parser, ion.IonTypes.SYMBOL, "::");
                next(parser, ion.IonTypes.SYMBOL, "def");
                assert.equal(parser.next(), -1);
            };

            suite['sexp'] = function() {
                var parser = make_parser("(+ ++ abc::-1)");
                next(parser, ion.IonTypes.SYMBOL, "(");
                next(parser, ion.IonTypes.SYMBOL, "+");
                next(parser, ion.IonTypes.SYMBOL, "++");
                next(parser, ion.IonTypes.SYMBOL, "abc");
                next(parser, ion.IonTypes.SYMBOL, "::");
                next(parser, ion.IonTypes.INT, "-1");
                next(parser, ion.IonTypes.SYMBOL, ")");
                assert.equal(parser.next(), -1);
            };
        }
        registerSuite(suite);
    }
);
