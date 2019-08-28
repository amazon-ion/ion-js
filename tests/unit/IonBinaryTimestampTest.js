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
  ],
  function(intern, registerSuite, assert, ion) {

    var suite = {
      name: 'BinaryTimestamp'
    };

    suite['Binary Timestamp Round Trip'] = function() {
      //this.skip();

      // First part - writing timestamp into binary datagram
      var Ion = ion;
      var writer = Ion.makeBinaryWriter();
      var timestamp = new Ion.Timestamp(6, 0, 2017, 6, 7, 18, 29, 17, ion.Decimal.parse('.901'));
      writer.writeTimestamp(timestamp);
      writer.close();

      /* Datagram content
       * {
       *     test_timestamp:2017-06-07T18:29:17.901Z
       * }
       */

      // Second part - reading timestamp from binary datagram created above
      var reader = Ion.makeReader(writer.getBytes());
      reader.next();
      var timestampValue = reader.value();
      assert.equal(timestamp.toString(), timestampValue.toString());
    }

    registerSuite(suite);
  }
);