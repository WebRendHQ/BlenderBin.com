// functions/.eslintrc.js
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  plugins: ["@typescript-eslint"],
  ignorePatterns: [
    "lib/**/*", // Ignore built files.
    "node_modules/**/*", // Ignore node_modules.
  ],
  rules: {
    "quotes": ["error", "double"],
    "@typescript-eslint/indent": ["error", 2],
    // Add or adjust rules as needed
  },
};
