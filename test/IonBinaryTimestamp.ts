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

describe('Binary Timestamp', () => {
    it('Round trip', () => {
// First part - writing timestamp into binary datagram
        let writer = ion.makeBinaryWriter();
        let timestamp = new ion.Timestamp(0, 2017, 6, 7, 18, 29, ion.Decimal.parse('17.901'));
        writer.writeTimestamp(timestamp);
        writer.close();

        /* Datagram content
         * {
         *     test_timestamp:2017-06-07T18:29:17.901Z
         * }
         */

        // Second part - reading timestamp from binary datagram created above
        let reader = ion.makeReader(writer.getBytes());
        reader.next();
        let timestampValue = reader.value();
        assert.equal(timestamp.toString(), timestampValue!.toString());
    });
});