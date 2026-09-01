import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.vite/**",
      "**/coverage/**",
      // Riferimenti di design (prototipi .dc.html + runtime proprietario): non
      // sono codice di produzione e non vanno lintati.
      "design_handoff_portale/**",
      "design/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "no-undef": "off" } },
  {
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  eslintConfigPrettier,
);
