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
import * as ion from '../src/IonTests';

describe('Annotation tests', () => {
    it('Sid0 annotation in IonText throws.', () => {
        let test = () => {
            let input = '$0::taco';
            let reader = ion.makeReader(input);
            reader.next()
        };
        assert.throws(test);
    });

    it('Sid0 annotation in IonBinary throws.', () => {
        let test = () => {
            let input = new Uint8Array([0xe0, 0x01, 0x00, 0xea, 0xe4, 0x81, 0x80, 0x21, 0x01]);//$0::1
            let reader = ion.makeReader(input);
            reader.next();
            reader.annotations();
        };
        assert.throws(test);
    });
});