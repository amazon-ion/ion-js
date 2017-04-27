define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function isNumber(value) {
        return typeof (value) == 'number';
    }
    exports.isNumber = isNumber;
    function isString(value) {
        return typeof (value) == 'string';
    }
    exports.isString = isString;
    function isUndefined(value) {
        return typeof (value) == 'undefined';
    }
    exports.isUndefined = isUndefined;
    function isNullOrUndefined(value) {
        return isUndefined(value) || value === null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function last(array) {
        if (!array || array.length === 0) {
            return undefined;
        }
        return array[array.length - 1];
    }
    exports.last = last;
    function max(array, comparator) {
        let best;
        if (array) {
            for (let element of array) {
                if (!best || comparator(best, element) < 0) {
                    best = element;
                }
            }
        }
        return best;
    }
    exports.max = max;
});
//# sourceMappingURL=IonUtilities.js.map