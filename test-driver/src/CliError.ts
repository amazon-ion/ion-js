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

import {IonTypes, makeTextWriter} from "ion-js";

/** Error Types symbol[READ | WRITE | STATE] */
export enum ErrorType {
    READ = "READ",
    WRITE = "WRITE",
    STATE = "STATE"
}

/** Error structure for error report
 * for more information: https://github.com/amzn/ion-test-driver#errorreport
 */
export class IonCliError {
    errorType: ErrorType;
    eventIndex: number;
    location: string;
    message: string;
    errorReportFile: any;

    constructor(errorType: ErrorType, location: string, message: string, errorReportFile: any, eventIndex: number = 0) {
        this.errorType = errorType;
        this.location = location;
        this.message = message;
        this.errorReportFile = errorReportFile;
        this.eventIndex = eventIndex;
    }

    writeErrorReport() {
        let writer = makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('error_type');
        writer.writeSymbol(this.errorType);
        writer.writeFieldName('message');
        writer.writeString(this.message);
        writer.writeFieldName('location');
        writer.writeString(this.location);
        writer.writeFieldName('event_index');
        writer.writeInt(this.eventIndex);
        writer.stepOut();
        this.errorReportFile.write(writer.getBytes());
        this.errorReportFile.write("\n");
    }
}