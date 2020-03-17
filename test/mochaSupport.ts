// Generates a mocha-friendly string representation of the provided value that can be used in test names
export function valueName(value: any): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === "object") {
        return `${value.constructor.name}(${value})`;
    }
    return `${typeof value}(${value})`;
}
