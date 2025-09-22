import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
		exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			include: ['nodes/**/*.ts', 'credentials/**/*.ts'],
			exclude: [
				'node_modules/',
				'dist/',
				'test/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/*.json',
				'**/*.md',
				'**/*.test.ts',
				'**/*.spec.ts',
			],
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './'),
			'n8n-workflow': resolve(__dirname, './'),
		},
	},
	define: {
		'process.env.NODE_ENV': '"test"',
	},
});
