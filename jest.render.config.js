// Pruebas que DIBUJAN las pantallas (no solo cargan el módulo): detectan errores que solo
// aparecen al renderizar. Se ejecutan con: npm run test:render
// Van aparte de `npm test` porque jest.setup.js sustituye react-native por una versión
// mínima que no puede dibujar componentes.
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/render/**/*.test.js'],
  // Las pantallas cargan partes bajo demanda con import(): aquí se convierten en require
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      configFile: false,
      babelrc: false,
      presets: ['module:@react-native/babel-preset'],
      plugins: ['@babel/plugin-transform-dynamic-import'],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|expo-.*|@expo|react-native-.*|@react-navigation)/)',
  ],
  testTimeout: 30000,
};
