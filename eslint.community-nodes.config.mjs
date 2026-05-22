// Enforces the n8n community-node lint rules that n8n Cloud's verification scan
// blocks releases on. Currently scoped to the two issues called out in the
// v0.2.8 cloud-verification review:
//   * @n8n/community-nodes/no-restricted-globals  → no `process.env`, etc. in node code
//   * @n8n/community-nodes/require-node-api-error → throw NodeApiError on HTTP failures
// Add additional rules here when they become must-pass for cloud verification.

import n8nCommunityNodesPlugin from "@n8n/eslint-plugin-community-nodes";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist", "coverage", "node_modules"],
  },
  {
    files: ["nodes/**/*.ts", "credentials/**/*.ts", "utils/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@n8n/community-nodes": n8nCommunityNodesPlugin,
    },
    rules: {
      "@n8n/community-nodes/no-restricted-globals": "error",
      "@n8n/community-nodes/require-node-api-error": "error",
    },
  },
];
