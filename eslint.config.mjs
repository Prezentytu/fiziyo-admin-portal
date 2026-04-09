import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const ignores = [
  "node_modules/**",
  ".next/**",
  "dist/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
];

const ruleOverrides = {
  "@typescript-eslint/no-unused-vars": [
    "warn",
    { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" },
  ],
  "react/display-name": "off",
  "react-hooks/immutability": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/purity": "off",
  "react-hooks/refs": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/static-components": "off",
};

const config = [
  ...nextCoreWebVitals,
  ...nextTs,
  { ignores },
  { name: "project/rule-overrides", rules: ruleOverrides },
  {
    name: "project/test-rule-overrides",
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  eslintConfigPrettier,
];

export default config;
