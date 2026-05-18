// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default tseslint.config(
	{
		ignores: ["eslint.config.mjs"],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	eslintPluginPrettierRecommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
			sourceType: "commonjs",
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			// Enable the sorting rules
			"simple-import-sort/imports": [
				"error",
				{
					groups: [
						// Side effect imports (e.g., import "reflect-metadata";)
						["^\\u0000"],
						// Node.js built-ins (e.g., import fs from "fs";)
						["^node:", "^@?\\w"],
						// NestJS specific packages (e.g., @nestjs/common)
						["^@nestjs"],
						// Internal Aliases (e.g., @common, @src)
						["^@"],
						// Relative imports
						["^\\."],
					],
				},
			],
			"simple-import-sort/exports": "error",

			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"prettier/prettier": ["error", { endOfLine: "auto" }],
		},
	},
);
