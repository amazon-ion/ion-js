define(["require", "exports", "./IonUtilities", "./IonUtilities"], function (require, exports, IonUtilities_1, IonUtilities_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const DEFAULT_BUFFER_SIZE = 4096;
    class Writeable {
        constructor(bufferInitialSize = DEFAULT_BUFFER_SIZE, bufferGrowthSize = DEFAULT_BUFFER_SIZE) {
            this.bufferGrowthSize = bufferGrowthSize;
            this.buffers = [new Array(bufferInitialSize)];
            this.index = 0;
            this.written = 0;
        }
        writeByte(b) {
            if (this.capacity() === 0) {
                this.allocate();
                IonUtilities_2.last(this.buffers)[0] = b;
                this.index = 1;
                this.written += 1;
            }
            else {
                IonUtilities_2.last(this.buffers)[this.index] = b;
                this.index += 1;
                this.written += 1;
            }
        }
        writeBytes(b, offset = 0, length) {
            if (IonUtilities_1.isUndefined(length)) {
                length = b.length - offset;
            }
            let remaining = length;
            while (remaining > 0) {
                if (this.capacity() == 0) {
                    this.allocate();
                    this.index = 0;
                }
                let buffer = IonUtilities_2.last(this.buffers);
                let limit = Math.min(remaining, this.capacity());
                for (let i = 0; i < limit; i++) {
                    buffer[this.index + i] = b[offset + i];
                }
                remaining -= limit;
                this.index += limit;
                this.written += limit;
            }
        }
        writeStream(it) {
            for (let b of it) {
                this.writeByte(b);
            }
        }
        capacity() {
            return IonUtilities_2.last(this.buffers).length - this.index;
        }
        allocate() {
            if (this.bufferGrowthSize === 0) {
                "Cannot allocate additional capacity in a fixed-size writeable";
            }
            this.buffers.push(new Array(this.bufferGrowthSize));
        }
        getBytes() {
            let singleFullBuffer = (this.buffers.length == 1) && this.index == IonUtilities_2.last(this.buffers).length;
            if (singleFullBuffer) {
                return IonUtilities_2.last(this.buffers);
            }
            let result = new Array(this.written);
            let offset = 0;
            for (let i = 0; i < this.buffers.length; i++) {
                let buffer = this.buffers[i];
                let limit = Math.min(this.written - offset, buffer.length);
                for (let j = 0; j < limit; j++) {
                    result[offset++] = buffer[j];
                }
            }
            this.buffers = [result];
            this.index = this.written;
            return result;
        }
    }
    exports.Writeable = Writeable;
});
//# sourceMappingURL=IonWriteable.js.map