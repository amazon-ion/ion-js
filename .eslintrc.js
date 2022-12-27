module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.lint.json",
  },
  plugins: [
    "@typescript-eslint",
  ],
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier", // This config turns off ESLint rules that are handled by Prettier.
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["off"], // Not really needed, TypeScript strict checks can be used instead.
    // TODO Enable and fix other useful rules like `eqeqeq`.

    // Temporary disabled recommended rules that failed after TSLint -> ESLint migration.
    // TODO Enable rules back one by one and fix errors.
    "@typescript-eslint/ban-ts-comment": ["off"],
    "@typescript-eslint/ban-types": ["off"],
    "@typescript-eslint/explicit-module-boundary-types" : ["off"],
    "@typescript-eslint/no-empty-function" : ["off"],
    "@typescript-eslint/no-empty-interface" : ["off"],
    "@typescript-eslint/no-explicit-any" : ["off"],
    "@typescript-eslint/no-inferrable-types" : ["off"],
    "@typescript-eslint/no-namespace" : ["off"],
    "@typescript-eslint/no-non-null-assertion" : ["off"],
    "@typescript-eslint/no-this-alias" : ["off"],
    "@typescript-eslint/no-unnecessary-type-assertion": ["off"],
    "@typescript-eslint/no-unsafe-assignment" : ["off"],
    "@typescript-eslint/no-unsafe-call" : ["off"],
    "@typescript-eslint/no-unsafe-member-access" : ["off"],
    "@typescript-eslint/no-unsafe-return" : ["off"],
    "@typescript-eslint/prefer-regexp-exec": ["off"],
    "@typescript-eslint/restrict-plus-operands": ["off"],
    "@typescript-eslint/restrict-template-expressions": ["off"],
    "@typescript-eslint/unbound-method": ["off"],
    "prefer-const" : ["off"],
  },
  overrides: [{
    files: ["./test/**.*"],
    rules: {
      "@typescript-eslint/no-empty-function": ["off"],
    }
  }]
};
