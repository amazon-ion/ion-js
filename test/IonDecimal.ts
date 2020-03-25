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

import {assert} from "chai";
import * as ion from "../src/Ion";
import {Decimal, decodeUtf8} from "../src/Ion";
import * as util from "../src/util";
import JSBI from "jsbi";
import {JsbiSupport} from "../src/JsbiSupport";

/**
 * @param decimalString The text representation of the decimal to test.
 * @param expectedCoefficient The expected `string` for the coefficient.
 * @param expectedExponent The expected `number` for the exponent part.
 * @param expectedNumberValue The expected number or an array of size two indicating the inclusive range of
 *   possible values (due to platform dependent rounding of `Math.pow()`).
 * @param expectedToString The expected text image of `Decimal.toString()`
 */
function test(decimalString: string,
              expectedCoefficient: string,
              expectedExponent: number,
              expectedNumberValue: number | number[],
              expectedToString: string) {

    let decimal = ion.Decimal.parse(decimalString)!;

    assert.deepEqual(decimal.getCoefficient(), JSBI.BigInt(expectedCoefficient), '_getCoefficient()');
    assert.equal(decimal.isNegative(), Object.is(Number(expectedCoefficient), -0) || JsbiSupport.isNegative(JSBI.BigInt(expectedCoefficient)), 'coefficient sign');

    assert.equal(decimal.getExponent(), expectedExponent, '_getExponent()');
    assert.equal(util._sign(decimal.getExponent()), util._sign(expectedExponent), 'exponent sign');

    assert.equal(decimal.isNegative(), decimalString.trim()[0] === '-', 'isNegative()');

    if (expectedNumberValue instanceof Array) {
        if (expectedNumberValue.length !== 2) {
            throw new Error(`Expected number value must be size two ${expectedNumberValue}`);
        }
        const decNumberValue = decimal.numberValue();
        assert.isAtLeast(decNumberValue, expectedNumberValue[0], `numberValue() not in range ${expectedNumberValue}`);
        assert.isAtMost(decNumberValue, expectedNumberValue[1], `numberValue() not in range ${expectedNumberValue}`);
        assert.equal(util._sign(decimal.numberValue()), util._sign(expectedNumberValue[0]), 'numberValue sign');
    } else {
        assert.equal(decimal.numberValue(), expectedNumberValue, 'numberValue()');
        assert.equal(util._sign(decimal.numberValue()), util._sign(expectedNumberValue), 'numberValue sign');
    }

    assert.equal(decimal.toString(), expectedToString, 'toString()');
}

function testEquals(decimalString1: string, decimalString2: string, expected: boolean) {
    let dec1 = ion.Decimal.parse(decimalString1)!;
    let dec2 = ion.Decimal.parse(decimalString2)!;
    assert.equal(dec1.equals(dec2), expected);
    assert.equal(dec2.equals(dec1), expected);
}

function testCompareTo(decimalString1: string, decimalString2: string, expected: number) {
    let dec1 = ion.Decimal.parse(decimalString1)!;
    let dec2 = ion.Decimal.parse(decimalString2)!;
    assert.equal(dec1.compareTo(dec2), expected);
    assert.equal(dec2.compareTo(dec1), -expected);
}

