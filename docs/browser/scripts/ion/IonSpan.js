define(["require", "exports", "./IonConstants", "./IonErrors"], function (require, exports, IonConstants_1, IonErrors_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const SPAN_TYPE_STRING = 0;
    const SPAN_TYPE_BINARY = 1;
    const SPAN_TYPE_SUB_FLAG = 2;
    const SPAN_TYPE_SUB_STRING = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_STRING;
    const SPAN_TYPE_SUB_BINARY = SPAN_TYPE_SUB_FLAG | SPAN_TYPE_BINARY;
    const MAX_POS = 1024 * 1024 * 1024;
    const LINE_FEED = 10;
    const CARRAIGE_RETURN = 13;
    const DEBUG_FLAG = true;
    class Span {
        constructor(_type) {
            this._type = _type;
        }
        write(b) {
            throw new Error("not implemented");
        }
        static error() {
            throw new Error("span error");
        }
    }
    exports.Span = Span;
    class StringSpan extends Span {
        constructor(src, start, len) {
            super(SPAN_TYPE_STRING);
            this._line = 1;
            this._src = src;
            this._limit = src.length;
            if (typeof start !== 'undefined') {
                this._pos = start;
                if (typeof len !== 'undefined') {
                    this._limit = start + len;
                }
            }
            this._start = this._pos;
            this._line_start = this._pos;
            this._old_line_start = 0;
        }
        position() {
            return this._pos - this._start;
        }
        getRemaining() {
            return this._limit - this._pos;
        }
        setRemaining(r) {
            this._limit = r + this._pos;
        }
        is_empty() {
            return (this._pos >= this._limit);
        }
        next() {
            var ch;
            if (this.is_empty()) {
                if (this._pos > MAX_POS) {
                    throw new Error("span position is out of bounds");
                }
                this._pos++;
                return IonConstants_1.EOF;
            }
            ch = this._src.charCodeAt(this._pos);
            if (ch === CARRAIGE_RETURN) {
                if (this.peek() != LINE_FEED) {
                    this._inc_line();
                }
            }
            else if (ch == LINE_FEED) {
                this._inc_line();
            }
            this._pos++;
            return ch;
        }
        _inc_line() {
            this._old_line_start = this._line_start;
            this._line++;
            this._line_start = this._pos;
        }
        unread(ch) {
            if (this._pos <= this._start)
                Span.error();
            this._pos--;
            if (ch < 0) {
                if (this.is_empty() != true)
                    Span.error();
                return;
            }
            if (this._pos == this._line_start) {
                this._line_start = this._old_line_start;
                this._line--;
            }
            if (ch != this.peek())
                Span.error();
        }
        peek() {
            return this.valueAt(this._pos);
        }
        skip(dist) {
            this._pos += dist;
            if (this._pos > this._limit) {
                this._pos = this._limit;
            }
        }
        valueAt(ii) {
            if (ii < this._start || ii >= this._limit)
                return IonConstants_1.EOF;
            return this._src.charCodeAt(ii);
        }
        line_number() {
            return this._line;
        }
        offset() {
            return this._pos - this._line_start;
        }
        clone(start, len) {
            let actual_len = this._limit - this._pos - start;
            if (actual_len > len) {
                actual_len = len;
            }
            return new StringSpan(this._src, this._pos, actual_len);
        }
    }
    class BinarySpan extends Span {
        constructor(src, start, len) {
            super(SPAN_TYPE_BINARY);
            this._src = src;
            this._limit = src.length;
            this._start = start || 0;
            if (typeof len !== 'undefined') {
                this._limit = start + len;
            }
            this._pos = this._start;
        }
        position() {
            return this._pos - this._start;
        }
        getRemaining() {
            return this._limit - this._pos;
        }
        setRemaining(r) {
            this._limit = r + this._pos;
        }
        is_empty() {
            return (this._pos >= this._limit);
        }
        next() {
            var b;
            if (this.is_empty()) {
                if (this._pos > MAX_POS) {
                    throw new Error("span position is out of bounds");
                }
                this._pos++;
                return IonConstants_1.EOF;
            }
            b = this._src[this._pos];
            this._pos++;
            return (b & 0xFF);
        }
        unread(b) {
            if (this._pos <= this._start)
                Span.error();
            this._pos--;
            if (b == IonConstants_1.EOF) {
                if (this.is_empty() == false)
                    Span.error();
            }
            if (b != this.peek())
                Span.error();
        }
        peek() {
            if (this.is_empty())
                return IonConstants_1.EOF;
            return (this._src[this._pos] & 0xFF);
        }
        skip(dist) {
            this._pos += dist;
            if (this._pos > this._limit) {
                this._pos = this._limit;
            }
        }
        valueAt(ii) {
            if (ii < this._start || ii >= this._limit)
                return undefined;
            return (this._src[ii] & 0xFF);
        }
        clone(start, len) {
            let actual_len = this._limit - this._pos - start;
            if (actual_len > len) {
                actual_len = len;
            }
            return new BinarySpan(this._src, this._pos + start, actual_len);
        }
    }
    function makeSpan(src, start, len) {
        if (src instanceof Span) {
            return src;
        }
        if (typeof start === 'undefined') {
            start = 0;
        }
        if (typeof len === 'undefined') {
            len = src.length;
        }
        let span = undefined;
        let src_type = typeof src;
        if (src_type === 'undefined') {
            throw new IonErrors_1.InvalidArgumentError("Given \'undefined\' as input");
        }
        else if (src_type === 'string') {
            span = new StringSpan(src, start, len);
        }
        else if (src_type === 'object') {
            if (typeof (src.isSpan) === 'undefined') {
                span = new BinarySpan(src, start, len);
            }
        }
        if (span === undefined) {
            throw new IonErrors_1.InvalidArgumentError("invalid span source");
        }
        return span;
    }
    exports.makeSpan = makeSpan;
});
//# sourceMappingURL=IonSpan.js.map