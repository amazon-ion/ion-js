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

import {OutputFormat} from "./OutputFormat";
import fs from "fs";
import yargs from "yargs";

/** common CLI arguments structure
 *  for more information: https://github.com/amzn/ion-test-driver#standardized-cli
 */
export class IonCliCommonArgs {
    inputFiles: Array<string>;
    outputFormatName: OutputFormat;

    // outputFile,errorReportFile: 'any' datatype to use stdout as well as file write stream to write ion data
    // for more information : https://github.com/amzn/ion-js/issues/627
    outputFile: any;
    errorReportFile: any;

    constructor(argv: yargs.Arguments) {
        this.outputFile = argv["output"] ? fs.createWriteStream(argv["output"] as string, {flags: 'w'}) : process.stdout;
        // create error output stream (DEFAULT: stderr)
        this.errorReportFile = argv["error-report"] ? fs.createWriteStream(argv["error-report"] as string, {flags: 'w'}) : process.stderr;
        this.outputFormatName = argv["output-format"] as OutputFormat;
        this.inputFiles = argv["input-file"] as Array<string>;
    }

    getOutputFile(): any {
        return this.outputFile;
    }

    getErrorReportFile(): any {
        return this.errorReportFile;
    }

    getInputFiles(): Array<string> {
        return this.inputFiles;
    }

    getOutputFormatName(): OutputFormat {
        return this.outputFormatName;
    }
}