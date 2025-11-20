import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["nodes/**/*.ts", "credentials/**/*.ts", "utils/**/*.ts"],
			exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.spec.ts"],
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./"),
			"n8n-workflow": resolve(__dirname, "./"),
		},
	},
	define: {
		"process.env.NODE_ENV": '"test"',
	},
});
