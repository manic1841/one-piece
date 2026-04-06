import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // GEMINI.md Rules - Code Quality Enforcement

      // Explicit Typing: 不要使用 any
      '@typescript-eslint/no-explicit-any': 'error',

      // Label Consistency: UI must use unified display label APIs
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/domains/report/labels',
              message:
                'Use unified display label APIs from @/ui/constants/transaction/displayLabels instead of legacy report label maps.',
            },
          ],
          patterns: [
            {
              group: ['**/domains/report/labels'],
              message:
                'Use unified display label APIs from @/ui/constants/transaction/displayLabels instead of legacy report label maps.',
            },
          ],
        },
      ],

      // Flat is Better than Nested: 巢狀層數限制（最多3層）
      'max-depth': ['warn', 3],

      // Component Extraction: 函式大小限制（建議 300 行內）
      'max-lines-per-function': [
        'warn',
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Code Quality: 複雜度限制
      complexity: ['warn', 25],

      // File Size: 檔案大小限制（建議 400 行內）
      'max-lines': [
        'warn',
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // No God Objects: 一個檔案一個 class
      'max-classes-per-file': ['warn', 1],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/test.{ts,tsx,js,jsx}'], // 針對測試檔案
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // 測試允許快速 mock，保留警告提示
      'max-lines': 'off', // 直接關閉行數限制
      'max-lines-per-function': 'off', // 同時關閉函式長度限制
    },
  },
);
