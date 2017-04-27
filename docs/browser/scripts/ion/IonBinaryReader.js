define(["require", "exports", "./IonCatalog", "./IonLocalSymbolTable", "./IonSymbols", "./IonType", "./IonTypes", "./IonConstants", "./IonSymbols", "./IonParserBinaryRaw"], function (require, exports, IonCatalog_1, IonLocalSymbolTable_1, IonSymbols_1, IonType_1, IonTypes_1, IonConstants_1, IonSymbols_2, IonParserBinaryRaw_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const RAW_STRING = new IonType_1.IonType(-1, "raw_input", true, false, false, false);
    const ERROR = -3;
    const BOC = -2;
    const EOF = -1;
    const TB_NULL = 0;
    const TB_BOOL = 1;
    const TB_INT = 2;
    const TB_NEG_INT = 3;
    const TB_FLOAT = 4;
    const TB_DECIMAL = 5;
    const TB_TIMESTAMP = 6;
    const TB_SYMBOL = 7;
    const TB_STRING = 8;
    const TB_CLOB = 9;
    const TB_BLOB = 10;
    const TB_SEXP = 11;
    const TB_LIST = 12;
    const TB_STRUCT = 13;
    const TB_ANNOTATION = 14;
    const TB_UNUSED__ = 15;
    const TB_DATAGRAM = 20;
    const TB_SEXP_CLOSE = 21;
    const TB_LIST_CLOSE = 22;
    const TB_STRUCT_CLOSE = 23;
    function get_ion_type(t) {
        switch (t) {
            case TB_NULL: return IonTypes_1.IonTypes.NULL;
            case TB_BOOL: return IonTypes_1.IonTypes.BOOL;
            case TB_INT: return IonTypes_1.IonTypes.INT;
            case TB_NEG_INT: return IonTypes_1.IonTypes.INT;
            case TB_FLOAT: return IonTypes_1.IonTypes.FLOAT;
            case TB_DECIMAL: return IonTypes_1.IonTypes.DECIMAL;
            case TB_TIMESTAMP: return IonTypes_1.IonTypes.TIMESTAMP;
            case TB_SYMBOL: return IonTypes_1.IonTypes.SYMBOL;
            case TB_STRING: return IonTypes_1.IonTypes.STRING;
            case TB_CLOB: return IonTypes_1.IonTypes.CLOB;
            case TB_BLOB: return IonTypes_1.IonTypes.BLOB;
            case TB_SEXP: return IonTypes_1.IonTypes.SEXP;
            case TB_LIST: return IonTypes_1.IonTypes.LIST;
            case TB_STRUCT: return IonTypes_1.IonTypes.STRUCT;
            default: return undefined;
        }
        ;
    }
    class BinaryReader {
        constructor(source, catalog) {
            this._parser = new IonParserBinaryRaw_1.ParserBinaryRaw(source);
            this._cat = catalog || new IonCatalog_1.Catalog();
            this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
            this._raw_type = BOC;
        }
        next() {
            let t = this;
            var p, rt;
            if (t._raw_type === EOF)
                return undefined;
            p = t._parser;
            for (;;) {
                t._raw_type = rt = p.next();
                if (t.depth() > 0)
                    break;
                if (rt === TB_SYMBOL) {
                    let raw = p.numberValue();
                    if (raw !== IonConstants_1.IVM.sid)
                        break;
                    t._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
                }
                else if (rt === TB_STRUCT) {
                    if (!p.hasAnnotations())
                        break;
                    if (p.getAnnotation(0) !== IonSymbols_1.ion_symbol_table_sid)
                        break;
                    t._symtab = IonSymbols_2.makeSymbolTable(t._cat, t);
                }
                else {
                    break;
                }
            }
            return get_ion_type(rt);
        }
        stepIn() {
            let t = this;
            if (!get_ion_type(t._raw_type).container) {
                throw new Error("can't step in to a scalar value");
            }
            t._parser.stepIn();
            t._raw_type = BOC;
        }
        stepOut() {
            let t = this;
            t._parser.stepOut();
            t._raw_type = BOC;
        }
        valueType() {
            return get_ion_type(this._raw_type);
        }
        depth() {
            return this._parser.depth();
        }
        fieldName() {
            let t = this;
            var n, s;
            n = t._parser.getFieldId();
            s = this.getSymbolString(n);
            return s;
        }
        hasAnnotations() {
            return this._parser.hasAnnotations();
        }
        getAnnotation(index) {
            let t = this;
            var id, n;
            id = t._parser.getAnnotation(index);
            n = this.getSymbolString(id);
            return n;
        }
        isNull() {
            let t = this;
            var is_null = (t._raw_type === TB_NULL) || t._parser.isNull();
            return is_null;
        }
        stringValue() {
            let t = this;
            var n, s, p = t._parser;
            if (t.isNull()) {
                s = "null";
                if (t._raw_type != TB_NULL) {
                    s += "." + get_ion_type(t._raw_type).name;
                }
            }
            else if (get_ion_type(t._raw_type).scalar) {
                if (t._raw_type === TB_SYMBOL) {
                    n = p.numberValue();
                    s = this.getSymbolString(n);
                }
                else {
                    s = p.stringValue();
                }
            }
            return s;
        }
        numberValue() {
            return this._parser.numberValue();
        }
        byteValue() {
            return this._parser.byteValue();
        }
        ionValue() {
            throw new Error("E_NOT_IMPL: ionValue");
        }
        booleanValue() {
            return this._parser.booleanValue();
        }
        decimalValue() {
            return this._parser.decimalValue();
        }
        timestampValue() {
            return this._parser.timestampValue();
        }
        value() {
            switch (this.valueType()) {
                case IonTypes_1.IonTypes.BLOB:
                case IonTypes_1.IonTypes.CLOB:
                    return this.byteValue();
                case IonTypes_1.IonTypes.BOOL:
                    return this.booleanValue();
                case IonTypes_1.IonTypes.DECIMAL:
                    return this.decimalValue();
                case IonTypes_1.IonTypes.FLOAT:
                case IonTypes_1.IonTypes.INT:
                    return this.numberValue();
                case IonTypes_1.IonTypes.STRING:
                case IonTypes_1.IonTypes.SYMBOL:
                    return this.stringValue();
                case IonTypes_1.IonTypes.TIMESTAMP:
                    return this.timestampValue();
                default:
                    return undefined;
            }
        }
        getSymbolString(symbolId) {
            let s = undefined;
            if (symbolId > 0) {
                s = this._symtab.getSymbol(symbolId);
                if (typeof (s) == 'undefined') {
                    s = "$" + symbolId.toString();
                }
            }
            return s;
        }
    }
    exports.BinaryReader = BinaryReader;
});
//# sourceMappingURL=IonBinaryReader.js.map