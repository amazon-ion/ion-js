define(["require", "exports", "./IonUtilities", "./IonUtilities"], function (require, exports, IonUtilities_1, IonUtilities_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Import {
        constructor(_parent, _symbolTable, length) {
            this._parent = _parent;
            this._symbolTable = _symbolTable;
            this.index = {};
            this._offset = (_parent && (_parent.offset + _parent.length)) || 1;
            this._length = length || _symbolTable.symbols.length;
            let symbols = _symbolTable.symbols;
            for (let i = 0; i < this._length; i++) {
                this.index[symbols[i]] = this._offset + i;
            }
        }
        getSymbol(symbolId) {
            if (!IonUtilities_1.isNullOrUndefined(this.parent)) {
                let parentSymbol = this.parent.getSymbol(symbolId);
                if (!IonUtilities_2.isUndefined(parentSymbol)) {
                    return parentSymbol;
                }
            }
            let index = symbolId - this.offset;
            if (index < this.length) {
                return this.symbolTable.symbols[index];
            }
            return undefined;
        }
        getSymbolId(symbol_) {
            return (this.parent && this.parent.getSymbolId(symbol_))
                || this.index[symbol_];
        }
        get parent() {
            return this._parent;
        }
        get offset() {
            return this._offset;
        }
        get length() {
            return this._length;
        }
        get symbolTable() {
            return this._symbolTable;
        }
    }
    exports.Import = Import;
});
//# sourceMappingURL=IonImport.js.map