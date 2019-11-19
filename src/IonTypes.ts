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

import {IonType} from "./IonType";

/** Enumeration of the Ion types. */
export const IonTypes = {
    NULL      : new IonType( 0, "null",      true,  false, false, false),
    BOOL      : new IonType( 1, "bool",      true,  false, false, false),
    // note that INT is actually 0x2 **and** 0x3 in the Ion binary encoding
    INT       : new IonType( 2, "int",       true,  false, true,  false),
    FLOAT     : new IonType( 4, "float",     true,  false, true,  false),
    DECIMAL   : new IonType( 5, "decimal",   true,  false, false, false),
    TIMESTAMP : new IonType( 6, "timestamp", true,  false, false, false),
    SYMBOL    : new IonType( 7, "symbol",    true,  false, false, false),
    STRING    : new IonType( 8, "string",    true,  false, false, false),
    CLOB      : new IonType( 9, "clob",      true,  true,  false, false),
    BLOB      : new IonType(10, "blob",      true,  true,  false, false),
    LIST      : new IonType(11, "list",      false, false, false, true),
    SEXP      : new IonType(12, "sexp",      false, false, false, true),
    STRUCT    : new IonType(13, "struct",    false, false, false, true),
};
