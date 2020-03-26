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
import * as ion from '../src/Ion';

describe('Binary Reader', () => {
    it('timestamp', () => {
        let timestamp = ion.Timestamp.parse('2000-05-04T03:02:01.000789000Z');
        let writer = ion.makeBinaryWriter();
        writer.writeTimestamp(timestamp);
        writer.close();
        let reader = ion.makeReader(writer.getBytes());
        reader.next();
        assert.deepEqual(reader.timestampValue(), timestamp);
    });
});
