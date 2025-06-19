import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jest from 'eslint-plugin-jest'
import prettier from 'eslint-plugin-prettier'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      curly: ['error', 'all']
      // 필요한 ts-eslint 룰을 여기에 추가
    }
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    plugins: {jest},
    rules: {
      ...jest.configs.recommended.rules
    }
  },
  {
    plugins: {prettier},
    rules: {
      ...prettier.configs.recommended.rules
    }
  },
  {
    ignores: ['dist', 'lib', 'node_modules', '*.config.js']
  }
]
