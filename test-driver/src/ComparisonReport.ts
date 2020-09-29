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

import {ComparisonType} from "./Compare";
import {IonTypes, makeTextWriter} from "ion-js";
import {ComparisonContext} from "./ComparisonContext";
import {ComparisonResultType} from "ion-js";

/** comparison report structure for compare
 *  for more information: https://github.com/amzn/ion-test-driver#comparisonreport
 */
export class IonComparisonReport {
    lhs: ComparisonContext;
    rhs: ComparisonContext;
    comparisonReportFile: any;
    comparisonType: ComparisonType;

    constructor(lhs: ComparisonContext, rhs: ComparisonContext, comparisonReportFile: any, comparisonType: ComparisonType) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.comparisonReportFile = comparisonReportFile;
        this.comparisonType = comparisonType;
    }

    writeComparisonReport(result: ComparisonResultType, message: string, event_index_lhs: number, event_index_rhs: number) {
        let writer = makeTextWriter();
        writer.stepIn(IonTypes.STRUCT);
        writer.writeFieldName('result');
        writer.writeSymbol(result);
        this.lhs.writeComparisonContext(writer, "lhs", event_index_lhs);
        this.rhs.writeComparisonContext(writer, "rhs", event_index_rhs);
        writer.writeFieldName('message');
        writer.writeString(message);
        writer.stepOut();
        this.comparisonReportFile.write(writer.getBytes());
        this.comparisonReportFile.write("\n");
    }
}