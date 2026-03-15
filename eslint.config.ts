// See: https://eslint.org/docs/latest/use/configure/configuration-files

import { fixupPluginRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import _import from 'eslint-plugin-import'
import jest from 'eslint-plugin-jest'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default [
  {
    ignores: [
      '**/.licenses',
      '**/coverage',
      '**/dist',
      '**/node_modules',
      '**/THIRD_PARTY_LICENSES',
      '**/tmp'
    ]
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier'
  ),
  {
    plugins: {
      import: fixupPluginRules(_import),
      jest,
      '@typescript-eslint': typescriptEslint
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },

      parser: tsParser,
      ecmaVersion: 2024,
      sourceType: 'module',

      parserOptions: {
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: __dirname
      }
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: 'tsconfig.eslint.json'
        }
      }
    },

    rules: {
      camelcase: 'off',
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
]
