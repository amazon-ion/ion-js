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

import {assert} from 'chai';
import {LongInt} from '../src/IonLongInt';

let longIntTests = [
    {inputValue: 0, expectedSignum: 1},
    {inputValue: 1, expectedSignum: 1},
    {inputValue: -1, expectedSignum: -1},
    {inputValue: -0, expectedSignum: -1},

    {inputValue: '0', expectedSignum: 1},
    {inputValue: '1', expectedSignum: 1},
    {inputValue: '-1', expectedSignum: -1},
    {inputValue: '-0', expectedSignum: -1},
    {inputValue: ' -1', expectedSignum: -1},
    {inputValue: ' -0', expectedSignum: -1},
];

describe('Long Int', () => {
    longIntTests.forEach(({inputValue, expectedSignum}) => {
        let testName = inputValue.toString();
        if (typeof inputValue === 'string') {
            testName = '"' + testName + '"';
        }
        if (Number(inputValue) === 0) {
            // FIXME: https://github.com/amzn/ion-js/issues/444
            it.skip(testName, () => {});
            return;
        }
        it(testName, () => {
            let longInt = new LongInt(inputValue);
            assert.equal(longInt.signum(), expectedSignum);
        });
    });
});