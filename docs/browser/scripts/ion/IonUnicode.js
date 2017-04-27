define(["require", "exports", "./IonWriteable"], function (require, exports, IonWriteable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const SIX_BIT_MASK = 0x3F;
    const TEN_BIT_MASK = 0x3FF;
    const HIGH_SURROGATE_OFFSET = 0xD800;
    const LOW_SURROGATE_MASK = 0xFC00;
    const LOW_SURROGATE_OFFSET = 0xDC00;
    const LOW_SURROGATE_END = 0xE000;
    function isHighSurrogate(charCode) {
        return charCode >= HIGH_SURROGATE_OFFSET && charCode < LOW_SURROGATE_OFFSET;
    }
    function encodeUtf8(s) {
        let writeable = new IonWriteable_1.Writeable(s.length, s.length);
        for (let b of encodeUtf8Stream(charCodes(s))) {
            writeable.writeByte(b);
        }
        return writeable.getBytes();
    }
    exports.encodeUtf8 = encodeUtf8;
    function* encodeUtf8Stream(it) {
        let pushback = -1;
        for (;;) {
            let codePoint;
            if (pushback !== -1) {
                codePoint = pushback;
                pushback = -1;
            }
            else {
                let r = it.next();
                if (r.done) {
                    return;
                }
                else {
                    codePoint = r.value;
                }
            }
            if (codePoint < 128) {
                yield codePoint;
            }
            else if (codePoint < 2048) {
                yield 0xC0 | (codePoint >>> 6);
                yield 0x80 | (codePoint & SIX_BIT_MASK);
            }
            else if (codePoint < HIGH_SURROGATE_OFFSET) {
                yield 0xE0 | (codePoint >>> 12);
                yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                yield 0x80 | (codePoint & SIX_BIT_MASK);
            }
            else if (codePoint < LOW_SURROGATE_OFFSET) {
                let r2 = it.next();
                if (r2.done) {
                    yield 0xE0 | (codePoint >>> 12);
                    yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                    yield 0x80 | (codePoint & SIX_BIT_MASK);
                    return;
                }
                let codePoint2 = r2.value;
                let hasLowSurrogate = (codePoint2 & LOW_SURROGATE_MASK) === LOW_SURROGATE_OFFSET;
                if (hasLowSurrogate) {
                    let highSurrogate = codePoint - HIGH_SURROGATE_OFFSET;
                    let lowSurrogate = codePoint2 - LOW_SURROGATE_OFFSET;
                    codePoint = 0x10000 + (highSurrogate << 10) | lowSurrogate;
                    yield 0xF0 | (codePoint >>> 18);
                    yield 0x80 | ((codePoint >>> 12) & SIX_BIT_MASK);
                    yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                    yield 0x80 | (codePoint & SIX_BIT_MASK);
                }
                else {
                    yield 0xE0 | (codePoint >>> 12);
                    yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                    yield 0x80 | (codePoint & SIX_BIT_MASK);
                    pushback = codePoint2;
                }
            }
            else if (codePoint < 65536) {
                yield 0xE0 | (codePoint >>> 12);
                yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                yield 0x80 | (codePoint & SIX_BIT_MASK);
            }
            else if (codePoint < 2097152) {
                yield 0xF0 | (codePoint >>> 18);
                yield 0x80 | ((codePoint >>> 12) & SIX_BIT_MASK);
                yield 0x80 | ((codePoint >>> 6) & SIX_BIT_MASK);
                yield 0x80 | (codePoint & SIX_BIT_MASK);
            }
        }
    }
    exports.encodeUtf8Stream = encodeUtf8Stream;
    function* charCodes(s) {
        for (let i = 0; i < s.length; i++) {
            yield s.charCodeAt(i);
        }
    }
});
//# sourceMappingURL=IonUnicode.js.map