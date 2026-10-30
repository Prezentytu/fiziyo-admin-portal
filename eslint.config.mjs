import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const ignores = [
  "node_modules/**",
  ".next/**",
  "dist/**",
  "out/**",
  "build/**",
  "coverage/**",
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
  // Zasady z AGENTS.md (Smak) jako lint: komunikat mówi, co zamiast.
  "no-restricted-imports": [
    "error",
    {
      paths: ["@apollo/client", "@apollo/client/react"].map((name) => ({
        name,
        importNames: ["useLazyQuery"],
        message: "Use useQuery with skip instead of useLazyQuery (AGENTS.md, Smak).",
      })),
    },
  ],
  "@typescript-eslint/no-restricted-types": [
    "error",
    {
      types: Object.fromEntries(
        ["React.FC", "FC", "React.FunctionComponent", "FunctionComponent"].map((name) => [
          name,
          { message: "Components are plain functions with a props interface, not React.FC (AGENTS.md, Smak)." },
        ]),
      ),
    },
  ],
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
  {
    name: "project/scripts",
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  eslintConfigPrettier,
];

export default config;
