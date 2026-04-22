## ♿ ACCESSIBILITY GUIDE PHASE 2 - Step by Step

**Guía completa para implementar accesibilidad en todos los componentes**

---

## 🎯 NIVEL 1: LOS BASICS (1-2 horas)

### PASO 1: Agregar Labels Accesibles

Para CADA componente interactivo (botón, input, icon):

```javascript
// ❌ ANTES (No accesible):
<TouchableOpacity onPress={handleDelete}>
  <Ionicons name="trash" size={24} />
</TouchableOpacity>

// ✅ DESPUÉS (Accesible):
<TouchableOpacity
  onPress={handleDelete}
  accessible={true}
  accessibilityLabel="Eliminar tarea"
  accessibilityHint="Toca para eliminar esta tarea permanentemente"
  accessibilityRole="button"
>
  <Ionicons name="trash" size={24} />
</TouchableOpacity>
```

**Patrón para Labels:**
```
accessibilityLabel = ¿QUÉ ES?
  "Botón guardar", "Campo nombre", "Checkbox completado"

accessibilityHint = ¿QUÉ PASA?
  "Toca para guardar cambios", 
  "Escribe el nombre de la tarea",
  "Marca como completado"

accessibilityRole = ¿QUÉ TIPO?
  "button", "checkbox", "input", "image", etc.
```

---

### PASO 2: States y Condiciones

```javascript
<TouchableOpacity
  accessibilityLabel="Tarea importante"
  accessibilityRole="checkbox"
  accessibilityState={{
    disabled: !canEdit,           // ¿Deshabilitado?
    checked: task.isImportant,    // ¿Marcado?
    busy: isLoading,              // ¿Cargando?
    expanded: showDetails,         // ¿Expandido?
  }}
>
```

---

### PASO 3: Live Updates

Para elementos que cambian sin recargar página:

```javascript
import { AccessibilityInfo } from 'react-native';

function TaskStatus({ status }) {
  useEffect(() => {
    // Anunciar cambios importantes al usuario
    if (status === 'completed') {
      AccessibilityInfo.announceForAccessibility(
        '✓ Tarea completada'
      );
    }
  }, [status]);

  return (
    <View 
      role="status"
      aria-live="polite"  // Para web
      aria-label={`Estado: ${status}`}
    >
      <Text>{status === 'completed' ? '✓' : '○'} {status}</Text>
    </View>
  );
}
```

---

## 🎯 NIVEL 2: COMPONENTES COMPLEJOS (2-4 horas)

### PASO 4: Listas y Grillas

