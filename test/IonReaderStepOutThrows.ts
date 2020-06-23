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
import {IonTypes, Writer} from "../src/Ion";

describe('IonReaderStepOutThrows', () => {
    function writeData(writer: Writer): Uint8Array {
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('a');
        writer.writeInt(1);
        writer.stepOut();
        writer.close();
        return writer.getBytes();
    }

    let readerTypes = [
        {name: 'Binary', data: writeData(ion.makeBinaryWriter())},
        {name: 'Text',   data: writeData(ion.makeTextWriter())},
    ];

    readerTypes.forEach(readerType => {
        it(readerType.name + 'Reader.stepOut() throws when called immediately', () => {
            let r = ion.makeReader(readerType.data);
            assert.throws(() => { r.stepOut() });
        });

        it(readerType.name + 'Reader.stepOut() throws when called after next', () => {
            let r = ion.makeReader(readerType.data);
            r.next();
            assert.throws(() => { r.stepOut() });
        });

        it(readerType.name + 'Reader.stepOut() throws after returning to top-level', () => {
            let r = ion.makeReader(readerType.data);
            r.next();
            r.stepIn();
            r.next();
            r.stepOut();
            assert.throws(() => { r.stepOut() });
        });
    });
});

