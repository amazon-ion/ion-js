/*
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
/**
 * A collection of general language-level helper methods.
 */
export function isNumber(value: any) : value is number {
  return typeof(value) == 'number';
}

export function isString(value: any) : value is string {
  return typeof(value) == 'string';
}

export function isUndefined(value: any) : boolean {
  return typeof(value) == 'undefined';
}

export function isNullOrUndefined(value: any) : boolean {
  return isUndefined(value) || value === null;
}

export function last<T>(array: T[]) : T {
  if (!array || array.length === 0) {
    return undefined;
  }
  return array[array.length - 1];
}

type Comparator<T> = (x: T, y: T) => number;

export function max<T>(array: T[], comparator: Comparator<T>): T {
  let best: T;
  if (array) {
    for (let element of array) {
      if (!best || comparator(best, element) < 0) {
        best = element;
      }
    }
  }
  return best;
}
