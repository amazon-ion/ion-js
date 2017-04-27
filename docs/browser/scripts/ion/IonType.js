define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class IonType {
        constructor(bid, name, scalar, lob, num, container) {
            this.bid = bid;
            this.name = name;
            this.scalar = scalar;
            this.lob = lob;
            this.num = num;
            this.container = container;
        }
    }
    exports.IonType = IonType;
});
//# sourceMappingURL=IonType.js.map