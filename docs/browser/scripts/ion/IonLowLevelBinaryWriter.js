define(["require", "exports", "./IonUtilities", "./IonUtilities", "./IonWriteable"], function (require, exports, IonUtilities_1, IonUtilities_2, IonWriteable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LowLevelBinaryWriter {
        constructor(writeableOrLength) {
            this.numberBuffer = new Array(10);
            if (IonUtilities_1.isNumber(writeableOrLength)) {
                this.writeable = new IonWriteable_1.Writeable(writeableOrLength, 0);
            }
            else {
                this.writeable = writeableOrLength;
            }
        }
        writeSignedInt(originalValue, length) {
            if (length > this.numberBuffer.length) {
                this.numberBuffer = new Array(length);
            }
            let value = Math.abs(originalValue);
            let i = this.numberBuffer.length;
            while (value >= 128) {
                this.numberBuffer[--i] = value & 0xFF;
                value >>>= 8;
            }
            this.numberBuffer[--i] = value;
            let bytesWritten = this.numberBuffer.length - i;
            for (let j = 0; j < length - bytesWritten; j++) {
                this.numberBuffer[--i] = 0;
            }
            if (bytesWritten > length) {
                throw new Error(`Value ${value} cannot fit into ${length} bytes`);
            }
            if (originalValue < 0) {
                this.numberBuffer[i] |= 0x80;
            }
            this.writeable.writeBytes(this.numberBuffer, i);
        }
        writeUnsignedInt(originalValue, length) {
            if (IonUtilities_2.isUndefined(length)) {
                length = LowLevelBinaryWriter.getUnsignedIntSize(originalValue);
            }
            if (length > this.numberBuffer.length) {
                this.numberBuffer = new Array(length);
            }
            let value = originalValue;
            let i = this.numberBuffer.length;
            while (value > 0) {
                this.numberBuffer[--i] = value & 0xFF;
                value >>>= 8;
            }
            let bytesWritten = this.numberBuffer.length - i;
            for (let j = 0; j < length - bytesWritten; j++) {
                this.numberBuffer[--i] = 0;
            }
            if (bytesWritten > length) {
                throw new Error(`Value ${value} cannot fit into ${length} bytes`);
            }
            this.writeable.writeBytes(this.numberBuffer, i);
        }
        writeVariableLengthSignedInt(originalValue) {
            if (!Number['isInteger'](originalValue)) {
                throw new Error(`Cannot call writeVariableLengthSignedInt with non-integer value ${originalValue}`);
            }
            let value = Math.abs(originalValue);
            let i = this.numberBuffer.length - 1;
            while (value >= 64) {
                this.numberBuffer[i--] = value & 0x7F;
                value >>>= 7;
            }
            this.numberBuffer[i] = value;
            if (originalValue < 0) {
                this.numberBuffer[i] |= 0x40;
            }
            this.numberBuffer[this.numberBuffer.length - 1] |= 0x80;
            this.writeable.writeBytes(this.numberBuffer, i, this.numberBuffer.length - i);
        }
        writeVariableLengthUnsignedInt(originalValue) {
            let value = originalValue;
            let i = this.numberBuffer.length;
            this.numberBuffer[--i] = (value & 0x7F) | 0x80;
            value >>>= 7;
            while (value > 0) {
                this.numberBuffer[--i] = value & 0x7F;
                value >>>= 7;
            }
            this.writeable.writeBytes(this.numberBuffer, i);
        }
        writeByte(byte) {
            this.writeable.writeByte(byte);
        }
        writeBytes(bytes) {
            this.writeable.writeBytes(bytes);
        }
        getBytes() {
            return this.writeable.getBytes();
        }
        static getUnsignedIntSize(value) {
            if (value === 0) {
                return 1;
            }
            let numberOfBits = Math.floor(Math['log2'](value)) + 1;
            let numberOfBytes = Math.ceil(numberOfBits / 8);
            return numberOfBytes;
        }
        static getVariableLengthSignedIntSize(value) {
            let absoluteValue = Math.abs(value);
            if (absoluteValue === 0) {
                return 1;
            }
            let valueBits = Math.floor(Math['log2'](absoluteValue)) + 1;
            let trailingStopBits = Math.floor(valueBits / 7);
            let leadingStopBit = 1;
            let signBit = 1;
            return Math.ceil((valueBits + trailingStopBits + leadingStopBit + signBit) / 8);
        }
        static getVariableLengthUnsignedIntSize(value) {
            if (value === 0) {
                return 1;
            }
            let valueBits = Math.floor(Math['log2'](value)) + 1;
            let stopBits = Math.ceil(valueBits / 7);
            return Math.ceil((valueBits + stopBits) / 8);
        }
    }
    exports.LowLevelBinaryWriter = LowLevelBinaryWriter;
});
//# sourceMappingURL=IonLowLevelBinaryWriter.js.map