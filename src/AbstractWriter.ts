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
import {Writer} from "./IonWriter";

// @ts-ignore: 'AbstractWriter' is missing properties from type 'Writer'
export abstract class AbstractWriter implements Writer {
    protected _annotations = [];

    addAnnotation(annotation: string): void {
        this._annotations.push(annotation);
    }

    setAnnotations(annotations: string[]): void {
        this._annotations = annotations;
    }

    protected _clearAnnotations(): void {
        this._annotations = [];
    }
}

