/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

define(
    function(require) {
        const registerSuite = require('intern!object');
        const assert = require('intern/chai!assert');
        const ion = require('dist/amd/es6/Ion');

        var suite = {
            name: 'Text Reader'
        };

        suite['Read string value'] = function() {
            var ionToRead = "\"string\"";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();

            assert.equal(ionReader.value(), "string");
        };

        suite['Read boolean value'] = function() {
            var ionToRead = "true";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();

            assert.equal(ionReader.value(), true);
        };

        suite['Read boolean value in struct'] = function() {
            var ionToRead = "{ a: false }";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();
            ionReader.stepIn();
            ionReader.next();

            assert.equal(ionReader.value(), false);
        };

        suite['resolves symbol IDs'] = function() {
            let ionToRead = `$ion_symbol_table::{ symbols:[ "rock", "paper", "scissors" ]}{ $5: $6, $10: $11, $12: 'taco' }`;
            let ionReader = ion.makeReader(ionToRead);
            ionReader.next();
            ionReader.stepIn();
            ionReader.next();
            assert.equal(ionReader.fieldName(), 'version');
            assert.equal(ionReader.value(), 'imports');
            ionReader.next();
            assert.equal(ionReader.fieldName(), "rock");
            assert.equal(ionReader.value(), "paper");
            ionReader.next();
            assert.equal(ionReader.fieldName(), "scissors");
            assert.equal(ionReader.value(), 'taco');
            ionReader.next();
            ionReader.stepOut();
            //assert.equal(ionReader.value(), false);
        };

        suite['Parse through struct'] = function() {
            var ionToRead = "{ key : \"string\" }";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();

            assert.equal(ion.IonTypes.STRUCT, ionReader.type());

            ionReader.stepIn(); // Step into the base struct.
            ionReader.next();

            assert.equal(ionReader.fieldName(), "key");
            assert.equal(ionReader.value(), "string");
        };

        suite['Parse through struct can skip over container'] = function() {
            var ionToRead = "{ a: { key1 : \"string1\" }, b: { key2 : \"string2\" } }";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();

            assert.equal(ion.IonTypes.STRUCT, ionReader.type());

            ionReader.stepIn(); // Step into the base struct.
            ionReader.next();

            assert.equal(ionReader.fieldName(), "a");

            ionReader.next();

            assert.equal(ionReader.fieldName(), "b");

            ionReader.stepIn(); // Step into the "b" struct.
            ionReader.next();

            assert.equal(ionReader.fieldName(), "key2");
            assert.equal(ionReader.value(), "string2");
        };

        suite['Parse through struct can skip over nested containers'] = function() {
            var ionToRead = "{ outerkey1 : { innerkey1 : {a1: \"a1\", b1: \"b1\"} }, outerkey2 : { innerkey2 : {a2: \"a2\", b2: \"b2\"} } }";
            var ionReader = ion.makeReader(ionToRead);
            ionReader.next();

            assert.equal(ion.IonTypes.STRUCT, ionReader.type());

            ionReader.stepIn(); // Step into the base struct.
            ionReader.next();

            assert.equal(ionReader.fieldName(), "outerkey1");

            ionReader.next();

            assert.equal(ionReader.fieldName(), "outerkey2");

            ionReader.stepIn(); // Step into the "b" struct.
            ionReader.next();

            assert.equal(ionReader.fieldName(), "innerkey2");
        };


        suite['text IVM'] = function() {
            var textReader = ion.makeReader("");
            let isNotIVM = ["$ion_schema_1_0", "$ion_1", "$ion_1_a", "$ion_", "ion_1_"];
            let unsupportedIVM = ["$ion_2_0", "$ion_1_999", "$ion_999_0", "$ion_1_1", "$ion_1_00"];

            test_isIVM(textReader,"$ion_1_0", true, 0, []);
            test_isIVM(textReader,"$ion_1_0", false, 1, []);
            test_isIVM(textReader,"$ion_1_0", false, 0, ["taco"]);
            for (let i = 0; i < isNotIVM.length; i++) {
                test_isIVM(textReader, isNotIVM[i], false, 0, []);
            }
            for (let i = 0; i < unsupportedIVM.length; i++) {
                test_isIVM(textReader, unsupportedIVM[i], "throw", 0, []);
                test_isIVM(textReader, unsupportedIVM[i], false, 1, []);
                test_isIVM(textReader, unsupportedIVM[i], false, 0, ["taco"]);
            }
        };

        function test_isIVM(reader, value, expected, depth, annotations) {
            if (expected === "throw") {
                assert.throws(() => { reader.isIVM(value, depth, annotations)});
            } else {
                let actual = reader.isIVM(value, depth, annotations);
                assert.equal(actual, expected);
            }


        }
        registerSuite(suite);
    }
);
