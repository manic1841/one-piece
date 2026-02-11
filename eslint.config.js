import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

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

      // Import Sorting: 使用 eslint-plugin-import 自動排序
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // npm packages
            'internal', // Aliased modules
            'parent', // ../
            'sibling', // ./
            'index', // ./index
          ],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // Sort named imports within a single import statement
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true, // 讓 import/order 處理 import 語句順序
          ignoreMemberSort: false, // 排序 import 內的成員
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],
    },
  },
);
