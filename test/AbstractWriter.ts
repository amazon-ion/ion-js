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
import {IonTypes} from "../src/Ion";

function testWriteValue(reader, expected) {
    let writer = ion.makeTextWriter();
    writer.writeValue(reader);
    assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expected);
}

function testWriteValues(reader, expected) {
    let writer = ion.makeTextWriter();
    writer.writeValues(reader);
    assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expected);
}

function depthTest(instructions, expectedDepth) {
    let textWriter = ion.makeTextWriter();
    let binaryWriter = ion.makeBinaryWriter();
    instructions(textWriter);
    instructions(binaryWriter);
    assert.equal(textWriter.depth(), expectedDepth);
    assert.equal(binaryWriter.depth(), expectedDepth);
}

describe('AbstractWriter depth tests', () => {
    it('Writing a null list results in a depth of 0.', () => {
        depthTest((writer) => {writer.writeNull(IonTypes.LIST)}, 0);
    });

    it('Writing a null struct results in a depth of 0.', () => {
        depthTest((writer) => {writer.writeNull(IonTypes.STRUCT)}, 0);
    });

    it('Writing a null sexp results in a depth of 0.', () => {
        depthTest((writer) => {writer.writeNull(IonTypes.SEXP)}, 0);
    });

    it('Stepping into a list and out results in a depth of 0.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.LIST); writer.stepOut()}, 0);
    });

    it('Stepping into an sexp and out results in a depth of 0.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.SEXP); writer.stepOut()}, 0);
    });

    it('Stepping into an struct and out results in a depth of 0.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.STRUCT); writer.stepOut()}, 0);
    });

    it('Stepping into a list results in a depth of 1.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.LIST)}, 1);
    });

    it('Stepping into a sexp results in a depth of 1.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.SEXP)}, 1);
    });

    it('Stepping into 2 lists results in a depth of 2.', () => {
        depthTest((writer) => {writer.stepIn(IonTypes.LIST); writer.stepIn(IonTypes.LIST)}, 2);
    });

    it('Stepping into 2 lists and out results in a depth of 1.', () => {
        depthTest((writer) => {
                writer.stepIn(IonTypes.LIST);
                writer.stepIn(IonTypes.LIST);
                writer.stepOut()},
            1);
    });

    it('Stepping into 2 lists, out and into an sexp results in a depth of 2.', () => {
        depthTest((writer) => {
                writer.stepIn(IonTypes.LIST);
                writer.stepIn(IonTypes.LIST);
                writer.stepOut();
                writer.stepIn(IonTypes.SEXP)},
            2);
    });
});


describe('AbstractWriter writeValue()', () => {
    it('writeValue(), reader.type() == null', () => {
        let reader = ion.makeReader('a');
        testWriteValue(reader, '');
    });

    it('writeValue(), reader.type() != null', () => {
        let reader = ion.makeReader('a [1, 2, 3] {a: 4, b:(5 6 [8, 9]), c: 10}');
        reader.next();
        testWriteValue(reader, 'a');
        reader.next();
        testWriteValue(reader, '[1,2,3]');
        reader.next();
        testWriteValue(reader, '{a:4,b:(5 6 [8,9]),c:10}');
    });

    it('writeValues(), reader.type() == null', () => {
        let expected = 'abc::{a:a::true,b:b::[two::2,three::3e3,'
            + 'sexp::(four::4d4 five::2019T six::hello seven::"hello" eight::{{"hello"}}'
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null}';
        let reader = ion.makeReader(expected);
        assert.isNull(reader.type());
        testWriteValues(reader, expected);
    });

    it('writeValues(), reader.type() != null', () => {
        let expected = 'abc::{a:a::true,b:b::[two::2,three::3e3,'
            + 'sexp::(four::4d4 five::2019T six::hello seven::"hello" eight::{{"hello"}}'
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null}';
        let reader = ion.makeReader(expected);
        reader.next();
        assert.isNotNull(reader.type());
        testWriteValues(reader, expected);
    });

    it('writeValues(), datagram', () => {
        let expected = '1\n2\n3';
        let reader = ion.makeReader(expected);
        assert.isNull(reader.type());
        testWriteValues(reader, expected);
    });

    it('writeValues(), reader starts in a struct, writer starts at top level', () => {
        let s = 'abc::{a:a::1,b:b::[two::2,three::3,sexp::(four::4)],c:c::null.symbol}';
        let reader = ion.makeReader(s);
        reader.next();
        reader.stepIn();
        testWriteValues(reader, 'a::1\nb::[two::2,three::3,sexp::(four::4)]\nc::null.symbol');
        reader.stepOut();
    });

    it('writeValues(), reader starts in a list, writer starts at top level', () => {
        let ionText = '[two::2,three::3,sexp::(four::4)]';
        let expectedIonText = 'two::2\nthree::3\nsexp::(four::4)'
        let reader = ion.makeReader(ionText);
        reader.next();
        reader.stepIn();

        let writer = ion.makeTextWriter();
        writer.writeValues(reader);
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expectedIonText);

        reader.stepOut();
    });

    it('writeValues(), reader starts in a struct, writer starts in a struct', () => {
        let ionText = '{name:"Joe",age:22}';
        let expectedIonText = ionText;
        let reader = ion.makeReader(ionText);
        reader.next();
        reader.stepIn();

        let writer = ion.makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        writer.writeValues(reader);
        writer.stepOut();
        writer.close();
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expectedIonText);

        reader.stepOut();
    });

    it('writeValues(), reader starts in a list, writer starts in a list', () => {
        let ionText = '["foo","bar","baz"]';
        let expectedIonText = ionText;
        let reader = ion.makeReader(ionText);
        reader.next();
        reader.stepIn();

        let writer = ion.makeTextWriter();
        writer.stepIn(IonTypes.LIST);
        writer.writeValues(reader);
        writer.stepOut();
        writer.close();
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expectedIonText);

        reader.stepOut();
    });

    it('writeValues(), reader starts inside a list, writer starts in a struct', () => {
        let ionText = '[two::2,three::3,sexp::(four::4)]';
        let reader = ion.makeReader(ionText);
        reader.next();
        reader.stepIn();

        let writer = ion.makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        // The writer needs a field name for each value it writes in a struct, but the reader isn't in a struct
        // and doesn't have a field name to offer.
        assert.throws(() => writer.writeValues(reader));
        writer.stepOut();

        reader.stepOut();
    });

    it('writeValues(), reader starts inside a struct, writer starts in a list', () => {
        let ionText = '{a:{foo:"bar"},b:"baz"}';
        let expectedIonText = '[{foo:"bar"},"baz"]';
        let reader = ion.makeReader(ionText);
        reader.next();
        reader.stepIn();

        let writer = ion.makeTextWriter();
        writer.stepIn(IonTypes.LIST);
        writer.writeValues(reader);
        writer.stepOut();
        writer.close();
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expectedIonText);

        reader.stepOut();
    });
});