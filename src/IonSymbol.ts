/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { asAscii } from "./IonText";

export class Symbol {
  sid: number;
  name: string;

  constructor(id: number, val: string) {
    this.sid = id;
    this.name = val;
  }

  toString() : string {
    var s = "sym::{id:" + asAscii(this.sid) + ",val:\"" + asAscii(this.name) + "\"";
    return s;
  }
}
