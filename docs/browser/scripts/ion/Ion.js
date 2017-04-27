define(["require", "exports", "./IonBinaryReader", "./IonConstants", "./IonSpan", "./IonTextReader", "./IonErrors", "./IonTextWriter", "./IonWriteable", "./IonBinaryWriter", "./IonLocalSymbolTable", "./IonCatalog", "./IonDecimal", "./IonLocalSymbolTable", "./IonTypes", "./IonPrecision", "./IonSharedSymbolTable", "./IonTimestamp", "./IonText", "./IonBinary"], function (require, exports, IonBinaryReader_1, IonConstants_1, IonSpan_1, IonTextReader_1, IonErrors_1, IonTextWriter_1, IonWriteable_1, IonBinaryWriter_1, IonLocalSymbolTable_1, IonCatalog_1, IonDecimal_1, IonLocalSymbolTable_2, IonTypes_1, IonPrecision_1, IonSharedSymbolTable_1, IonTimestamp_1, IonText_1, IonBinary_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const e = {
        name: "IonError",
        where: undefined,
        msg: "error",
    };
    function get_buf_type(buf) {
        var firstByte = buf.valueAt(0);
        return (firstByte === IonConstants_1.IVM.binary[0]) ? 'binary' : 'text';
    }
    function makeBinaryReader(span, options) {
        return new IonBinaryReader_1.BinaryReader(span, options && options.catalog);
    }
    function makeTextReader(span, options) {
        return new IonTextReader_1.TextReader(span, options && options.catalog);
    }
    function asSpan(buf) {
        try {
            return IonSpan_1.makeSpan(buf);
        }
        catch (e) {
            if (e instanceof IonErrors_1.InvalidArgumentError) {
                throw new Error("Invalid argument, expected \'string\' value found:  " + buf);
            }
            else {
                throw e;
            }
        }
    }
    function makeReader(buf, options) {
        let inSpan = asSpan(buf);
        let stype = options && isSourceType(options.sourceType)
            ? options.sourceType
            : get_buf_type(inSpan);
        let reader = (stype === 'binary')
            ? makeBinaryReader(inSpan, options)
            : makeTextReader(inSpan, options);
        return reader;
    }
    exports.makeReader = makeReader;
    function isSourceType(val) {
        return val === 'text' || val === 'binary';
    }
    function makeTextWriter() {
        return new IonTextWriter_1.TextWriter(new IonWriteable_1.Writeable());
    }
    exports.makeTextWriter = makeTextWriter;
    function makeBinaryWriter(localSymbolTable = IonLocalSymbolTable_1.defaultLocalSymbolTable()) {
        return new IonBinaryWriter_1.BinaryWriter(localSymbolTable, new IonWriteable_1.Writeable());
    }
    exports.makeBinaryWriter = makeBinaryWriter;
    exports.Catalog = IonCatalog_1.Catalog;
    exports.Decimal = IonDecimal_1.Decimal;
    exports.defaultLocalSymbolTable = IonLocalSymbolTable_2.defaultLocalSymbolTable;
    exports.IonTypes = IonTypes_1.IonTypes;
    exports.Precision = IonPrecision_1.Precision;
    exports.SharedSymbolTable = IonSharedSymbolTable_1.SharedSymbolTable;
    exports.Timestamp = IonTimestamp_1.Timestamp;
    exports.toBase64 = IonText_1.toBase64;
    exports.TypeCodes = IonBinary_1.TypeCodes;
});
//# sourceMappingURL=Ion.js.map