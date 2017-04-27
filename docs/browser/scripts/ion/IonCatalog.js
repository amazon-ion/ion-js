define(["require", "exports", "./IonSystemSymbolTable", "./IonUtilities", "./IonUtilities"], function (require, exports, IonSystemSymbolTable_1, IonUtilities_1, IonUtilities_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function byVersion(x, y) {
        return x.version - y.version;
    }
    class Catalog {
        constructor() {
            this.symbolTables = {};
            this.addSymbolTable(IonSystemSymbolTable_1.getSystemSymbolTable());
        }
        addSymbolTable(symbolTable) {
            let versions = this.symbolTables[symbolTable.name];
            if (IonUtilities_1.isUndefined(versions)) {
                versions = [];
                this.symbolTables[symbolTable.name] = versions;
            }
            versions[symbolTable.version] = symbolTable;
        }
        findSpecificVersion(name, version) {
            let versions = this.symbolTables[name];
            return (versions && versions[version]) || undefined;
        }
        findLatestVersion(name) {
            return IonUtilities_2.max(this.symbolTables[name], byVersion);
        }
    }
    exports.Catalog = Catalog;
});
//# sourceMappingURL=IonCatalog.js.map