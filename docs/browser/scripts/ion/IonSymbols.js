define(["require", "exports", "./IonSystemSymbolTable", "./IonImport", "./IonLocalSymbolTable", "./IonSubstituteSymbolTable"], function (require, exports, IonSystemSymbolTable_1, IonImport_1, IonLocalSymbolTable_1, IonSubstituteSymbolTable_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ion_symbol_table = "$ion_symbol_table";
    exports.ion_symbol_table_sid = 3;
    const empty_struct = {};
    function load_imports(reader, catalog) {
        let import_ = IonSystemSymbolTable_1.getSystemSymbolTableImport();
        reader.stepIn();
        while (reader.next()) {
            reader.stepIn();
            let name;
            let version = 1;
            let maxId;
            while (reader.next()) {
                switch (reader.fieldName()) {
                    case "name":
                        name = reader.stringValue();
                        break;
                    case "version":
                        version = reader.numberValue();
                        break;
                    case "max_id":
                        maxId = reader.numberValue();
                }
            }
            if (version < 1) {
                version = 1;
            }
            if (name && name != "$ion") {
                let symbolTable = catalog.findSpecificVersion(name, version);
                if (!symbolTable) {
                    if (!maxId) {
                        throw new Error(`No exact match found when trying to import symbol table ${name} version ${version}`);
                    }
                    else {
                        symbolTable = catalog.findLatestVersion(name);
                    }
                }
                if (!symbolTable) {
                    symbolTable = new IonSubstituteSymbolTable_1.SubstituteSymbolTable(maxId);
                }
                import_ = new IonImport_1.Import(import_, symbolTable, maxId);
            }
            reader.stepOut();
        }
        reader.stepOut();
        return import_;
    }
    function load_symbols(reader) {
        let symbols = [];
        reader.stepIn();
        while (reader.next()) {
            symbols.push(reader.stringValue());
        }
        reader.stepOut();
        return symbols;
    }
    function makeSymbolTable(catalog, reader) {
        let import_;
        let symbols;
        let maxId;
        reader.stepIn();
        while (reader.next()) {
            switch (reader.fieldName()) {
                case "imports":
                    import_ = load_imports(reader, catalog);
                    break;
                case "symbols":
                    symbols = load_symbols(reader);
                    break;
            }
        }
        reader.stepOut();
        return new IonLocalSymbolTable_1.LocalSymbolTable(import_, symbols);
    }
    exports.makeSymbolTable = makeSymbolTable;
});
//# sourceMappingURL=IonSymbols.js.map