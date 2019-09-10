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
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'dist/amd/es6/IonTests',
    'dist/amd/es6/util',
  ],
  function(intern, registerSuite, assert, ion, util) {
    registerSuite({
      name: 'util',

      '_hasValue()'         : () => assert.equal(util._hasValue(), false),
      '_hasValue(undefined)': () => assert.equal(util._hasValue(undefined), false),
      '_hasValue(null)'     : () => assert.equal(util._hasValue(null), false),
      '_hasValue(0)'        : () => assert.equal(util._hasValue(0), true),
      '_hasValue(1)'        : () => assert.equal(util._hasValue(1), true),

      '_sign(-1)': () => assert.equal(util._sign(-1), -1),
      '_sign(-0)': () => assert.equal(util._sign(-0), -1),
      '_sign(0)' : () => assert.equal(util._sign(0), 1),
      '_sign(1)' : () => assert.equal(util._sign(1), 1),

      '_writeValues(), reader.type() == null': () => {
        let expected = 'abc::{a:a::true,b:b::[two::2,three::3e3,'
            + 'sexp::(four::4d4 five::2019T six::hello seven::"hello" eight::{{"hello"}}'
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null.null}';
        let reader = ion.makeReader(expected);
        assert.isNull(reader.type());
        let writer = ion.makeTextWriter();
        util._writeValues(reader, writer);
        assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expected);
      },
      '_writeValues(), reader.type() != null': () => {
        let expected = 'abc::{a:a::true,b:b::[two::2,three::3e3,'
            + 'sexp::(four::4d4 five::2019T six::hello seven::"hello" eight::{{"hello"}}'
            + ' nine::{{aGVsbGA=}})],c:c::null.symbol,d:d::null.null}';
        let reader = ion.makeReader(expected);
        reader.next();
        assert.isNotNull(reader.type());
        testWriteValues(reader, expected);
      },
      '_writeValues(), datagram': () => {
        let expected = '1\n2\n3';
        let reader = ion.makeReader(expected);
        assert.isNull(reader.type());
        testWriteValues(reader, expected);
      },
      '_writeValues(), start within container': () => {
        let s = 'abc::{a:a::1,b:b::[two::2,three::3,sexp::(four::4)],c:c::null.symbol}';
        let reader = ion.makeReader(s);
        reader.next();
        reader.stepIn();
        testWriteValues(reader, 'a::1\nb::[two::2,three::3,sexp::(four::4)]\nc::null.symbol');
        reader.stepOut();
      },
    });

    function testWriteValues(reader, expected) {
      let writer = ion.makeTextWriter();
      util._writeValues(reader, writer);
      assert.equal(String.fromCharCode.apply(null, writer.getBytes()), expected);
    }
  }
);

