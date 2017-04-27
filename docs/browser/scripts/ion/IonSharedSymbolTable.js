define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SharedSymbolTable {
        constructor(_name, _version, _symbols) {
            this._name = _name;
            this._version = _version;
            this._symbols = _symbols;
        }
        get name() {
            return this._name;
        }
        get version() {
            return this._version;
        }
        get symbols() {
            return this._symbols;
        }
    }
    exports.SharedSymbolTable = SharedSymbolTable;
});
//# sourceMappingURL=IonSharedSymbolTable.js.map