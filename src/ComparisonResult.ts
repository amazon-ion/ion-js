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

/** Comparison result types for the comparison report
 *  EQUALS: Indicates the input streams are equal
 *  NOT_EQUAL: Indicates the input streams are not equal
 *  ERROR: For all the cases where an error occurs while reading or writing input streams
 */
export enum ComparisonResultType {
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  ERROR = "ERROR",
}

/**
 * comparison result with event index and message
 */
export class ComparisonResult {
  message: string;
  result: ComparisonResultType;
  actualIndex: number;
  expectedIndex: number;

  constructor(
    result: ComparisonResultType = ComparisonResultType.EQUAL,
    message: string = "",
    actualIndex: number = 0,
    expectedIndex: number = 0,
  ) {
    this.result = result;
    this.message = message;
    this.actualIndex = actualIndex;
    this.expectedIndex = expectedIndex;
  }
}
