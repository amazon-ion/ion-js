define(["require", "exports", "./IonLocalSymbolTable", "./IonParserTextRaw", "./IonSymbols", "./IonType", "./IonTypes", "./IonConstants", "./IonSymbols", "./IonParserTextRaw"], function (require, exports, IonLocalSymbolTable_1, IonParserTextRaw_1, IonSymbols_1, IonType_1, IonTypes_1, IonConstants_1, IonSymbols_2, IonParserTextRaw_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const RAW_STRING = new IonType_1.IonType(-1, "raw_input", true, false, false, false);
    const BEGINNING_OF_CONTAINER = -2;
    const EOF = -1;
    const T_IDENTIFIER = 9;
    const T_STRUCT = 19;
    class TextReader {
        constructor(source, catalog) {
            if (!source) {
                throw new Error("a source Span is required to make a reader");
            }
            this._parser = new IonParserTextRaw_2.ParserTextRaw(source);
            this._depth = 0;
            this._cat = catalog;
            this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
            this._type = undefined;
            this._raw_type = undefined;
            this._raw = undefined;
        }
        load_raw() {
            let t = this;
            if (t._raw !== undefined)
                return;
            if (t.isNull())
                return;
            t._raw = t._parser.get_value_as_string(t._raw_type);
            return;
        }
        skip_past_container() {
            var type, d = 1, p = this._parser;
            while (d > 0) {
                type = p.next();
                if (type === undefined) {
                    d--;
                }
                else if (type.container) {
                    d++;
                }
            }
        }
        next() {
            this._raw = undefined;
            if (this._raw_type === EOF) {
                return undefined;
            }
            let should_skip = this._raw_type !== BEGINNING_OF_CONTAINER
                && !this.isNull()
                && this._type
                && this._type.container;
            if (should_skip) {
                this.skip_past_container();
            }
            let p = this._parser;
            for (;;) {
                this._raw_type = p.next();
                if (this._depth > 0)
                    break;
                if (this._raw_type === T_IDENTIFIER) {
                    this.load_raw();
                    if (this._raw != IonConstants_1.IVM.text)
                        break;
                    this._symtab = IonLocalSymbolTable_1.defaultLocalSymbolTable();
                }
                else if (this._raw_type === T_STRUCT) {
                    if (p.annotations().length !== 1)
                        break;
                    if (p.annotations()[0] != IonSymbols_1.ion_symbol_table)
                        break;
                    this._symtab = IonSymbols_2.makeSymbolTable(this._cat, this);
                }
                else {
                    break;
                }
            }
            this._type = IonParserTextRaw_1.get_ion_type(this._raw_type);
            return this._type;
        }
        stepIn() {
            if (!this._type.container) {
                throw new Error("can't step in to a scalar value");
            }
            if (this.isNull()) {
                throw new Error("Can't step into a null container");
            }
            this._raw_type = BEGINNING_OF_CONTAINER;
            this._depth++;
        }
        stepOut() {
            var t = this;
            while (t._raw_type != EOF) {
                t.next();
            }
            t._raw_type = undefined;
            t._depth--;
        }
        valueType() {
            return this._type;
        }
        depth() {
            return this._depth;
        }
        fieldName() {
            return this._parser.fieldName();
        }
        annotations() {
            return this._parser.annotations();
        }
        isNull() {
            if (this._type === IonTypes_1.IonTypes.NULL)
                return true;
            return this._parser.isNull();
        }
        stringValue() {
            var i, s, t = this;
            this.load_raw();
            if (t.isNull()) {
                s = "null";
                if (t._type != IonTypes_1.IonTypes.NULL) {
                    s += "." + t._type.name;
                }
            }
            else if (t._type.scalar) {
                if (t._type !== IonTypes_1.IonTypes.BLOB) {
                    s = t._raw;
                }
                else {
                    s = t._raw;
                }
            }
            else {
                i = t.ionValue();
                s = i.stringValue();
            }
            return s;
        }
        numberValue() {
            if (!this._type.num) {
                return undefined;
            }
            return this._parser.numberValue();
        }
        byteValue() {
            throw new Error("E_NOT_IMPL: byteValue");
        }
        booleanValue() {
            if (this._type !== IonTypes_1.IonTypes.BOOL) {
                return undefined;
            }
            return this._parser.booleanValue();
        }
        decimalValue() {
            throw new Error("E_NOT_IMPL: decimalValue");
        }
        timestampValue() {
            throw new Error("E_NOT_IMPL: timestampValue");
        }
        value() {
            throw new Error("E_NOT_IMPL: value");
        }
        ionValue() {
            throw new Error("E_NOT_IMPL: ionValue");
        }
    }
    exports.TextReader = TextReader;
});
//# sourceMappingURL=IonTextReader.js.map