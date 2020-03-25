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
import {Decimal, IonType, Reader, Timestamp, Writer} from "../src/Ion";
import JSBI from "jsbi";

// This dummy impl exists as a substitute for reflection directly against
// the Writer interface (which TypeScript doesn't currently support)
class NoopWriter implements Writer {
    addAnnotation(annotation: string): void { }
    close(): void { }
    depth(): number { return 0; }
    getBytes(): Uint8Array { return new Uint8Array(); }
    setAnnotations(annotations: string[]): void { }
    stepIn(type: IonType): void { }
    stepOut(): void { }
    writeBlob(value: Uint8Array | null): void { }
    writeBoolean(value: boolean | null): void { }
    writeClob(value: Uint8Array | null): void { }
    writeDecimal(value: Decimal | null): void { }
    writeFieldName(fieldName: string): void { }
    writeFloat32(value: number | null): void { }
    writeFloat64(value: number | null): void { }
    writeInt(value: number | JSBI | null): void { }
    writeNull(type: IonType): void { }
    writeString(value: string | null): void { }
    writeSymbol(value: string | null): void { }
    writeTimestamp(value: Timestamp | null): void { }
    writeValue(reader: Reader): void { }
    writeValues(reader: Reader): void { }
}

describe('IonWriterUndefinedParameters', () => {
    let testMethods = Reflect.ownKeys(NoopWriter.prototype)
        .map(method => method.toString())
        .filter(name => name.startsWith('write'))
        .filter(name => name !== 'writeNull')
        .concat('addAnnotation', 'setAnnotations', 'stepIn');

    let writerTypes = [
        {name: 'Binary', instance: ion.makeBinaryWriter()},
        {name: 'Text',   instance: ion.makeTextWriter()},
        {name: 'Pretty', instance: ion.makePrettyWriter()},
    ];
    writerTypes.forEach(writerType => {
        let writer = writerType.instance;
        describe(writerType.name + ' writer', () => {
            testMethods.forEach(function(method) {
                it(method + '(undefined) throws', function() {
                    assert.throws(() => writer[method](undefined));
                });
            });
        });
    });
});

