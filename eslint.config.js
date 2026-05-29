// eslint.config.js — ESLint 9 flat config (CommonJS para compatibilidad con Expo/Metro)
const js = require('@eslint/js');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  // Base JS rules
  js.configs.recommended,

  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // React Native / Expo
        __DEV__: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        // Browser / Web
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
        Promise: 'readonly',
        URL: 'readonly',
        // Browser Web APIs
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        AbortController: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        URLSearchParams: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        // Node.js
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Test globals (Jest / describe blocks)
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        // Analytics
        gtag: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ── React (reglas manuales para evitar bugs de compatibilidad con ESLint 9) ──
      'react/jsx-key': 'warn',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'warn',
      'react/jsx-uses-react': 'off',       // innecesario en React 17+
      'react/jsx-uses-vars': 'warn',
      'react/react-in-jsx-scope': 'off',   // innecesario en React 17+
      'react/prop-types': 'off',            // sin TypeScript
      'react/no-unknown-property': 'warn',
      'react/display-name': 'off',

      // ── React Hooks ──
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── General ──
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^React$',
        caughtErrorsIgnorePattern: '^_|^(error|err|e)$',
      }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info', 'debug', 'group', 'groupEnd', 'table'] }],
      'no-undef': 'warn',

      // ── Reglas estilísticas → off (no son bugs de runtime) ──
      'preserve-caught-error': 'off',
      'no-useless-catch': 'off',
      // Bloques vacíos intencionales (catch silenciosos) → warn
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Asignaciones sin uso → warn (falsos positivos con switch/default)
      'no-useless-assignment': 'warn',
    },
  },

  // Ignorar archivos generados, scripts y documentación
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'web-build/**',
      'scripts/**',
      'package-lock.json',
      // Scripts de utilidad / migración de base de datos (no son código de la app)
      '*.mjs',
      'MIGRATION_GUIDE_NOTIFICATIONS.js',
    ],
  },
];
