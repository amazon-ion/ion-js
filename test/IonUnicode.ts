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
import {suite, test} from "mocha-typescript";
import {encodeUtf8} from '../src/IonUnicode';

@suite('Unicode')
class UnicodeTests {
    @test "Encode dollar sign"() {
        assert.deepEqual(encodeUtf8('$'), new Uint8Array([0x24]));
    }

    @test "Encode cent sign"() {
        assert.deepEqual(encodeUtf8('¢'), new Uint8Array([0xc2, 0xa2]));
    }

    @test "Encode euro sign"() {
        assert.deepEqual(encodeUtf8('€'), new Uint8Array([0xe2, 0x82, 0xac]));
    }

    @test "Gothic letter hwair"() {
        assert.deepEqual(
            encodeUtf8(String.fromCodePoint(0x10348)),
            new Uint8Array([0xf0, 0x90, 0x8d, 0x88])
        );
    }
}
