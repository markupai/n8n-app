// @ts-check

const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
	js.configs.recommended,
	...tseslint.configs.strict,
	{
		ignores: ["dist"],
	},
	{
		files: ["eslint.config.js", "eslint.config.prepublish.js", "gulpfile.js"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["package.json"],
		plugins: {
			"n8n-nodes-base": require("eslint-plugin-n8n-nodes-base"),
		},
		...compat.extends("plugin:n8n-nodes-base/community")[0],
		rules: {
			// Disable TypeScript rule inherited from global config - not relevant for JSON
			"@typescript-eslint/no-unused-expressions": "off",
		},
	},
	{
		files: ["credentials/**/*.ts"],
		plugins: {
			"n8n-nodes-base": require("eslint-plugin-n8n-nodes-base"),
		},
		...compat.extends("plugin:n8n-nodes-base/credentials")[0],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "tsconfig.json",
			},
		},
	},
	{
		files: ["nodes/**/*.ts"],
		plugins: {
			"n8n-nodes-base": require("eslint-plugin-n8n-nodes-base"),
		},
		...compat.extends("plugin:n8n-nodes-base/nodes")[0],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "tsconfig.json",
			},
		},
	},
];
