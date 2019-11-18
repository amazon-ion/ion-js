/*
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

/**
 * Returns -1 if x is negative (including -0); otherwise returns 1.
 */
export function _sign(x: number): number {
    return (x < 0 || (x === 0 && (1 / x) === -Infinity)) ? -1 : 1
}

/**
 * Returns false if v is undefined or null; otherwise true.
 * @private
 */
export function _hasValue(v: any): boolean {
    return v !== undefined && v !== null;
}