let decimalParsingTests = [
    {inputString: '0d0', coefficient: '0', exponent: 0, numberValue: 0, text: '0'},
    {inputString: '-0d0', coefficient: '-0', exponent: 0, numberValue: -0, text: '-0'},
    {inputString: '0d-0', coefficient: '0', exponent: 0, numberValue: 0, text: '0'},
    {inputString: '-0d-0', coefficient: '-0', exponent: 0, numberValue: -0, text: '-0'},
    {inputString: '0.', coefficient: '0', exponent: 0, numberValue: 0, text: '0'},
    {inputString: '-0.', coefficient: '-0', exponent: 0, numberValue: -0, text: '-0'},
    {inputString: '0d5', coefficient: '0', exponent: 5, numberValue: 0, text: '0E+5'},
    {inputString: '0d-5', coefficient: '0', exponent: -5, numberValue: 0, text: '0.00000'},
    {inputString: '1d0', coefficient: '1', exponent: 0, numberValue: 1, text: '1'},
    {inputString: '1d1', coefficient: '1', exponent: 1, numberValue: 10, text: '1E+1'},
    {inputString: '1d-1', coefficient: '1', exponent: -1, numberValue: 0.1, text: '0.1'},
    {inputString: '1d-6', coefficient: '1', exponent: -6, numberValue: 0.000001, text: '0.000001'},
    {inputString: '1d-7', coefficient: '1', exponent: -7, numberValue: 0.0000001, text: '1E-7'},
    {inputString: '56.789', coefficient: '56789', exponent: -3, numberValue: 56.789, text: '56.789'},
    {inputString: '-1.', coefficient: '-1', exponent: 0, numberValue: -1, text: '-1'},
    {inputString: '123456000.', coefficient: '123456000', exponent: 0, numberValue: 123456000, text: '123456000'},
    {inputString: '123456d-6', coefficient: '123456', exponent: -6, numberValue: 0.123456, text: '0.123456'},
    {inputString: '123d0', coefficient: '123', exponent: 0, numberValue: 123, text: '123'},
    {inputString: '-123d0', coefficient: '-123', exponent: 0, numberValue: -123, text: '-123'},
    {inputString: '123d1', coefficient: '123', exponent: 1, numberValue: 1230, text: '1.23E+3'},
    {inputString: '123d3', coefficient: '123', exponent: 3, numberValue: 123000, text: '1.23E+5'},
    {inputString: '123d-1', coefficient: '123', exponent: -1, numberValue: 12.3, text: '12.3'},
    {
        inputString: '123d-5',
        coefficient: '123',
        exponent: -5,
        numberValue: [0.00123, 0.0012300000000000002],
        text: '0.00123'
    },
    {inputString: '123d-10', coefficient: '123', exponent: -10, numberValue: 1.2300000000000001e-8, text: '1.23E-8'},
    {inputString: '-123d-12', coefficient: '-123', exponent: -12, numberValue: -0.000000000123, text: '-1.23E-10'},
    {inputString: '12300d-2', coefficient: '12300', exponent: -2, numberValue: 123, text: '123.00'},
    {inputString: '123456.0', coefficient: '1234560', exponent: -1, numberValue: 123456.0, text: '123456.0'},
    {inputString: '1234560d-1', coefficient: '1234560', exponent: -1, numberValue: 123456.0, text: '123456.0'},
];

let decimalComparisonTests = [
    {input1: '0', input2: '0', expected: 0},
    {input1: '0', input2: '0d0', expected: 0},
    {input1: '0', input2: '0d1', expected: 0},
    {input1: '0', input2: '0d-1', expected: 0},
    {input1: '0', input2: '0d-0', expected: 0},

    {input1: '-0', input2: '-0', expected: 0},
    {input1: '-0', input2: '-0d0', expected: 0},
    {input1: '-0', input2: '-0d1', expected: 0},
    {input1: '-0', input2: '-0d-1', expected: 0},
    {input1: '-0', input2: '-0d-0', expected: 0},

    {input1: '0', input2: '-0', expected: 0},
    {input1: '0', input2: '-0d0', expected: 0},
    {input1: '0', input2: '-0d1', expected: 0},
    {input1: '0', input2: '-0d-1', expected: 0},
    {input1: '0', input2: '-0d-0', expected: 0},

    {input1: '0d-0', input2: '0d-0', expected: 0},
    {input1: '-0d-0', input2: '-0d-0', expected: 0},

    {input1: '2.1', input2: '2.1', expected: 0},
    {input1: '2.1', input2: '2.10', expected: 0},
    {input1: '2.1', input2: '2.11', expected: -1},
    {input1: '2.11', input2: '2.10', expected: 1},
    {input1: '2.1d1', input2: '21', expected: 0},
    {input1: '22', input2: '2.1d1', expected: 1},
    {input1: '123d-101', input2: '123d-100', expected: -1},
    {input1: '123d-100', input2: '123d-100', expected: 0},
    {input1: '123d-99', input2: '123d-100', expected: 1},
    {input1: '123d99', input2: '123d100', expected: -1},
    {input1: '123d100', input2: '123d100', expected: 0},
    {input1: '123d101', input2: '123d100', expected: 1},

    {input1: '79d-3', input2: '0d0', expected: 1},
    {input1: '79d-3', input2: '78d-3', expected: 1},
    {input1: '791d-4', input2: '78d-3', expected: 1},
    {input1: '779d-4', input2: '78d-3', expected: -1},
    {input1: '-0d0', input2: '-79d-3', expected: 1},

    {input1: '0.01', input2: '0.1', expected: -1},
    {input1: '0.01', input2: '0.10', expected: -1},
    {input1: '0.010', input2: '0.1', expected: -1},
    {input1: '0.010', input2: '0.10', expected: -1},
    {input1: '0.01', input2: '0.010', expected: 0},

    {input1: '10d0', input2: '0.123', expected: 1},
    {input1: '10d0', input2: '0.1234', expected: 1},
    {input1: '1d1', input2: '0d0', expected: 1},
    {input1: '1d0', input2: '0d0', expected: 1},
    {input1: '1d-1', input2: '0d0', expected: 1},
    {input1: '1d1', input2: '-0d0', expected: 1},
    {input1: '1d0', input2: '-0d0', expected: 1},
    {input1: '1d-1', input2: '-0d0', expected: 1},

    {input1: '-1d1', input2: '0d0', expected: -1},
    {input1: '-1d0', input2: '0d0', expected: -1},
    {input1: '-1d-1', input2: '0d0', expected: -1},
    {input1: '-1d1', input2: '-0d0', expected: -1},
    {input1: '-1d0', input2: '-0d0', expected: -1},
    {input1: '-1d-1', input2: '-0d0', expected: -1},
];

