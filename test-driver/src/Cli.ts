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

import yargs from "yargs";

/**
 * This will cause `yargs` to look in other .ts/.js files in the same directory for command modules.
 *
 * For more information, see:
 * Command modules: https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module
 * commandDir: https://github.com/yargs/yargs/blob/master/docs/advanced.md#commanddirdirectory-opts
 */
yargs
    .commandDir(__dirname,{
        extensions: ['ts','js'],
    })
    .options({
        'output': {
            alias: 'o',
            description: 'Output location. [default: stdout]',
        },
        'output-format': {
            alias: 'f',
            choices: ['pretty', 'text', 'binary', 'events', 'none'] as const,
            default: 'pretty',
            description: "Output format, from the set (text | pretty | binary |\n"
                + "events | none). 'events' is only available with the\n"
                + "'process' command, and outputs a serialized EventStream\n"
                + "representing the input Ion stream(s)."
        },
        'error-report': {
            alias: 'e',
            description: 'ErrorReport location. [default: stderr]',
        }
    }).argv;








