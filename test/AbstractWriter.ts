/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */

import {assert} from 'chai';
import * as ion from '../src/IonTests';

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

describe('Binary Timestamp', () => {
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
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null.null}';
        let reader = ion.makeReader(expected);
        assert.isNull(reader.type());
        testWriteValues(reader, expected);
    });

    it('writeValues(), reader.type() != null', () => {
        let expected = 'abc::{a:a::true,b:b::[two::2,three::3e3,'
            + 'sexp::(four::4d4 five::2019T six::hello seven::"hello" eight::{{"hello"}}'
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null.null}';
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

    it('writeValues(), start within container', () => {
        let s = 'abc::{a:a::1,b:b::[two::2,three::3,sexp::(four::4)],c:c::null.symbol}';
        let reader = ion.makeReader(s);
        reader.next();
        reader.stepIn();
        testWriteValues(reader, 'a::1\nb::[two::2,three::3,sexp::(four::4)]\nc::null.symbol');
        reader.stepOut();
    });
});