```javascript
function TaskList({ tasks, onTaskPress }) {
  return (
    <FlatList
      data={tasks}
      accessible={true}
      accessibilityLabel="Lista de tareas"
      accessibilityRole="list"
      renderItem={({ item, index }) => (
        <View
          accessible={true}
          accessibilityLabel={`Tarea ${index + 1} de ${tasks.length}: ${item.title}`}
          accessibilityRole="listitem"
          accessibilityHint={`Prioridad ${item.priority}, asignada a ${item.assignee}`}
        >
          <TouchableOpacity onPress={() => onTaskPress(item)}>
            <Text>{item.title}</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

### PASO 5: Tablas de Datos

```javascript
function AreaMetricsTable({ data }) {
  return (
    <View
      accessible={true}
      accessibilityLabel="Tabla de métricas por área"
      accessibilityRole="table"
    >
      {/* Header */}
      <View 
        role="row"
        accessible={true}
        accessibilityLabel="Encabezados: Área, Tareas, Completadas, Tasa"
      >
        <Text role="columnheader">Área</Text>
        <Text role="columnheader">Tareas</Text>
        <Text role="columnheader">Completadas</Text>
        <Text role="columnheader">Tasa</Text>
      </View>

      {/* Filas */}
      {data.map((row) => (
        <View
          key={row.id}
          role="row"
          accessible={true}
          accessibilityLabel={`${row.area}: ${row.completed}/${row.total} (${row.percentage}%)`}
        >
          <Text role="cell">{row.area}</Text>
          <Text role="cell">{row.total}</Text>
          <Text role="cell">{row.completed}</Text>
          <Text role="cell">{row.percentage}%</Text>
        </View>
      ))}
    </View>
  );
}
```

---

### PASO 6: Modals y Dialogs

```javascript
function DeleteTaskModal({ visible, task, onConfirm, onCancel }) {
  const modalRef = useRef();

  useEffect(() => {
    if (visible) {
      // Cuando el modal abre, setear focus en botón de cancelar (seguro)
      const handle = findNodeHandle(modalRef.current);
      AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent>
      <View
        style={styles.overlay}
        accessible={true}
        accessibilityRole="dialog"
        accessibilityLabel="Confirmar eliminación"
        accessibilityViewIsModal={true}  // ← Importante: atrapa el focus
      >
        <View style={styles.dialog}>
          <Text 
            role="heading"
            style={styles.title}
            accessible={true}
            accessibilityLabel={`¿Eliminar "${task.title}"?`}
          >
            ¿Eliminar esta tarea?
          </Text>

          <Text 
            accessible={true}
            accessibilityLabel="Esta acción no se puede deshacer"
          >
            Esta acción es permanente
          </Text>

          {/* Botones */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              ref={modalRef}
              onPress={onCancel}
              accessible={true}
              accessibilityLabel="Cancelar"
              accessibilityHint="No eliminar, cerrar dialog"
              accessibilityRole="button"
            >
              Cancelar
            </Button>

            <Button
              onPress={onConfirm}
              accessible={true}
              accessibilityLabel="Eliminar tarea"
              accessibilityHint="ADVERTENCIA: Esta acción no se puede deshacer"
              accessibilityRole="button"
              variant="danger"
            >
              Eliminar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## 🎯 NIVEL 3: PATRONES AVANZADOS (4-8 horas)

### PASO 7: Form Validation

```javascript
function TaskForm({ onSubmit }) {
  const [errors, setErrors] = useState({});
  const titleRef = useRef();

  const handleSubmit = () => {
    const newErrors = validate(formData);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Anunciar que hay errores
      AccessibilityInfo.announceForAccessibility(
        `Por favor corrige ${Object.keys(newErrors).length} campos`
      );
      
      // Focus en primer error
      if (errors.title) {
        AccessibilityInfo.setAccessibilityFocus(findNodeHandle(titleRef));
      }
    } else {
      onSubmit(formData);
    }
  };

  return (
    <View
      accessible={true}
      accessibilityRole="form"
      accessibilityLabel="Crear nueva tarea"
    >
      {/* Title input con error */}
      <View>
        <Text 
          accessible={true}
          accessibilityLabel="Nombre de la tarea"
        >
          Título *
        </Text>
        <Input
          ref={titleRef}
          placeholder="Escribe el título"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          accessible={true}
          accessibilityLabel="Campo nombre de tarea"
          accessibilityHint={errors.title ? `Error: ${errors.title}` : 'Campo requerido'}
          accessibilityRole="none"  // El label ya lo dice
        />
        
        {/* Error message */}
        {errors.title && (
          <Text
            style={{ color: 'red' }}
            accessible={true}
            accessibilityLabel={`Error de validación: ${errors.title}`}
            accessibilityRole="alert"
            role="alert"
          >
            ⚠️ {errors.title}
          </Text>
        )}
      </View>

      {/* Submit */}
      <Button
        onPress={handleSubmit}
        accessible={true}
        accessibilityLabel="Crear tarea"
        accessibilityHint={Object.keys(errors).length > 0 ? 'Por favor corrige los errores' : 'Crear nueva tarea'}
        disabled={Object.keys(errors).length > 0}
      >
        Crear
      </Button>
    </View>
  );
}
```

### PASO 8: Loading & Async States

```javascript
function DataFetch({ isLoading, data, error }) {
  const loadingRef = useRef();

  useEffect(() => {
    if (isLoading) {
      // Anunciar que está cargando
      AccessibilityInfo.announceForAccessibility('Cargando contenido...');
    } else if (error) {
      AccessibilityInfo.announceForAccessibility(`Error: ${error.message}`);
    } else {
      AccessibilityInfo.announceForAccessibility('Contenido cargado');
    }
  }, [isLoading, error]);

  if (isLoading) {
    return (
      <View
        ref={loadingRef}
        accessible={true}
        accessibilityRole="status"
        accessibilityLabel="Cargando contenido"
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator />
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel="Error al cargar"
      >
        <Text>❌ Error: {error.message}</Text>
      </View>
    );
  }

  return (
    <View accessible={true} accessibilityLabel="Datos cargados">
      {data?.map((item) => <DataItem key={item.id} item={item} />)}
    </View>
  );
}
```

---

## 📋 IMPLEMENTACIÓN CHECKLIST

### Para cada NUEVO componente:

```javascript
// Template rápido:
<Component
  // 1. LABEL (¿Qué es?)
  accessible={true}
  accessibilityLabel="Descripción clara"
  
  // 2. ROLE (¿Qué tipo?)
  accessibilityRole="button"  // "button", "link", "image", "none", etc.
  
  // 3. ESTADO (¿Cómo está?)
  accessibilityState={{
    disabled: false,
    checked: false,
    busy: false,
  }}
  
  // 4. HINT (¿Qué pasa?)
  accessibilityHint="Tapa para ver detalles"
  
  // 5. ANUNCIO (¿Cambios importantes?)
  accessibilityLiveRegion="polite"  // Para web: role="status"
>
```

---

## 🔄 TESTING ACCESSIBILITY

### Manual (Todos debemos hacer esto):
```
1. Cierra los ojos
2. Activa TalkBack (Android) o VoiceOver (iOS)
3. Navega solo por touch y gestos
4. ¿Se entiende todo? ¿Puedes completar una tarea?
5. Prueba con keyboard (conecta teclado Bluetooth)
```

### Automated:
```bash
# Instalar herramientas
npm install jest-axe

# Test
test('all buttons have labels', async () => {
  const { container } = render(<TaskList />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 🚀 IMPLEMENTACIÓN SUGERIDA

### Semana 1: Basics (Nivel 1)
- [ ] Agregar labels a los 20 componentes más usados
- [ ] Validar en device real con VoiceOver/TalkBack

### Semana 2: Componentes (Nivel 2)
- [ ] Hacer listas accesibles
- [ ] Mejorar modals
- [ ] Error messages con role="alert"

### Semana 3: Avanzado (Nivel 3)
- [ ] Forms con validación accesible
- [ ] Keyboard navigation completa
- [ ] Loading states accesibles

---

**Status:** ✅ READY FOR TEAM IMPLEMENTATION  
**Estimated Time:** 15-20 horas total  
**Impact:** +20% accessibility score
