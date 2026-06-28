import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
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
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `any` is used deliberately at the backend-JSON boundary (SSE events, raw
      // product payloads we normalize). Keep it visible as a warning, not a hard
      // failure that blocks deploys.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow intentional `_`-prefixed discards (e.g. destructure-to-omit a key).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // eslint-plugin-react-hooks v7 ships the experimental React-Compiler rules
      // as errors. They flag plenty of working code (audio recorder, maps, cart)
      // and "fixing" them risks regressions, so surface them as warnings for now.
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
