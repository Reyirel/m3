module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  // tests/rules necesita el emulador de Firebase: se ejecuta con `npm run test:rules`
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/tests/rules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-test-app)/)',
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'hooks/**/*.js',
    'utils/**/*.js',
    'contexts/**/*.js',
    '!**/*.test.js',
    '!node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
