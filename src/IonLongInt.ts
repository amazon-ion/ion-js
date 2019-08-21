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

import * as bigInt from "./BigInteger.js";
import { BigInteger } from "./BigInteger";
import { _sign } from "./util";

export class LongInt {
    public static readonly _zero : LongInt = new LongInt(0);
    private int : BigInteger;

    constructor(input: string | number | BigInteger) {
        if(typeof input === 'string') {
            let s = input.trim();
            if (s[0] === '-') {
                // this ensures this.int.sign is correct for -0:
                this.int = bigInt(s.substr(1)).negate();
            } else {
                this.int = bigInt(s);
            }
        } else if(typeof input === 'number') {
            if (input === 0 && _sign(input) === -1) {
                // this ensures this.int.sign is correct for -0:
                this.int = bigInt(0).negate();
            } else {
                this.int = bigInt(input);
            }
        } else if(input instanceof bigInt) {
            this.int = input;
        } else {
            throw new Error("Invalid LongInt parameters")
        }
    }

    public uIntBytes() : Uint8Array {
        return new Uint8Array(this.int.toArray(256).value);
    }

    public intBytes() : Uint8Array {
        let array =  this.int.toArray(256).value;
        if(array[0] > 127) {
            // highest-order bit is being used to represent part of the value,
            // so prepend a byte to allow for encoding of the sign bit
            array.splice(0, 0, 0);
        }
        if(this.signum() === -1) array[0] += 0x80;
        return new Uint8Array(array);
    }

    public varIntBytes() : Uint8Array {
        let array =  this.int.toArray(128).value;
        if(array[0] > 0x20) {
            array[0] -= 0x80;
            array.splice(0, 0, 1);
        }
        if(this.signum() === -1) array[0] += 0x40;
        array[array.length - 1] += 0x80;
        return new Uint8Array(array);
    }

    public varUIntBytes() : Uint8Array {
        let buf = new Uint8Array(this.int.toArray(128).value);
        buf[buf.length - 1] += 0x80;
        return buf;
    }

    public static fromUIntBytes(bytes : number[]) : LongInt {
        return new LongInt(bigInt.fromArray(bytes, 256, false));
    }

    public static fromIntBytes(bytes : number[], isNegative : boolean) : LongInt {
        return new LongInt(bigInt.fromArray(bytes, 256, isNegative));
    }

    public static fromVarIntBytes(bytes : number[], isNegative : boolean) : LongInt {
        return new LongInt(bigInt.fromArray(bytes, 128, isNegative));
    }

    public static fromVarUIntBytes(bytes : number[]) : LongInt {
        return new LongInt(bigInt.fromArray(bytes, 128, false));
    }

    isZero() : boolean {
        return this.int.isZero();
    }

    negate() : void {
        this.int.negate();
    }

    public add(num : number | LongInt) : LongInt {
        if(num instanceof LongInt) return new LongInt(this.int.add(num.int));
        return new LongInt(this.int.add(num));
    }

    public subtract(num : number | LongInt) : LongInt {
        if(num instanceof LongInt) return new LongInt(this.int.add(num.int));
        return new LongInt(this.int.add(num));
    }

    public multiply(num : number | LongInt) : LongInt {
        if(num instanceof LongInt) return new LongInt(this.int.multiply(num.int));
        return new LongInt(this.int.multiply(num));
    }

    public divide(num: number | LongInt) : LongInt {
        if(num instanceof LongInt) return new LongInt(this.int.divide(num.int));
        return new LongInt(this.int.divide(num));
    }

    public mathPow(num : number) : LongInt {
        let val : BigInteger = bigInt(num);
        return new LongInt(this.int.pow(val));
    }

    public lessThan(expected : LongInt) : boolean{
        return this.int.lesser(expected.int);
    }

    public greaterThan(expected : LongInt) : boolean{
        return this.int.greater(expected.int);
    }

    public equals(expected : LongInt) : boolean{
        return this.int.equals(expected.int);
    }
    public geq(expected : LongInt) : boolean{
        return this.int.geq(expected.int);
    }

    public leq(expected : LongInt) : boolean{
        return this.int.leq(expected.int);
    }

    numberValue() : number {
        return this.int.toJSNumber();
    }

    toString() : string {
        return this.int.toString(10);
    }

    signum() : number {
        if(this.int.isZero()) {
            if(1 / this.int.valueOf() > 0) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return this.int.isPositive() ? 1 : -1;
        }

    }
}
