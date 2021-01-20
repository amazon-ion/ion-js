/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import {dom, IonTypes} from '../src/Ion';
import {exampleIonValuesWhere, exampleJsValuesWhere} from "./exampleValues";

function roundTripTests(...values: any[]) {
    let expectedValues: dom.Value[] = values.map((jsValue) => dom.Value.from(jsValue));
    it(`dumpBinary(${values})`, () => roundTripTest(ion.dumpBinary, values, expectedValues));
    it(`dumpText(${values})`,() => roundTripTest(ion.dumpText, values, expectedValues));
    it(`dumpPrettyText(${values})`, () => roundTripTest(ion.dumpPrettyText, values, expectedValues));
}

// Dumps the provided values to Ion using the specified dump*() function, uses loadAll() to read the values
// back in, then compares the input values to the loaded values.
function roundTripTest(dumpFn: (...values: any[]) => any,
                       inputValues: any[],
                       expectedValues: dom.Value[]) {
    let actualValues: dom.Value[] = dom.loadAll(dumpFn(inputValues));
    expectedValues.forEach((expectedValue, index) => {
       let actualValue = actualValues[index];
        //TODO: This tests for a very weak common definition of equality.
        //      We should make this a stronger test when .equals() is added to the Value interface[1].
        //      In the meantime, the core writing/equality logic is more strictly tested by
        //      test/dom/Value.ts, which evaluates the data produced by the Value.writeTo() function
        //      at the core of the ion.dump*() methods.
        //      [1] https://github.com/amzn/ion-js/issues/576
        assert.deepEqual(actualValue.getAnnotations(), expectedValue.getAnnotations());
        assert.equal(actualValue.isNull(), expectedValue.isNull());
        assert.equal(actualValue.getType(), expectedValue.getType());
    });
}

describe('dump*()', () => {
    describe('Round tripping JS values', () => {
        roundTripTests(exampleJsValuesWhere())
    });
    describe('Round tripping Ion values', () => {
        roundTripTests(exampleIonValuesWhere())
    });
    it('Text stream', () => {
        let ionText = ion.dumpText(null, 7, "Hello", [1, 2, 3]);
        assert.equal(ionText, 'null\n7\n"Hello"\n[1,2,3]');
    });
    it('Pretty text stream', () => {
        let ionPrettyText = ion.dumpPrettyText(null, 7, "Hello", [1, 2, 3]);
        assert.equal(ionPrettyText, 'null\n7\n"Hello"\n[\n  1,\n  2,\n  3\n]');
    });
    it('Binary stream', () => {
        let ionBinary: Uint8Array = ion.dumpBinary(null, 7, "Hello", [1, 2, 3]);
        let writer = ion.makeBinaryWriter();
        writer.writeNull(IonTypes.NULL);
        writer.writeInt(7);
        writer.writeString("Hello");
        writer.stepIn(IonTypes.LIST);
        writer.writeInt(1);
        writer.writeInt(2);
        writer.writeInt(3);
        writer.stepOut();
        writer.close();
        assert.deepEqual(ionBinary, writer.getBytes());
    });
    it('Struct with annotated field large enough to require a VarUInt length', () => {
        let ionText = "{a: b:: \"abcdefghijkl\"}";
        let ionValue = ion.load(ionText);
        let binaryIonBytes = ion.dumpBinary(ionValue);
        let ionBinaryValue = ion.load(binaryIonBytes);
        assert.deepEqual(ionValue, ionBinaryValue);
    });
    it('Struct with annotated field large enough to require a VarUInt length', () => {
        // this ionText is taken from https://github.com/amzn/ion-js/issues/621
        let ionText = "'com.example.organization.model.data.ClassName2@1.0'::{\n" +
            "  values: [\n" +
            "    'com.example.organization.model.data.ClassName1@1.0'::{\n" +
            "      field_name_1: 'com.example.organization.model.types.ClassName1@1.0'::{\n" +
            "        field_name_2: 'com.example.organization.model.types.ClassName2@1.0'::{\n" +
            "          field_name_3: 9999999999.00,\n" +
            "          field_name_4: ABC\n" +
            "        }\n" +
            "      },\n" +
            "      field_name_5: AB\n" +
            "    },\n" +
            "    'com.example.organization.model.data.ClassName1@1.0'::{\n" +
            "      field_name_1: 'com.example.organization.model.types.ClassName1@1.0'::{\n" +
            "        field_name_2: 'com.example.organization.model.types.ClassName2@1.0'::{\n" +
            "          field_name_3: 9999999999.00,\n" +
            "          field_name_4: DEF\n" +
            "        }\n" +
            "      },\n" +
            "      field_name_5: CD\n" +
            "    }\n" +
            "  ]\n" +
            "}";
        let ionValue = ion.load(ionText);
        let binaryIonBytes = ion.dumpBinary(ionValue);
        let ionBinaryValue = ion.load(binaryIonBytes);
        assert.deepEqual(ionValue, ionBinaryValue);
    })
});
