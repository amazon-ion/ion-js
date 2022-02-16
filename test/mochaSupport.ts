// Generates a mocha-friendly string representation of the provided value that can be used in test names
import {_hasValue} from "../src/util";

export function valueName(value: any): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === "object") {
        let typeText = _hasValue(value.constructor) ? value.constructor.name : 'Object';
        let valueText = _hasValue(value.toString) ? `${value}` : JSON.stringify(value);

        return `${typeText}(${valueText})`;
    }
    return `${typeof value}(${value})`;
}
