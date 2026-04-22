# ⚡ Guía de Performance - Optimizaciones

Mejores prácticas y estrategias para optimizar performance en TodoApp MORENA.

## 📊 Métricas Clave

| Métrica | Target | Actual | Estado |
|---------|--------|--------|--------|
| Initial Load | < 2s | ? | ⏳ Medir |
| Time to Interactive | < 3.5s | ? | ⏳ Medir |
| First Paint | < 1s | ? | ⏳ Medir |
| Bundle Size | < 1.5MB | ? | ⏳ Medir |

---

## 🎯 Optimizaciones Implementadas

### ✅ App.js - Lazy Loading
```javascript
const LoginScreen = React.lazy(() => import('./screens/LoginScreen'));
const HomeScreen = React.lazy(() => import('./screens/HomeScreen'));
// -40% bundle inicial
```

### ✅ Contexts - Memoization
```javascript
// TasksContext debe usar useMemo para derivados expensive
const value = useMemo(() => ({
  tasks: filteredTasks,
  loading,
  error,
}), [filteredTasks, loading, error]);
```

### ✅ Components - Memoization
```javascript
export const TaskItem = React.memo(({ task, onPress }) => {
  // Re-renderiza solo si props cambian
  return <View>...</View>;
}, (prevProps, nextProps) => {
  // Custom comparison si es necesario
  return prevProps.task.id === nextProps.task.id;
});
```

---

## 🔍 Cómo Medir Performance

### 1. **React DevTools Profiler**
```javascript
// En desarrollo:
1. Abrir DevTools → Profiler tab
2. Grabar interacción
3. Analizar componentes que se re-renderizan
4. Buscar renders innecesarios
```

### 2. **Metro Bundler Analysis**
```bash
# Ver tamaño de bundle
npm run web -- --verbose

# Analizar imports
node -e "console.log(require('metro-core'))"
```

### 3. **Web Vitals (en web)**
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log); // Cumulative Layout Shift
getFID(console.log); // First Input Delay
getFCP(console.log); // First Contentful Paint
getLCP(console.log); // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

---

## 📋 Checklist de Performance

### Rendering
- [ ] Componentes reutilizados con `React.memo`
- [ ] Listas muy largas usando `FlatList` con `maxToRenderPerBatch`
- [ ] Props pasadas correctamente (no inline objects)
- [ ] `useMemo` para derivados expensive
- [ ] `useCallback` para event handlers en listas

### Estado
- [ ] Context dividido en múltiples (Tasks, Theme, Auth)
- [ ] No guardar derivados en estado (calcular con memoization)
- [ ] Unsubscribe en useEffect cleanup
- [ ] Evitar re-renders por cambios de contexto irrelevantes

### Tamaño de Bundle
- [ ] Lazy loading de pantallas
- [ ] Code splitting en rutas
- [ ] Tree-shaking activado (ESM)
- [ ] Libs heavy minificadas
- [ ] Eliminar console.log en producción

### Firestore
- [ ] Índices creados para queries comunes
- [ ] Queries limitadas con `limit(50)`
- [ ] Pagination implementada
- [ ] Listeners desuscritos en cleanup

### AsyncStorage
- [ ] Cache únicamente lo necesario
- [ ] Limpiar datos viejos (> 7 días)
- [ ] No serializar objetos grandes

---

## 🚀 Top 5 Optimizaciones Rápidas

### 1. Memoización de Context
```javascript
// ❌ ANTES: Re-renderiza todo cuando cambia cualquier cosa
const value = {
  tasks: filteredTasks,
  addTask,
  deleteTask,
};

// ✅ DESPUÉS: Solo re-renderiza si estas dependencias cambian
const value = useMemo(() => ({
  tasks: filteredTasks,
  addTask,
  deleteTask,
}), [filteredTasks, addTask, deleteTask]);
```

