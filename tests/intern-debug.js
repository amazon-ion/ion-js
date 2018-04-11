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
define({
  defaultTimeout: 2000, // ms
  excludeInstrumentation: true, // disable codecoverate instrucmentation to allow debugging 
  filterErrorStack: true,
  suites: [
    'tests/unit/textNulls',
    'tests/unit/spans',
    'tests/unit/iontests',
    'tests/unit/IonCatalogTest',
    'tests/unit/IonImportTest',
    'tests/unit/IonLocalSymbolTableTest',
    'tests/unit/IonDecimalTest',
    'tests/unit/IonWriteableTest',
    'tests/unit/IonTimestampTest',
    'tests/unit/IonTextTest',
    'tests/unit/IonTextWriterTest',
    'tests/unit/IonUnicodeTest',
    'tests/unit/IonLowLevelBinaryWriterTest',
    'tests/unit/IonBinaryWriterTest',
    'tests/unit/IonBinaryTimestampTest',
  ],
});
