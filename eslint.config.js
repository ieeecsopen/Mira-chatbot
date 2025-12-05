import js from '@eslint/js'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow underscore-prefixed unused variables
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      // Allow exporting constants alongside components
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Disable unnecessary escape character warning
      'no-useless-escape': 'off',
      // Allow case declarations without block scope
      'no-case-declarations': 'off',
      // Downgrade explicit any to warning
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow empty interfaces/types
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
])
