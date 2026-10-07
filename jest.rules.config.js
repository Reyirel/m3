// Pruebas de las reglas de Firestore y Storage contra el emulador local.
// Se ejecutan con: npm run test:rules
// (no forman parte de `npm test` porque necesitan el emulador de Firebase y Java)
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/rules/**/*.test.js'],
  // Archivos CommonJS sin JSX: no hace falta transformarlos
  transform: {},
  testTimeout: 30000,
};
