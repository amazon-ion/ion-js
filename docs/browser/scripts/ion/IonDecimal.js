define(["require", "exports", "./IonText", "./IonLongInt"], function (require, exports, IonText_1, IonLongInt_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Decimal {
        constructor(_value, _exponent) {
            this._value = _value;
            this._exponent = _exponent;
        }
        isZero() {
            if (this.isNull())
                return false;
            return this._value.isZero();
        }
        isNegative() {
            return this._value.signum() === -1;
        }
        isNegativeZero() {
            return this.isZero() && this.isNegative();
        }
        isZeroZero() {
            if (this.isZero()) {
                if (this._exponent >= -1) {
                    return (this._value.signum() >= 0);
                }
            }
            return false;
        }
        numberValue() {
            var n = this._value.numberValue();
            n = n * Math.pow(10, this._exponent);
            return n;
        }
        getNumber() {
            return this.numberValue();
        }
        toString() {
            return this.stringValue();
        }
        stringValue() {
            if (this.isNull()) {
                return "null.decimal";
            }
            let s = this._exponent;
            let image = this._value.digits();
            if (s < 0) {
                if (image.length < s + 1) {
                    for (let i = s + 1 - image.length; i > 0; i--) {
                        image = "0" + image;
                    }
                }
                let decimal_location = image.length + s;
                if (decimal_location === 0) {
                    image = '0.' + image;
                }
                else {
                    image = image.substr(0, decimal_location) + "." + image.substr(decimal_location);
                }
            }
            else if (s > 0) {
                if (image.length > 1) {
                    s = s + image.length - 1;
                    image = image.substr(0, 1) + "." + image.substr(1);
                }
                image = image + "d" + s.toString();
            }
            if (this.isNegative()) {
                image = "-" + image;
            }
            return image;
        }
        isNull() {
            var isnull = (this._value === undefined);
            return isnull;
        }
        getDigits() {
            return this._value;
        }
        getExponent() {
            return this._exponent;
        }
        static parse(str) {
            let index = 0;
            let exponent = 0;
            let c;
            let isNegative = false;
            c = str.charCodeAt(index);
            if (c === '+'.charCodeAt(0)) {
                index++;
            }
            else if (c === '-'.charCodeAt(0)) {
                isNegative = true;
                index++;
            }
            else if (c === 'n'.charCodeAt(0)) {
                if (str == 'null' || str == 'null.decimal') {
                    return Decimal.NULL;
                }
            }
            let digits = Decimal.readDigits(str, index);
            index += digits.length;
            digits = Decimal.stripLeadingZeroes(digits);
            if (index === str.length) {
                let trimmedDigits = Decimal.stripTrailingZeroes(digits);
                exponent += digits.length - trimmedDigits.length;
                return new Decimal(new IonLongInt_1.LongInt(trimmedDigits, null, isNegative ? -1 : 1), exponent);
            }
            let hasDecimal = false;
            c = str.charCodeAt(index);
            if (c === '.'.charCodeAt(0)) {
                hasDecimal = true;
                index++;
                let mantissaDigits = Decimal.readDigits(str, index);
                index += mantissaDigits.length;
                exponent -= mantissaDigits.length;
                digits = digits.concat(mantissaDigits);
            }
            if (!hasDecimal) {
                let trimmedDigits = Decimal.stripTrailingZeroes(digits);
                exponent += digits.length - trimmedDigits.length;
                digits = trimmedDigits;
            }
            if (index === str.length) {
                return new Decimal(new IonLongInt_1.LongInt(digits, null, isNegative ? -1 : 1), exponent);
            }
            c = str.charCodeAt(index);
            if (c !== 'd'.charCodeAt(0) && c !== 'D'.charCodeAt(0)) {
                throw new Error(`Invalid decimal ${str}`);
            }
            index++;
            let isExplicitExponentNegative = false;
            c = str.charCodeAt(index);
            if (c === '+'.charCodeAt(0)) {
                index++;
            }
            else if (c === '-'.charCodeAt(0)) {
                isExplicitExponentNegative = true;
                index++;
            }
            let explicitExponentDigits = Decimal.readDigits(str, index);
            let explicitExponent = parseInt(explicitExponentDigits, 10);
            if (isExplicitExponentNegative) {
                explicitExponent = -explicitExponent;
            }
            exponent += explicitExponent;
            index += explicitExponentDigits.length;
            if (index !== str.length) {
                throw new Error(`Invalid decimal ${str}`);
            }
            let decimal = new Decimal(new IonLongInt_1.LongInt(digits, null, isNegative ? -1 : 1), exponent);
            return decimal;
        }
        static readDigits(s, offset) {
            let digits = 0;
            for (let i = offset; i < s.length; i++) {
                if (IonText_1.is_digit(s.charCodeAt(i))) {
                    digits++;
                }
                else {
                    break;
                }
            }
            return s.slice(offset, offset + digits);
        }
        static stripLeadingZeroes(s) {
            let i = 0;
            for (; i < s.length - 1; i++) {
                if (s.charCodeAt(i) !== '0'.charCodeAt(0)) {
                    break;
                }
            }
            return (i > 0) ? s.slice(i) : s;
        }
        static stripTrailingZeroes(s) {
            let i = s.length - 1;
            for (; i >= 1; i--) {
                if (s.charCodeAt(i) !== '0'.charCodeAt(0)) {
                    break;
                }
            }
            return (i < s.length - 1) ? s.slice(0, i + 1) : s;
        }
    }
    Decimal.NULL = new Decimal(undefined, undefined);
    Decimal.ZERO = new Decimal(IonLongInt_1.LongInt.ZERO, 0);
    exports.Decimal = Decimal;
});
//# sourceMappingURL=IonDecimal.js.map