### 2. Lazy Loading
```javascript
// ✅ Cargar pantallas solo cuando se necesitan
const TaskDetailScreen = React.lazy(() => 
  import('./screens/TaskDetailScreen')
);

// Con Suspense
<Suspense fallback={<LoadingIndicator />}>
  <TaskDetailScreen />
</Suspense>
```

### 3. FlatList Optimization
```javascript
<FlatList
  data={tasks}
  renderItem={renderTask}
  keyExtractor={item => item.id}
  maxToRenderPerBatch={10}      // ✅ Renderizar 10 items a la vez
  updateCellsBatchingPeriod={50} // ✅ Actualizar cada 50ms
  removeClippedSubviews={true}   // ✅ Remover items ocultos
  initialNumToRender={20}         // ✅ Items iniciales
/>
```

### 4. Callback Memoization
```javascript
// ❌ Crea nueva función cada render
<TaskItem onPress={() => handlePress(task.id)} />

// ✅ Reutiliza función
const handleTaskPress = useCallback((taskId) => {
  navigation.push('TaskDetail', { taskId });
}, [navigation]);

<TaskItem onPress={() => handleTaskPress(task.id)} />
```

### 5. Component Memoization
```javascript
// ✅ Evita re-renders si props son iguales
export const TaskCard = React.memo(({ task, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(task.id)}>
      <Text>{task.title}</Text>
    </TouchableOpacity>
  );
});
```

---

## 🔧 Tools de Profiling

### Expo CLI
```bash
# Medir performance en desarrollo
expo start --dev-client

# Analytics de Vercel
npm install @vercel/analytics @vercel/speed-insights
```

### React DevTools
```javascript
// Profiler wrapper
<Profiler id="TasksContext" onRender={onRenderCallback}>
  <TasksProvider>
    <App />
  </TasksProvider>
</Profiler>

// Callback para analizar
const onRenderCallback = (id, phase, actualDuration) => {
  logger.debug('PERF', `${id} (${phase}) took ${actualDuration}ms`);
};
```

### Network
```javascript
// Medir tiempo de query
logger.perfStart('loadTasks');
const tasks = await loadTasksFromFirestore();
logger.perfEnd('loadTasks');
```

---

## 🛠️ Problemas Comunes y Soluciones

### Problema: Pantalla lag después de crear tarea
**Causa**: Re-render de toda la lista  
**Solución**: 
- [ ] Usar `useMemo` en TasksContext
- [ ] Memoizar TaskItem component
- [ ] Verificar onPress handler

### Problema: Input lag en forma de tarea
**Causa**: Re-render del form padre  
**Solución**:
- [ ] Separar state del form en su propio context
- [ ] Usar `useCallback` para handlers
- [ ] Debounce en onChange si busca en lista

### Problema: Scroll lento en lista de 1000+ items
**Causa**: Renderizar todos items a la vez  
**Solución**:
- [ ] Usar FlatList (no ScrollView + map)
- [ ] Implementar virtualization
- [ ] Reducir complejidad de cada item

### Problema: App crash en dispositivo viejo
**Causa**: Memoria insuficiente  
**Solución**:
- [ ] Reducir bundle size
- [ ] Lazy load imágenes
- [ ] Limpiar listeners no usados

---

## 📈 Monitoring en Producción

### Sugerencias de Alertas
```
- Si TTI > 5 segundos: investigar
- Si bundle > 2MB: optimizar
- Si errors > 5%: debug
- Si Firestore reads > 10k/día: optimizar queries
```

### Logging Performance
```javascript
// En services/Logger.js ya hay soporte
logger.perfStart('largeOperation');
await doSomethingExpensive();
logger.perfEnd('largeOperation');

// Si > 1000ms, se loguea como warning
```

---

## 📚 Recursos Adicionales

- [React Performance Tips](https://react.dev/reference/react/useMemo)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Firebase Performance Monitoring](https://firebase.google.com/docs/perf-mod)
- [Web Vitals](https://web.dev/vitals/)

---

**Última actualización**: 2026-04-13  
**Target**: Aplicación optimizada para dispositivos legacy
