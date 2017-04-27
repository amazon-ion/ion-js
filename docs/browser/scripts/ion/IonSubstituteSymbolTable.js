define(["require", "exports", "./IonSharedSymbolTable"], function (require, exports, IonSharedSymbolTable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SubstituteSymbolTable extends IonSharedSymbolTable_1.SharedSymbolTable {
        constructor(length) {
            super(null, undefined, new Array(length));
        }
    }
    exports.SubstituteSymbolTable = SubstituteSymbolTable;
});
//# sourceMappingURL=IonSubstituteSymbolTable.js.map