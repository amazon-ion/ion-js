/
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved
 
 * Licensed under the Apache License, Version 2.0 (the "License")
 * You may not use this file except in compliance with the License
 * A copy of the License is located at
 
 *     http://aws.amazon.com/apache2.0
 
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specifi
 * language governing permissions and limitations under the License
 *

export class IonType 
  bid: number
  name: string
  scalar: boolean
  lob: boolean
  num: boolean
  container: boolean

  constructor(bid: number, name: string, scalar: boolean, lob: boolean, num: boolean, container: boolean) 
    this.bid = bid
    this.name = name
    this.scalar = scalar
    this.lob = lob
    this.num = num
    this.container = container
  

