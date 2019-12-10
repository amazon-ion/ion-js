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

import {assert} from 'chai';
import {StringSpan} from '../src/IonSpan';
import {ParserTextRaw} from '../src/IonParserTextRaw';
import {IonTypes} from "../src/IonTypes";
import {IonType} from "../src/IonType";
import JSBI from "jsbi";

// a few notes/surprises:
// - fieldNameType() always appears to return 9 (T_IDENTIFIER) when positioned on a field,
//   and is otherwise null;  consider removing it
// - get_value_as_string() throws for CLOBs, but no other scalars;  its general contract
//   appears to be to return the parsed text of the current value.  blob seems special, too,
//   as it returns 'aGVsbG8' for the Ion `{{aGVsbG8=}}`
// - get_value_as_uint8array() throws for BLOBs (why?)

describe('IonParserTextRaw', () => {
    [
      {
        type: IonTypes.NULL, T_id: 1,  // T_NULL
        tests: [
          {ion: 'null',      expected: null},
          {ion: 'null.null', expected: null},
        ],
      },
      {
        type: IonTypes.BOOL, T_id: 2,  // T_BOOL
        tests: [
          {ion: 'null.bool', expected: null},
          {ion: 'true',      expected: true},
          {ion: 'false',     expected: false},
        ],
      },
      {
        type: IonTypes.INT, T_id: 3,   // T_INT
        tests: [
          {ion: 'null.int', expected: null},
          {ion: '0',        expected: JSBI.BigInt('0')},
          {ion: '1',        expected: JSBI.BigInt('1')},
          {ion: '-1',       expected: JSBI.BigInt('-1')},
        ],
      },
      {
        type: IonTypes.FLOAT, T_id: 5,   // T_FLOAT
        tests: [
          {ion: 'null.float', expected: null},
          {ion: '0e0',        expected: 0},
          {ion: '-0e0',       expected: -0},
          {ion: '1e0',        expected: 1},
        ],
      },
      {
        type: IonTypes.FLOAT, T_id: 6,   // T_FLOAT_SPECIAL
        tests: [
          {ion: '+inf',       expected: Infinity},
          {ion: '-inf',       expected: -Infinity},
          {ion: 'nan',        expected: NaN},
        ],
      },
      {
        type: IonTypes.DECIMAL, T_id: 7,   // T_DECIMAL
        tests: [
          {ion: 'null.decimal', expected: null},
          {ion: '0d0',          expected: 0},
          {ion: '1d0',          expected: 1},
          {ion: '1d1',          expected: 10},
          {ion: '1d-1',         expected: 0.1},
          {ion: '-0.0001',      expected: -0.0001},
        ],
      },
      {
        type: IonTypes.TIMESTAMP, T_id: 8,   // T_TIMESTAMP
        tests: [
          {ion: 'null.timestamp', expected: null},
          {ion: '2017T'},
          {ion: '2001-02-03T04:05:06.123456789-12:34'},
        ],
      },
      {
        type: IonTypes.SYMBOL, T_id: 9,   // T_IDENTIFIER
        tests: [
          {ion: 'null.symbol', expected: null},
          {ion: 'hello'},
        ],
      },
      {
        type: IonTypes.STRING, T_id: 12,   // T_STRING2
        tests: [
          {ion: 'null.string', expected: null},
          {ion: '"hello"',     expectedStr: 'hello'},
        ],
      },
      {
        type: IonTypes.CLOB, T_id: 14,   // T_CLOB2
        tests: [
          {ion: 'null.clob',   expected: null},
          {ion: '{{"hello"}}', expected: Uint8Array.from([0x68, 0x65, 0x6c, 0x6c, 0x6f])},
        ],
      },
      {
        type: IonTypes.BLOB, T_id: 16,   // T_BLOB
        tests: [
          {ion: 'null.blob',    expected: null},
          {ion: '{{aGVsbG8=}}', expectedStr: 'aGVsbG8'},
        ],
      },
      {
        type: IonTypes.LIST, T_id: 18,   // T_LIST
        tests: [
          {ion: 'null.list', expected: null},
        ],
      },
      {
        type: IonTypes.SEXP, T_id: 17,   // T_SEXP
        tests: [
          {ion: 'null.sexp', expected: null},
        ],
      },
      {
        type: IonTypes.STRUCT, T_id: 19,   // T_STRUCT
        tests: [
          {ion: 'null.struct', expected: null},
        ],
      },
    ].forEach((testSet: {type: IonType, T_id: number, tests: {ion: string, expected: any, expectedStr: string}[]}) => {
        describe('Reads ' + testSet.type.name + ' value', () => {
            testSet.tests.forEach((test: {ion: string, expected: any, expectedStr: string}) => {
                it(test.ion, () => {
                    let p = new ParserTextRaw(new StringSpan(test.ion));
                    assert.equal(p.isNull(), false);
                    assert.equal(p.next(), testSet.T_id);

                    assert.equal(p.isNull(), test.expected === null);
                    assert.isNull(p.fieldName());
                    assert.isNull(p.fieldNameType());
                    assert.deepEqual([], p.annotations());

                    if (p.isNull()) {
                        assert.isNull(p.booleanValue());
                        assert.isNull(p.bigIntValue());
                        assert.isNull(p.numberValue());
                        switch (testSet.type) {
                            case IonTypes.NULL:
                            case IonTypes.BOOL:
                            case IonTypes.INT:
                            case IonTypes.FLOAT:
                            case IonTypes.DECIMAL:
                            case IonTypes.TIMESTAMP:
                            case IonTypes.SYMBOL:
                            case IonTypes.STRING:
                            case IonTypes.BLOB:
                                assert.equal(p.get_value_as_string(testSet.T_id), '');
                                break;
                            default:
                                assert.throws(() => p.get_value_as_string(testSet.T_id));
                        }
                    } else {
                        switch (testSet.type) {
                            case IonTypes.BOOL:
                                assert.equal(p.booleanValue(), test.expected);
                                break;
                            default:
                                assert.throws(() => p.booleanValue());
                        }

                        switch (testSet.type) {
                            case IonTypes.INT:
                                assert.equal(p.numberValue(), JSBI.toNumber(test.expected));
                                break;
                            case IonTypes.FLOAT:
                                isNaN(test.expected) ? assert.isNaN(p.numberValue())
                                    : assert.equal(p.numberValue(), test.expected);
                                break;
                            default:
                                assert.throws(() => p.numberValue());
                        }

                        switch (testSet.type) {
                            case IonTypes.INT:
                                assert.deepEqual(p.bigIntValue(), test.expected);
                                break;
                            default:
                                assert.throws(() => p.bigIntValue());
                        }

                        switch (testSet.type) {
                            case IonTypes.CLOB:
                                assert.throws(() => p.get_value_as_string(testSet.T_id));
                                assert.deepEqual(p.get_value_as_uint8array(testSet.T_id), test.expected);
                                break;
                            default:
                                assert.equal(p.get_value_as_string(testSet.T_id),
                                    test.expectedStr ? test.expectedStr : test.ion);
                                assert.throws(() => p.get_value_as_uint8array(testSet.T_id));
                        }
                    }

                    assert.equal(p.next(), -1 /* EOF */);
                });
            });
        });
    });

    it('Reads list', () => {
        let p = new ParserTextRaw(new StringSpan('[1, a, []]'));
        assert.equal(p.next(), 18); // list
        assert.equal(p.next(), 3);  // int
        assert.equal(p.next(), 9);  // symbol
        assert.equal(p.next(), 18); // list
        assert.equal(p.next(), -1); // EOF
    });

    it('Reads sexp', () => {
        let p = new ParserTextRaw(new StringSpan('(1 a {})'));
        assert.equal(p.next(), 17); // sexp
        assert.equal(p.next(), 3);  // int
        assert.equal(p.next(), 9);  // symbol
        assert.equal(p.next(), 19); // struct
        assert.equal(p.next(), -1); // EOF
    });

    it('Reads struct', () => {
        let p = new ParserTextRaw(new StringSpan('{a: 1, b: a, c: {d: true}}'));
        assert.isNull(p.fieldNameType());

        assert.equal(p.next(), 19); // list
        assert.isNull(p.fieldNameType());

        assert.equal(p.next(), 3);  // int
        assert.equal(p.fieldName(), 'a');
        assert.equal(p.fieldNameType(), 9);

        assert.equal(p.next(), 9);  // symbol
        assert.equal(p.fieldName(), 'b');
        assert.equal(p.fieldNameType(), 9);

        assert.equal(p.next(), 19); // struct
        assert.equal(p.fieldName(), 'c');
        assert.equal(p.fieldNameType(), 9);

        assert.equal(p.next(), 2);  // bool
        assert.equal(p.fieldName(), 'd');
        assert.equal(p.fieldNameType(), 9);

        p.clearFieldName();
        assert.isNull(p.fieldName());
        assert.isNull(p.fieldNameType());

        assert.equal(p.next(), -1); // EOF
        assert.isNull(p.fieldNameType());
    });

    it('Reads annotations', () => {
        let p = new ParserTextRaw(new StringSpan('z::[1, y::2, x::{a: w::3, b: v::(s::t::u::4)}, r::5]'));
        p.next(); assert.deepEqual(p.annotations(), ['z']);
        p.next(); assert.deepEqual(p.annotations(), []);
        p.next(); assert.deepEqual(p.annotations(), ['y']);
        p.next(); assert.deepEqual(p.annotations(), ['x']);
        p.next(); assert.deepEqual(p.annotations(), ['w']);
        p.next(); assert.deepEqual(p.annotations(), ['v']);
        p.next(); assert.deepEqual(p.annotations(), ['s', 't', 'u']);

        assert.equal(p.next(), -1);  // "EOF" (end of nested sexp)
        assert.deepEqual(p.annotations(), []);
        assert.equal(p.next(), -1);  // "EOF" (end of nested struct)
        assert.deepEqual(p.annotations(), []);

        p.next(); assert.deepEqual(p.annotations(), ['r']);
        assert.equal(p.next(), -1);  // "EOF" (end of list)
        assert.deepEqual(p.annotations(), []);
    })
});

