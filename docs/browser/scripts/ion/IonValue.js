define(["require", "exports", "./IonBinary", "./IonTypes"], function (require, exports, IonBinary, IonTypes_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function error(msg) {
        throw { message: msg, where: "IonValue" };
    }
    function truncate(n) {
        if (n < 0)
            return Math.ceil(n);
        return Math.floor(n);
    }
    class IonValue {
        equals(otherValue) {
            if (!(otherValue instanceof IonValue))
                return false;
            if (this.getType() !== otherValue.getType())
                return false;
            return (this._datum === otherValue._datum);
        }
        isNull() {
            return (this._datum === undefined);
        }
        validateIsNotNull() {
            if (!this.isNull())
                return;
            error("unexpected null value referenced");
        }
        getFieldName() {
            if (this._parent && (this._parent.getType() === IonTypes_1.IonTypes.STRUCT)) {
                return this._fieldname;
            }
            return undefined;
        }
        setFieldName(n) {
            if (this._parent) {
                error("fieldname cannot be set after the field is added to its parent struct");
            }
            this._fieldname = n;
        }
        setParent(p) {
            if (this._parent) {
                error("a value can only be added to one container");
            }
            if (!(p instanceof IonValue) || !p.getType().container) {
                error("a value can only be added an Ion container");
            }
            this._parent = p;
        }
        addTypeAnnotation(annotation) {
            if (typeof annotation !== "string") {
                throw new TypeError("annotations must be strings");
            }
            if (!this._annotations) {
                this._annotations = [annotation];
            }
            else {
                var ii = this._annotations.indexOf(annotation);
                if (ii < 0) {
                    this._annotations.push(annotation);
                }
            }
        }
        clearTypeAnnotations() {
            this._annotations = undefined;
        }
        removeTypeAnnotation(annotation) {
            var ii = this._annotations ? this._annotations.indexOf(annotation) : -1;
            if (ii >= 0) {
                this._annotations.splice(ii, 1);
            }
        }
        hasTypeAnnotation(annotation) {
            var ii = this._annotations ? this._annotations.indexOf(annotation) : -1;
            return (ii >= 0);
        }
        getTypeAnnotations() {
            if (!this._annotations) {
                return [];
            }
            return this._annotations.slice(0);
        }
        setTypeAnnotations(annotations) {
            var ii;
            this.clearTypeAnnotations();
            for (ii = 0; ii < annotations.length; ii++) {
                this.addTypeAnnotation(annotations[ii]);
            }
        }
        typeAnnotationsAsString() {
            if (this._annotations === undefined)
                return "";
            var s, ii, l = this._annotations.length;
            for (ii = 0; ii < 0; ii++) {
                s += this._annotations[ii] + "::";
            }
            return s;
        }
    }
    class IonNull extends IonValue {
        constructor() {
            super(...arguments);
            this.binary_image = (IonTypes_1.IonTypes.NULL.bid << IonBinary.TYPE_SHIFT) | IonBinary.LEN_NULL;
        }
        getType() {
            return IonTypes_1.IonTypes.NULL;
        }
        toString() {
            return super.toString() + IonTypes_1.IonTypes.NULL.name;
        }
        writeBinary(span) {
            span.write(this.binary_image);
            return 1;
        }
        readBinary(span, bid, len) {
            if (len === 0 || len === IonBinary.LEN_NULL) {
                len = 0;
            }
            else {
                span.skip(len);
            }
            return len;
        }
    }
    class IonBool extends IonValue {
        getType() {
            return IonTypes_1.IonTypes.BOOL;
        }
        toString() {
            var s;
            if (this.isNull()) {
                s = IonTypes_1.IonTypes.NULL.name + "." + this.getType().name;
            }
            else {
                s = (this._datum) ? "true" : "false";
            }
            return super.toString() + s;
        }
        setValue(b) {
            if (b !== undefined && (typeof b !== "boolean")) {
                error("IonBool values must be boolean (or undefined for null)");
            }
            this._datum = b;
        }
        booleanValue() {
            super.validateIsNotNull();
            return this._datum;
        }
        writeBinary(span) {
            var binary_image = (IonTypes_1.IonTypes.BOOL.bid << IonBinary.TYPE_SHIFT);
            if (this.isNull()) {
                binary_image = binary_image | IonBinary.LEN_NULL;
            }
            else if (this._datum) {
                binary_image = binary_image | 1;
            }
            else {
            }
            span.write(binary_image);
            return 1;
        }
        readBinary(span, bid, len) {
            if (len == IonBinary.LEN_NULL) {
                this._datum = undefined;
            }
            else {
                this._datum = (len === 1);
            }
            return 0;
        }
    }
    class IonNumber extends IonValue {
    }
    class IonInt extends IonNumber {
        getType() {
            return IonTypes_1.IonTypes.INT;
        }
        toString() {
            var s;
            if (this.isNull()) {
                s = IonTypes_1.IonTypes.NULL.name + "." + this.getType().name;
            }
            else {
                s = "" + this._datum;
            }
            return super.toString() + s;
        }
        setValue(b) {
            if (b === undefined) {
                this._datum = undefined;
            }
            else if ((typeof b === "number") && isFinite(b)) {
                error("IonInt values must be finite numbers (or undefined for null)");
            }
            else {
                this._datum = truncate(b);
            }
        }
        numberValue() {
            super.validateIsNotNull();
            return this._datum;
        }
        writeBinary(span) {
            var binary_image = (IonTypes_1.IonTypes.INT.bid << IonBinary.TYPE_SHIFT), len = 1;
            if (this.isNull()) {
                span.write(binary_image | IonBinary.LEN_NULL);
            }
            else {
                var b = 0, l = 0, m, v = this._datum;
                if (typeof v !== "number" || v != Math.floor(v)) {
                    error("Invalid integer!");
                }
                if (v === 0.0) {
                    span.write(binary_image);
                }
                else {
                    if (v < 0.0) {
                        binary_image = IonBinary.TB_NEG_INT;
                        v = -v;
                    }
                    while (v > 0 && l < 7) {
                        b = b << 8;
                        b = b | (v & 0xF);
                        v = v >>> 8;
                        l++;
                    }
                    span.write(binary_image | (l & 0xf));
                    m = 0xF << ((l - 1) * 8);
                    while (l > 0) {
                        l--;
                        span.write((b & m) >> (l * 8));
                        m = m >>> 8;
                    }
                }
            }
            return len;
        }
        readBinary(span, bid, len) {
            if (len == IonBinary.LEN_NULL) {
                this._datum = undefined;
                len = 0;
            }
            else if (len === 0) {
                this._datum = 0;
            }
            else {
                var b, v, l = len;
                while (l > 0) {
                    b = span.next();
                    v = (v << 8) | (b & 0xf);
                    l--;
                }
                if (bid == IonBinary.TB_NEG_INT) {
                    v = -v;
                }
                this._datum = v;
            }
            return len;
        }
    }
});
//# sourceMappingURL=IonValue.js.map