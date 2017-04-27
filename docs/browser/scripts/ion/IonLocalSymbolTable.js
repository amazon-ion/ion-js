define(["require", "exports", "./IonSystemSymbolTable", "./IonUtilities"], function (require, exports, IonSystemSymbolTable_1, IonUtilities_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LocalSymbolTable {
        constructor(_import = IonSystemSymbolTable_1.getSystemSymbolTableImport(), symbols = []) {
            this._import = _import;
            this._symbols = [];
            this.index = {};
            this.offset = _import.offset + _import.length;
            for (let symbol_ of symbols) {
                this.addSymbol(symbol_);
            }
        }
        getSymbolId(symbol_) {
            return this._import.getSymbolId(symbol_)
                || this.index[symbol_];
        }
        addSymbol(symbol_) {
            let existingSymbolId = this.getSymbolId(symbol_);
            if (!IonUtilities_1.isUndefined(existingSymbolId)) {
                return existingSymbolId;
            }
            let symbolId = this.offset + this.symbols.length;
            this.symbols.push(symbol_);
            this.index[symbol_] = symbolId;
            return symbolId;
        }
        getSymbol(symbolId) {
            let importedSymbol = this._import.getSymbol(symbolId);
            if (!IonUtilities_1.isUndefined(importedSymbol)) {
                return importedSymbol;
            }
            let index = symbolId - this.offset;
            if (index < this.symbols.length) {
                return this.symbols[index];
            }
            return undefined;
        }
        get symbols() {
            return this._symbols;
        }
        get import() {
            return this._import;
        }
    }
    exports.LocalSymbolTable = LocalSymbolTable;
    function defaultLocalSymbolTable() {
        return new LocalSymbolTable(IonSystemSymbolTable_1.getSystemSymbolTableImport());
    }
    exports.defaultLocalSymbolTable = defaultLocalSymbolTable;
});
//# sourceMappingURL=IonLocalSymbolTable.js.map