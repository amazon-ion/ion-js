define(["require", "exports", "./IonImport", "./IonSharedSymbolTable"], function (require, exports, IonImport_1, IonSharedSymbolTable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const systemSymbolTable = new IonSharedSymbolTable_1.SharedSymbolTable("$ion", 1, [
        "$ion",
        "$ion_1_0",
        "$ion_symbol_table",
        "name",
        "version",
        "imports",
        "symbols",
        "max_id",
        "$ion_shared_symbol_table"
    ]);
    function getSystemSymbolTable() {
        return systemSymbolTable;
    }
    exports.getSystemSymbolTable = getSystemSymbolTable;
    function getSystemSymbolTableImport() {
        return new IonImport_1.Import(null, getSystemSymbolTable());
    }
    exports.getSystemSymbolTableImport = getSystemSymbolTableImport;
});
//# sourceMappingURL=IonSystemSymbolTable.js.map