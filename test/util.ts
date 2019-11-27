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
import * as util from "../src/util";

@suite('util')
class UtilTests {
    @test "_hasValue(undefined)"() {
        assert.equal(util._hasValue(undefined), false);
    }

    @test "_hasValue(null)"() {
        assert.equal(util._hasValue(null), false);
    }

    @test "_hasValue(0)"() {
        assert.equal(util._hasValue(0), true);
    }

    @test "_hasValue(1)"() {
        assert.equal(util._hasValue(1), true);
    }

    @test "_sign(-1)"() {
        assert.equal(util._sign(-1), -1);
    }

    @test "_sign(-0)"() {
        assert.equal(util._sign(-0), -1);
    }

    @test "_sign(0)"() {
        assert.equal(util._sign(0), 1);
    }

    @test "_sign(1)"() {
        assert.equal(util._sign(1), 1);
    }
}