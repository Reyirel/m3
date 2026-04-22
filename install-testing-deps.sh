#!/bin/bash

# 📦 Script de instalación de dependencias de testing
# Uso: bash install-testing-deps.sh

echo "📥 Instalando Jest y dependencias de testing..."

npm install --legacy-peer-deps \
  jest@^29.7.0 \
  @babel/preset-env@^7.25.0 \
  @babel/preset-react@^7.25.0 \
  babel-jest@^29.7.0 \
  @testing-library/react@^14.1.2 \
  @testing-library/react-native@^12.4.0 \
  @testing-library/jest-dom@^6.1.5 \
  jest-environment-node@^29.7.0 \
  --save-dev

echo "✅ Instalación completada"
echo ""
echo "🚀 Próximos pasos:"
echo "1. npm test              # Ejecutar todos los tests"
echo "2. npm run test:watch    # Modo watch para desarrollo"
echo "3. npm run test:coverage # Generar reporte de cobertura"
