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
import {suite, test} from "mocha-typescript";
import * as ion from '../src/Ion';

@suite('Text Reader')
class IonTextReaderTests {
    private static first_value_equal(input, expected) {
        let reader = ion.makeReader(input);
        reader.next();
        assert.equal(reader.value(), expected);
    }

    private static ivmTest(reader, value, expected, depth, annotations) {
        if (expected === "throw") {
            assert.throws(() => {
                reader.isIVM(value, depth, annotations)
            });
        } else {
            let actual = reader.isIVM(value, depth, annotations);
            assert.equal(actual, expected);
        }
    }

    @test "Read string value"() {
        let ionToRead = "\"string\"";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.equal(ionReader.value(), "string");
    }

    @test "Read emoji with modifier"() {
        let s: string = 'a👩🏽b👩🏽👩🏽c';
        let r: ion.Reader = ion.makeReader("'" + s + "'" + ' ' + '"' + s + '"' + ' ' + "'''" + s + "'''");
        r.next();
        assert.equal(r.stringValue(), s);
        r.next();
        assert.equal(r.stringValue(), s);
        r.next();
        assert.equal(r.stringValue(), s);
    }

    @test "Read boolean value"() {
        let ionToRead = "true";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.equal(ionReader.value(), true);
    }

    @test "Read clob value"() {
        let ionToRead = '{{"\\xc2\\x80"}}';
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.deepEqual(ionReader.value(), Uint8Array.from([194, 128]));
    }

    @test "Read boolean value in struct"() {
        let ionToRead = "{ a: false }";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();
        ionReader.stepIn();
        ionReader.next();

        assert.equal(ionReader.value(), false);
    }

    @test "resolves symbol IDs"() {
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
    }

    @test "Parse through struct"() {
        let ionToRead = "{ key : \"string\" }";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.equal(ion.IonTypes.STRUCT, ionReader.type());

        ionReader.stepIn(); // Step into the base struct.
        ionReader.next();

        assert.equal(ionReader.fieldName(), "key");
        assert.equal(ionReader.value(), "string");

        assert.isNull(ionReader.next());
    }

    @test "Parse through struct can skip over container"() {
        let ionToRead = "{ a: { key1 : \"string1\" }, b: { key2 : \"string2\" } }";
        let ionReader = ion.makeReader(ionToRead);
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

        assert.isNull(ionReader.next());
    }

    @test "Parse through struct can skip over nested containers"() {
        let ionToRead = "{ outerkey1 : { innerkey1 : {a1: \"a1\", b1: \"b1\"} }, outerkey2 : { innerkey2 : {a2: \"a2\", b2: \"b2\"} } }";
        let ionReader = ion.makeReader(ionToRead);
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

        assert.isNull(ionReader.next());
    }

    @test "Reads an array"() {
        let ionToRead = "{ key : ['v1', 'v2'] }";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.equal(ion.IonTypes.STRUCT, ionReader.type());

        ionReader.stepIn(); // Step into the base struct.
        ionReader.next();

        assert.equal(ionReader.fieldName(), "key");

        ionReader.stepIn(); // Step into the array.

        ionReader.next();
        assert.equal(ionReader.value(), "v1");

        ionReader.next();
        assert.equal(ionReader.value(), "v2");

        assert.isNull(ionReader.next());
    }

    @test "Reads a nested array"() {
        let ionToRead = "{ key : [['v1', 'v2']] }";
        let ionReader = ion.makeReader(ionToRead);
        ionReader.next();

        assert.equal(ion.IonTypes.STRUCT, ionReader.type());

        ionReader.stepIn(); // Step into the base struct.
        ionReader.next();

        assert.equal(ionReader.fieldName(), "key");

        ionReader.stepIn(); // Step into the outer array.
        ionReader.next();
        ionReader.stepIn(); // Step into the inner array.

        ionReader.next();
        assert.equal(ionReader.value(), "v1");

        ionReader.next();
        assert.equal(ionReader.value(), "v2");

        assert.isNull(ionReader.next());
    }

    @test "Returns null on EOF"() {
        let ionToRead = "";
        let ionReader = ion.makeReader(ionToRead);
        assert.isNull(ionReader.next());
        assert.isNull(ionReader.next()); // EOF
    }

    @test "Parses escaped terminators correctly."() {
        IonTextReaderTests.first_value_equal("'abc\\''", "abc'");
        IonTextReaderTests.first_value_equal("'''abc\\''''", "abc'");
        IonTextReaderTests.first_value_equal("'abc\\'' taco", "abc'");
        IonTextReaderTests.first_value_equal("'''abc\\'''' taco", "abc'");
        IonTextReaderTests.first_value_equal("'''abc\\'''' '''''' taco", "abc'");
        IonTextReaderTests.first_value_equal('"abc\\""', 'abc"');
        IonTextReaderTests.first_value_equal('"abc\\"" taco', 'abc"');
        IonTextReaderTests.first_value_equal("'\\\n'", "");
        IonTextReaderTests.first_value_equal("'''short1\\\n'''\n\n'''\\\nmulti-line string\nwith embedded\\nnew line\ncharacters\\\n'''", "short1multi-line string\nwith embedded\nnew line\ncharacters");

    };



    @test "text IVM"() {
        let textReader = ion.makeReader("");
        let isNotIVM = ["$ion_schema_1_0", "$ion_1", "$ion_1_a", "$ion_", "ion_1_"];
        let unsupportedIVM = ["$ion_2_0", "$ion_1_999", "$ion_999_0", "$ion_1_1", "$ion_1_00"];

        IonTextReaderTests.ivmTest(textReader, "$ion_1_0", true, 0, []);
        IonTextReaderTests.ivmTest(textReader, "$ion_1_0", false, 1, []);
        IonTextReaderTests.ivmTest(textReader, "$ion_1_0", false, 0, ["taco"]);
        for (let i = 0; i < isNotIVM.length; i++) {
            IonTextReaderTests.ivmTest(textReader, isNotIVM[i], false, 0, []);
        }
        for (let i = 0; i < unsupportedIVM.length; i++) {
            IonTextReaderTests.ivmTest(textReader, unsupportedIVM[i], "throw", 0, []);
            IonTextReaderTests.ivmTest(textReader, unsupportedIVM[i], false, 1, []);
            IonTextReaderTests.ivmTest(textReader, unsupportedIVM[i], false, 0, ["taco"]);
        }
    }
}
