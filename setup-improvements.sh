#!/bin/bash

# 🚀 SCRIPT DE INTEGRACIÓN - Mejoras Completas
# 
# Este script configura e integra todas las mejoras en el proyecto
# Ejecución: bash setup-improvements.sh

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 CONFIGURANDO MEJORAS - TodoApp MORENA"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Instalar dependencias de testing
echo -e "${YELLOW}[1/5] Instalando dependencias de testing...${NC}"
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

echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"

# Step 2: Verificar archivos creados
echo -e "${YELLOW}[2/5] Verificando archivos configurados...${NC}"

FILES=(
  "services/Logger.js"
  "jest.config.js"
  "jest.setup.js"
  "docs/SECURITY.md"
  "docs/PERFORMANCE.md"
  "components/README.md"
  "components/ImprovedErrorBoundary.js"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file FALTA"
  fi
done
echo ""

# Step 3: Instalar opcional: Lodash para debounce
echo -e "${YELLOW}[3/5] Instalando utilidades opcionales...${NC}"
npm install --legacy-peer-deps lodash
npm install --save-dev @types/lodash
echo -e "${GREEN}✅ Utilidades instaladas${NC}\n"

# Step 4: Crear estructura de docs si no existe
echo -e "${YELLOW}[4/5] Asegurando estructura de directorios...${NC}"
mkdir -p docs
mkdir -p utils
mkdir -p services
mkdir -p components
echo -e "${GREEN}✅ Directorios verificados${NC}\n"

# Step 5: Mensajes de próximos pasos
echo -e "${YELLOW}[5/5] Resumen de configuración${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ CONFIGURACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. 📚 LEE LA DOCUMENTACIÓN:"
echo "   - IMPROVEMENTS_SUMMARY.md (overview)"
echo "   - docs/SECURITY.md (seguridad)"
echo "   - docs/PERFORMANCE.md (performance)"
echo ""
echo "2. 🧪 EJECUTA TESTS:"
echo "   npm test                    # Ejecutar tests"
echo "   npm run test:watch          # Modo watch"
echo "   npm run test:coverage       # Cobertura"
echo ""
echo "3. 🔍 INTEGRA EL LOGGER:"
echo "   - Import: import logger from './services/Logger'"
echo "   - En servicios críticos: logger.info, logger.error"
echo ""
echo "4. 🔴 INTEGRA ERRORBOUNDARY:"
echo "   - En App.js: import ImprovedErrorBoundary from './components/ImprovedErrorBoundary'"
echo "   - Wrapper: <ImprovedErrorBoundary><App /></ImprovedErrorBoundary>"
echo ""
echo "5. 🔒 FIRESTORE SECURITY:"
echo "   - Revisar y aplicar rules en docs/SECURITY.md"
echo "   - Agregar Audit Logs si necesario"
echo ""
echo "6. 📊 MONITOREO:"
echo "   - Revisar docs/PERFORMANCE.md"
echo "   - Usar React DevTools Profiler"
echo "   - Ejecutar: logger.perfStart/perfEnd"
echo ""
echo -e "${YELLOW}🎓 RECURSOS:${NC}"
echo "   - Análisis de código: npx eslint ."
echo "   - Memory leaks: utils/listenersAudit.js"
echo "   - Componentes: components/README.md"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}¡Listo para comenzar! 🚀${NC}"
