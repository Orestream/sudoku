import js from '@eslint/js';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'prefer-template': 'error',
			'no-useless-concat': 'error',
			quotes: ['error', 'single', { avoidEscape: true }],
			'svelte/indent': 'off', // Prettier handles indentation
		},
	},
	{
		ignores: ['build/**', '.svelte-kit/**', 'node_modules/**'],
	},
];
