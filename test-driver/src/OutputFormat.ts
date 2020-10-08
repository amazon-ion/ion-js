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

import {Writer} from 'ion-js';
import {
    makePrettyWriter,
    makeBinaryWriter,
    makeTextWriter
} from 'ion-js';

export enum OutputFormat {
    PRETTY = "pretty",
    TEXT = "text",
    BINARY = "binary",
    EVENTS = "events",
    NONE = "none"
}

/** gets the writer corresponding to the output format **/
export namespace OutputFormat {
    export function createIonWriter(name: OutputFormat) : Writer | null {
        switch (name) {
            case OutputFormat.PRETTY:
                return makePrettyWriter();
            case OutputFormat.TEXT:
                return makeTextWriter();
            case OutputFormat.BINARY:
                return makeBinaryWriter();
            case OutputFormat.EVENTS:
                return makePrettyWriter();
            case OutputFormat.NONE:
                return null;
            default:
                throw new Error("Output Format " + name + " unexpected.");
        }
    }
}