define(["require", "exports", "./IonText"], function (require, exports, IonText_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Symbol {
        constructor(id, val) {
            this.sid = id;
            this.name = val;
        }
        toString() {
            var s = "sym::{id:" + IonText_1.asAscii(this.sid) + ",val:\"" + IonText_1.asAscii(this.name) + "\"";
            return s;
        }
    }
    exports.Symbol = Symbol;
});
//# sourceMappingURL=IonSymbol.js.map