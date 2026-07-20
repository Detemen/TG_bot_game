module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "import", "sonarjs"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:sonarjs/recommended",
    "prettier",
  ],
  rules: {
    "import/order": [
      "warn",
      {
        "groups": [["builtin", "external"], "internal", ["parent", "sibling", "index"]],
        "newlines-between": "always",
        "alphabetize": { order: "asc", caseInsensitive: true }
      }
    ],
    "sonarjs/cognitive-complexity": ["warn", 16]
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
    },
  },
};
