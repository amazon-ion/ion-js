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
import {Writeable} from '../src/IonWriteable';

@suite('Writeable')
class WriteableTests {
    @test "writePartialArray"() {
        let writeable = new Writeable();
        writeable.writeBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 4, 4);
        assert.deepEqual(writeable.getBytes(), new Uint8Array([5, 6, 7, 8]));
    }
}