let decimalEqualsTests: ({ input1: string, input2: string, expected: boolean, skip?: boolean })[] = [
    {input1: '0', input2: '0', expected: true},
    {input1: '0', input2: '0d0', expected: true},
    {input1: '0', input2: '0d1', expected: false},
    {input1: '0', input2: '0d-1', expected: false},

    {input1: '0', input2: '0d-0', expected: true},
    {input1: '-0', input2: '-0', expected: true},
    {input1: '-0', input2: '-0d0', expected: true},

    {input1: '-0', input2: '-0d1', expected: false},
    {input1: '-0', input2: '-0d-1', expected: false},
    {input1: '-0', input2: '-0d-0', expected: true},

    {input1: '0', input2: '-0', expected: false},
    {input1: '0', input2: '-0d0', expected: false},

    {input1: '0', input2: '-0d1', expected: false},
    {input1: '0', input2: '-0d-1', expected: false},
    {input1: '0', input2: '-0d-0', expected: false},

    {input1: '0d-0', input2: '0d-0', expected: true},
    {input1: '-0d-0', input2: '-0d-0', expected: true},

    {input1: '1', input2: '1', expected: true},
    {input1: '1', input2: '2', expected: false},
    {input1: '2.1', input2: '2.10', expected: false},

    {input1: '10000000000000000.00000000000000001', input2: '10000000000000000.00000000000000001', expected: true},
    {input1: '10000000000000000.00000000000000001', input2: '10000000000000000.00000000000000002', expected: false},
    {input1: '10000000000000000.00000000000000000', input2: '10000000000000000.0000000000000000', expected: false},
];

let decimalFromNumberNumberTests: ({ coefficient: number, exponent: number })[] = [
    {coefficient: 0, exponent: 0},
    {coefficient: -0, exponent: -0},
    {coefficient: -0, exponent: 0},
    {coefficient: 0, exponent: -0},
    {coefficient: 314, exponent: 2},
    {coefficient: -314, exponent: -2},
    {coefficient: 314, exponent: -2},
    {coefficient: -314, exponent: 2},
    {coefficient: -10000000000000001, exponent: -9},
    {coefficient: 10000000000000001, exponent: 9},
    {coefficient: 10000000000000001, exponent: -9},
    {coefficient: -10000000000000001, exponent: 9},
];

let isNegativeZero = (value: number | JSBI, isNegative?: boolean): boolean => {
    return (typeof value === 'number' && Object.is(-0, value))
        || (value instanceof JSBI && isNegative === true && JsbiSupport.isZero(value));
};

let toStringWithSign = (value: number | JSBI, isNegative: boolean): string => {
    if (isNegativeZero(value, isNegative)) {
        return '-0';
    }
    return value.toString();
};

