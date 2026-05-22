// Full @n8n/community-nodes recommended preset — what n8n Cloud verification runs against.
// We do NOT subset this anymore: any rule that the cloud scan would flag must fail CI here.

import n8nCommunityNodesPlugin from "@n8n/eslint-plugin-community-nodes";
import tseslint from "typescript-eslint";

const recommended = n8nCommunityNodesPlugin.configs.recommended;

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
    plugins: recommended.plugins,
    rules: recommended.rules,
  },
];
