# 📱 Componentes Reutilizables - Índice y Referencia

Catálogo completo de componentes disponibles en el proyecto TodoApp MORENA.

## 🎯 Componentes Básicos

### UI Base
| Componente | Ubicación | Props | Uso |
|------------|-----------|-------|-----|
| `Button` | `components/Button.js` | `onPress`, `label`, `variant`, `size` | Botones reutilizables |
| `Card` | `components/Card.js` | `children`, `style`, `onPress` | Contenedores con sombra |
| `Input` | `components/Input.js` | `placeholder`, `value`, `onChangeText`, `icon` | Campos de entrada |
| `Text` | `components/Text.js` | `variant`, `size`, `color`, `children` | Tipografía consistente |
| `Avatar` | `components/Avatar.js` | `url`, `size`, `name` | Imagenes de usuario |

### Indicadores & Badges
| Componente | Props | Caso de Uso |
|------------|-------|-----------|
| `AnimatedBadge` | `count`, `animated` | Contador animado (notificaciones) |
| `ProgressBar` | `progress`, `size`, `color` | Progreso lineal |
| `CircularProgress` | `progress`, `radius`, `color` | Progreso circular |
| `PulsingDot` | `color`, `size`, `speed` | Indicador activo |
| `LoadingIndicator` | `size`, `variant` | Estados de carga |

### Modal & Overlay
| Componente | Props | Descripción |
|------------|-------|------------|
| `BottomSheet` | `isVisible`, `onClose`, `children` | Panel inferior deslizable |
| `ConfirmDialog` | `visible`, `title`, `onConfirm`, `onCancel` | Confirmación |
| `GlassModal` | `visible`, `children` | Modal con efecto glassmorphism |
| `PremiumSheet` | `visible`, `children`, `height` | Sheet premium animado |

---

## 🎨 Componentes Premium (Glassmorphism)

| Componente | Características | Demo |
|-----------|------------------|------|
| `PremiumGlassHeader` | Header glassmorphism + Ionicons | Top bar con blur real |
| `GlassCard` | Card con inner highlight rim | Contenedor estilizado |
| `AmbientOrbs` | Decoración de fondo animada | Efectos decorativos |
| `PremiumTabBar` | Tab bar flotante con pill-indicator | Navegación animada |
| `ScreenWithAmbient` | Wrapper para pantallas | Combina fondo + contenido |

---

## 📊 Componentes de Datos

### Gráficos & Estadísticas
| Componente | Tipo | Lógica |
|------------|------|--------|
| `Heatmap` | Mapa de calor | Visualizar densidad |
| `AreaComparisonChart` | Comparativa | 2+ áreas |
| `TrafficLightDashboard` | KPI | RG, Amarillo, Rojo |
| `PersonalWeeklyStats` | Timeline | 7 días |
| `OrgChart` | Árbol organizativo | Jerarquía |

### Listas & Selectores
| Componente | Props | Función |
|----------|-------|---------|
| `TaskItem` | `task`, `onPress`, `onSwipe` | Item de tarea con acciones |
| `SubtasksList` | `subtasks`, `onToggle` | Lista de subtareas |
| `AreaSelector` | `selected`, `onChange`, `multiple` | Selector de áreas |
| `MultiUserSelector` | `selected`, `onChange` | Seleccionar múltiples usuarios |
| `UserSelector` | `selected`, `onChange` | Selector de usuario único |

---

## 🎬 Componentes de Animación

| Componente | Efecto |
|-----------|--------|
| `ScreenTransition` | Transición entre pantallas |
| `FadeInView` | Fade in suave |
| `ConfettiCelebration` | Confetti animado |
| `ShimmerEffect` | Efecto shimmer (loading) |
| `PremiumParticles` | Partículas decorativas animadas |

---

## 🌐 Componentes Utilitarios

### Estado & Feedback
| Componente | Propósito |
|-----------|-----------|
| `ErrorBoundary` | Capturar errores de React |
| `OfflineIndicator` | Mostrar estado offline |
| `SyncIndicator` | Indicador de sincronización |
| `ConnectionIndicator` | Estado de conexión |
| `Toast` | Notificaciones tipo toast |

### UI Auxiliar
| Componente | Uso |
|-----------|-----|
| `SearchBar` | Campo búsqueda con ícono |
| `FilterBar` | Filtros aplicables |
| `ContextMenu` | Menú contextual |
| `Tooltip` | Información emergente |
| `QuickActionButton` | Botón de acción flotante |

---

## 📥 Importación Rápida

```javascript
// ✅ Usar index.js para imports limpios
import { Button, Card, Input, Avatar } from './components';

// ❌ Evitar
import Button from './components/Button';
import Card from './components/Card';
```

**Verificar que `components/index.js` exporta todos los componentes.**

---

## 🎯 Guía de Uso Rápido

### Button
```javascript
<Button 
  label="Save" 
  onPress={() => console.log('Saved')}
  variant="primary"
  size="large"
/>
```

### Card
```javascript
<Card style={styles.container}>
  <Text>Contenido de la tarjeta</Text>
</Card>
```

### Modal
```javascript
<ConfirmDialog
  visible={isVisible}
  title="¿Estás seguro?"
  onConfirm={handleConfirm}
  onCancel={() => setVisible(false)}
/>
```

### GlassCard
```javascript
<GlassCard intensity="medium">
  <Text>Glassmorphism effect</Text>
</GlassCard>
```

---

## 🔧 Mejores Prácticas

1. **Reutilizar componentes** - Evitar código duplicado
2. **Props bien documentadas** - Usar JSDoc/TypeScript
3. **Temas consistentes** - Usar `useTheme()` para colores
4. **Performance** - Memoizar si procesa datos pesados
5. **Accessibility** - Soportar screen readers

---

## 📚 Documentación Detallada

Para información específica de un componente:
```bash
grep -r "Component Name" components/
# O revisar el archivo .js directamente
```

---

## 🐛 Troubleshooting Componentes

**Componente no renderiza**
- [ ] ¿Está importado en `components/index.js`?
- [ ] ¿Tiene todas las props requeridas?
- [ ] ¿Hay errores en console?

**Styling incorrecto**
- [ ] Usar `useTheme()` para colores
- [ ] Verificar StyleSheet.create()
- [ ] Revisar media queries en web

---

**Última actualización**: 2026-04-13
