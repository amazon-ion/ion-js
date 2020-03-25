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
import {IonTypes} from '../src/Ion';
import IntSize from "../src/IntSize";
import JSBI from "jsbi";

function intToBinaryIonBytes(value: number | JSBI): Uint8Array {
    let writer = ion.makeBinaryWriter();
    writer.writeInt(value);
    writer.close();
    return writer.getBytes();
}

describe('IntSize', () => {
    describe('text', () => {
        it('MAX_SAFE_INTEGER: IntSize.Number', () => {
            let reader = ion.makeReader(Number.MAX_SAFE_INTEGER.toString());
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.Number);
        });

        it('MIN_SAFE_INTEGER: IntSize.Number', () => {
            let reader = ion.makeReader(Number.MIN_SAFE_INTEGER.toString());
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.Number);
        });

        it('> MAX_SAFE_INTEGER: IntSize.BigInt', () => {
            let value = JSBI.add(JSBI.BigInt(Number.MAX_SAFE_INTEGER), JSBI.BigInt(1));
            let reader = ion.makeReader(value.toString());
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.BigInt);
        });

        it('< MIN_SAFE_INTEGER: IntSize.BigInt', () => {
            let value = JSBI.subtract(JSBI.BigInt(Number.MIN_SAFE_INTEGER), JSBI.BigInt(1));
            let reader = ion.makeReader(value.toString());
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.BigInt);
        });
    });

    describe('binary', () => {
        it('MAX_SAFE_INTEGER: IntSize.Number', () => {
            let reader = ion.makeReader(intToBinaryIonBytes(Number.MAX_SAFE_INTEGER));
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.Number);
        });

        it('MIN_SAFE_INTEGER: IntSize.Number', () => {
            let reader = ion.makeReader(intToBinaryIonBytes(Number.MIN_SAFE_INTEGER));
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.Number);
        });

        it('> MAX_SAFE_INTEGER: IntSize.BigInt', () => {
            let value = JSBI.add(JSBI.BigInt(Number.MAX_SAFE_INTEGER), JSBI.BigInt(1));
            let reader = ion.makeReader(intToBinaryIonBytes(value));
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.BigInt);
        });

        it('< MIN_SAFE_INTEGER: IntSize.BigInt', () => {
            let value = JSBI.subtract(JSBI.BigInt(Number.MIN_SAFE_INTEGER), JSBI.BigInt(1));
            let reader = ion.makeReader(intToBinaryIonBytes(value));
            assert.equal(IonTypes.INT, reader.next());
            assert.equal(reader.intSize(), IntSize.BigInt);
        });
    });
});
