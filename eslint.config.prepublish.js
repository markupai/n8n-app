// @ts-check

const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
	js.configs.recommended,
	...tseslint.configs.recommended,
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
			// Allow CommonJS require() in config/build files
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["test/**/*.ts"],
		rules: {
			// Warn about 'any' in test files - prefer proper types even for mocks
			"@typescript-eslint/no-explicit-any": "warn",
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
		rules: {
			"n8n-nodes-base/node-execute-block-missing-continue-on-fail": "off",
			"n8n-nodes-base/node-resource-description-filename-against-convention": "off",
			"n8n-nodes-base/node-param-fixed-collection-type-unsorted-items": "off",
			"n8n-nodes-base/node-param-options-type-unsorted-items": "off",
			"n8n-nodes-base/node-class-description-inputs-wrong-regular-node": "off",
			"n8n-nodes-base/node-class-description-outputs-wrong": "off",
		},
	},
];