let decimalConstructorTest = (coefficient: number | JSBI, exponent: number, isNegative: boolean = false) => {
    let coefficientText = toStringWithSign(coefficient, isNegative);
    let exponentText = toStringWithSign(exponent, isNegative);

    let decimalValue: Decimal;
    if (coefficient instanceof JSBI) {
        decimalValue = new Decimal(coefficient, exponent, isNegative);
    } else {
        decimalValue = new Decimal(coefficient, exponent);
    }
    let writer = ion.makeTextWriter();
    writer.writeDecimal(decimalValue);
    writer.close();
    let textDecimal = decodeUtf8(writer.getBytes());
    let reader = ion.makeReader(textDecimal);
    assert.equal(ion.IonTypes.DECIMAL, reader.next());
    let decimalFromText = reader.decimalValue()!;

    let testName = `new Decimal(${coefficientText}, ${exponentText}`;
    if (isNegative !== undefined) {
        testName += ', ' + isNegative;
    }
    testName += ') is equal to ' + textDecimal;

    it(testName, () => {
        assert.isTrue(decimalFromText.equals(decimalValue));
        assert.deepEqual(JSBI.BigInt(coefficient), decimalValue.getCoefficient());
        assert.equal(exponent, decimalValue.getExponent());
        assert.equal(
            isNegativeZero(coefficient, isNegative),
            isNegativeZero(decimalValue.getCoefficient(), decimalValue.isNegative())
        );
    });
};

describe('Decimal', () => {
    describe('Constructor variants', () => {
        describe('(number, number)', () => {
            decimalFromNumberNumberTests.forEach(({coefficient, exponent}) => {
                decimalConstructorTest(coefficient, exponent);
            });
        });

        describe('(BigInt, number, boolean)', () => {
            decimalFromNumberNumberTests.forEach(({coefficient, exponent}) => {
                let isNegative = coefficient < 0 || Object.is(-0, coefficient);
                let bigIntCoefficient = JSBI.BigInt(coefficient);
                decimalConstructorTest(bigIntCoefficient, exponent, isNegative);
            });
        });
    });

    describe('Parsing', () => {
        decimalParsingTests.forEach(
            ({inputString, coefficient, exponent, numberValue, text}) => {
                it(
                    inputString,
                    () => test(inputString, coefficient, exponent, numberValue, text)
                );
            });
    });

    describe('equals', () => {
        decimalEqualsTests.forEach(
            ({input1, input2, expected, skip = false}) => {
                let shouldEqual = expected ? ' equals ' : ' is not equal to ';
                let testName = input1 + shouldEqual + input2;
                if (skip) {
                    it.skip(testName, () => {});
                    return;
                }
                it(
                    testName,
                    () => testEquals(input1, input2, expected)
                );
            }
        );
    });

    describe('compareTo', () => {
        decimalComparisonTests.forEach(
            ({input1, input2, expected}) => {
                it(
                    input1 + ' compareTo ' + input2,
                    () => testCompareTo(input1, input2, expected)
                );
            });
    });

    it('intValue(5.0)', () => assert.equal(ion.Decimal.parse('5.0')!.intValue(), 5));
    it('intValue(5.0000001)', () => assert.equal(ion.Decimal.parse('5.0000001')!.intValue(), 5));
    it('intValue(5.9999999)', () => assert.equal(ion.Decimal.parse('5.9999999')!.intValue(), 5));
    it('intValue(0)', () => assert.equal(ion.Decimal.parse('0')!.intValue(), 0));
    it('intValue(0.0000001)', () => assert.equal(ion.Decimal.parse('0.0000001')!.intValue(), 0));
    it('intValue(0.9999999)', () => assert.equal(ion.Decimal.parse('0.9999999')!.intValue(), 0));
    it('intValue(-0)', () => {
        let int = ion.Decimal.parse('-0')!.intValue();
        assert.equal(int, 0);
        assert.equal(util._sign(int), -1);
    });
    it('intValue(-0.0000001)', () => {
        let int = ion.Decimal.parse('-0.0000001')!.intValue();
        assert.equal(int, 0);
        assert.equal(util._sign(int), -1);
    });
    it('intValue(-0.9999999)', () => {
        let int = ion.Decimal.parse('-0.9999999')!.intValue();
        assert.equal(int, 0);
        assert.equal(util._sign(int), -1);
    });
    it('intValue(-1.0000001)', () => () => assert.equal(ion.Decimal.parse('-1.0000001')!.intValue(), -1));
});
