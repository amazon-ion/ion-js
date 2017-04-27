define(["require", "exports", "./IonType"], function (require, exports, IonType_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IonTypes = {
        NULL: new IonType_1.IonType(0, "null", true, false, false, false),
        BOOL: new IonType_1.IonType(1, "bool", true, false, false, false),
        INT: new IonType_1.IonType(2, "int", true, false, true, false),
        FLOAT: new IonType_1.IonType(4, "float", true, false, true, false),
        DECIMAL: new IonType_1.IonType(5, "decimal", true, false, false, false),
        TIMESTAMP: new IonType_1.IonType(6, "timestamp", true, false, false, false),
        SYMBOL: new IonType_1.IonType(7, "symbol", true, false, false, false),
        STRING: new IonType_1.IonType(8, "string", true, false, false, false),
        CLOB: new IonType_1.IonType(9, "clob", true, true, false, false),
        BLOB: new IonType_1.IonType(10, "blob", true, true, false, false),
        LIST: new IonType_1.IonType(11, "list", false, false, false, true),
        SEXP: new IonType_1.IonType(12, "sexp", false, false, false, true),
        STRUCT: new IonType_1.IonType(13, "struct", false, false, false, true),
        DATAGRAM: new IonType_1.IonType(20, "datagram", false, false, false, true),
        BOC: new IonType_1.IonType(-2, "boc", false, false, false, false),
    };
});
//# sourceMappingURL=IonTypes.js.map