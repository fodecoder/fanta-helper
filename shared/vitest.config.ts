import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // `index.ts` è solo un barrel di re-export; i `.test.ts` non si contano.
      exclude: ["src/**/*.test.ts", "src/index.ts"],
      reporter: ["text", "html", "json"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 90,
      },
    },
  },
});
