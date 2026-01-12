import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["nodes/**/*.ts", "credentials/**/*.ts", "utils/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.spec.ts"],
    },
  },
  define: {
    "process.env.NODE_ENV": '"test"',
  },
});
