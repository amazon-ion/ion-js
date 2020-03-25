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

function readerToBytes(reader) {
    let writer = ion.makeTextWriter();
    writer.writeValues(reader);
    writer.close();
    return writer.getBytes();
}

function readerToString(reader) {
    return ion.decodeUtf8(readerToBytes(reader));
}

describe('Annotations', () => {
    it('Read annotations', () => {
        let data = "a::b::123";
        let reader = ion.makeReader(data);
        reader.next();
        assert.deepEqual(reader.annotations(), ['a', 'b']);
        assert.equal(reader.value(), '123');
        assert.equal(readerToString(reader), 'a::b::123');
    });

    it('Resolves ID annotations', () => {
        let data = "$3::123";
        let reader = ion.makeReader(data);
        reader.next();
        assert.deepEqual(reader.annotations(), ['$ion_symbol_table']);
    });

    it('Does not resolve non-ID annotations', () => {
        let data = "'$3'::123";
        let reader = ion.makeReader(data);
        reader.next();
        assert.deepEqual(reader.annotations(), ["'$3'"]);
    });

    it('Create annotations', () => {
        let data = "123";
        let reader = ion.makeReader(data);
        reader.next();
        let writer = ion.makeTextWriter();
        writer.setAnnotations(['a']);
        writer.writeInt(reader.numberValue());
        reader.next();
        writer.writeValues(reader);
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::123');
    });

    it('Add annotation', () => {
        let data = "a::b::123";
        let reader = ion.makeReader(data);
        reader.next();
        let writer = ion.makeTextWriter();
        writer.setAnnotations(reader.annotations());
        writer.addAnnotation('c');
        writer.writeInt(reader.numberValue());
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::b::c::123');
    });

    it('Wrap annotation', () => {
        let data = "{ x: 1 }";
        let reader = ion.makeReader(data);
        let writer = ion.makeTextWriter();
        writer.setAnnotations(['a', 'b']);
        writer.stepIn(ion.IonTypes.STRUCT);

        reader.next();
        reader.stepIn();
        reader.next();

        writer.writeValues(reader);

        reader.stepOut();

        writer.stepOut();
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), 'a::b::{x:1}');
    });

    it('Sid0 text annotation throws', () => {
        let test = () => {
            let input = '$0::taco';
            let reader = ion.makeReader(input);
            reader.next()
        };
        assert.throws(test);
    });

    it('Sid0 binary annotation throws', () => {
        let test = () => {
            // the following bytes represent $0::1
            let input = new Uint8Array([0xe0, 0x01, 0x00, 0xea, 0xe4, 0x81, 0x80, 0x21, 0x01]);
            let reader = ion.makeReader(input);
            reader.next();
            reader.annotations();
        };
        assert.throws(test);
    });
});
