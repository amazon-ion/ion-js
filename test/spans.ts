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
import * as IonSpan from '../src/IonSpan';

@suite('Spans')
class UtilTests {
    @test "null valueAt"() {
        let span = new IonSpan.StringSpan("null");
        assert.equal('n'.charCodeAt(0), span.valueAt(0));
        assert.equal('u'.charCodeAt(0), span.valueAt(1));
        assert.equal('l'.charCodeAt(0), span.valueAt(2));
        assert.equal('l'.charCodeAt(0), span.valueAt(3));
        assert.equal(-1, span.valueAt(4));
    }

    @test "null next"() {
        let span = new IonSpan.StringSpan("null");
        assert.equal('n'.charCodeAt(0), span.next());
        assert.equal('u'.charCodeAt(0), span.next());
        assert.equal('l'.charCodeAt(0), span.next());
        assert.equal('l'.charCodeAt(0), span.next());
        assert.equal(-1, span.next());
    }
}