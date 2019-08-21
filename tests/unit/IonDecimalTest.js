/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
    'dist/amd/es6/util',
  ],
  function(intern, registerSuite, assert, ion, util) {
    registerSuite({
      name: 'Decimal',

      '0d0'       : () => test('0d0', '0', 0, 0, '0'),
      '-0d0'      : () => test('-0d0', '-0', 0, -0, '-0'),
      '0d-0'      : () => test('0d-0', '0', -0, 0, '0'),
      '-0d-0'     : () => test('-0d-0', '-0', -0, -0, '-0'),
      '0.'        : () => test('0.', '0', 0, 0, '0'),
      '-0.'       : () => test('-0.', '-0', 0, -0, '-0'),

      '0d5'       : () => test('0d5', '0', 5, 0, '0E+5'),
      '0d-5'      : () => test('0d-5', '0', -5, 0, '0.00000'),

      '1d0'       : () => test('1d0', '1', 0, 1, '1'),
      '1d1'       : () => test('1d1', '1', 1, 10, '1E+1'),
      '1d-1'      : () => test('1d-1', '1', -1, 0.1, '0.1'),
      '1d-6'      : () => test('1d-6', '1', -6, 0.000001, '0.000001'),
      '1d-7'      : () => test('1d-7', '1', -7, 0.0000001,'1E-7'),

      '56.789'    : () => test('56.789', '56789', -3, 56.789, '56.789'),
      '-1.'       : () => test('-1.', '-1', 0, -1, '-1'),
      '123456000.': () => test('123456000.', '123456000', 0, 123456000, '123456000'),
      '123456d-6' : () => test('123456d-6', '123456', -6, 0.123456, '0.123456'),
      '123d0'     : () => test('123d0', '123', 0, 123, '123'),
      '-123d0'    : () => test('-123d0', '-123', 0, -123, '-123'),
      '123d1'     : () => test('123d1', '123', 1, 1230, '1.23E+3'),
      '123d3'     : () => test('123d3', '123', 3, 123000, '1.23E+5'),
      '123d-1'    : () => test('123d-1', '123', -1, 12.3, '12.3'),
      '123d-5'    : () => test('123d-5', '123', -5, 0.0012300000000000002, '0.00123'),
      '123d-10'   : () => test('123d-10', '123', -10, 1.2300000000000001e-8, '1.23E-8'),
      '-123d-12'  : () => test('-123d-12', '-123', -12, -0.000000000123, '-1.23E-10'),

      'compare()' : () => {
        // this first assertion should fail;  2.1 and 2.10 are not equivalent
        assert.equal(ion.Decimal.parse('2.1').compare(ion.Decimal.parse('2.10')), 0);
        assert.equal(ion.Decimal.parse('2.15').compare(ion.Decimal.parse('2.10')), 1);
        assert.equal(ion.Decimal.parse('2.1').compare(ion.Decimal.parse('2.15')), -1);
        assert.equal(ion.Decimal.parse('2.5d1').compare(ion.Decimal.parse('25')), 0);
        assert.equal(ion.Decimal.parse('25').compare(ion.Decimal.parse('2.1d1')), 1);
        assert.equal(ion.Decimal.parse('.00005').compare(ion.Decimal.parse('0.05d-10')), 1);
      },
      // TBD:  'equals': () => { this.skip() },
      // TBD:  'DataModelequals': () => { this.skip() },
      // TBD:  'parse': () => { this.skip() },
    });

    function test(decimalString,
                  expectedCoefficient,
                  expectedExponent,
                  expectedNumberValue,
                  expectedToString) {

        let decimal = ion.Decimal.parse(decimalString);

        assert.deepEqual(decimal._getCoefficient(), new ion.LongInt(expectedCoefficient), '_getCoefficient()');
        assert.equal(decimal._getCoefficient().signum(), new ion.LongInt(expectedCoefficient).signum(), 'coefficient sign');

        assert.equal(decimal._getExponent(), expectedExponent, '_getExponent()');
        assert.equal(util._sign(decimal._getExponent()), util._sign(expectedExponent), 'exponent sign');

        assert.equal(decimal.isNegative(), decimalString.trim()[0] === '-', 'isNegative()');

        assert.equal(decimal.numberValue(), expectedNumberValue, 'numberValue()');
        assert.equal(util._sign(decimal.numberValue()), util._sign(expectedNumberValue), 'numberValue sign');

        assert.equal(decimal.toString(), expectedToString, 'toString()');
    }
  }
);

