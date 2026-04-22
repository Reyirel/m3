## ⌨️ KEYBOARD NAVIGATION GUIDE - Phase 2

**Implementar navegación completa por teclado para cumplir WCAG 2.1**

---

## Objetivo
Permitir que usuarios que NO pueden usar touch (teclado, switch controls, etc.) naveguen por toda la app.

---

## 🎯 PATRONES BÁSICOS

### 1. **Tab Navigation (Navegación con Tab)**

```javascript
// En componentes interactivos, el orden importa:
import { AccessibilityInfo } from 'react-native';

// Para web: usar tabIndex
<Button tabIndex={1} onPress={handlePress} />
<Button tabIndex={2} onPress={handlePress} />

// Para React Native: usar accessibilityViewIsModal
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityTabIndex={0}  // En order
>
```

### 2. **Focus Management**

```javascript
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import { useRef } from 'react';

export function MyComponent() {
  const firstButtonRef = useRef();
  
  useEffect(() => {
    // Focus al botón primario cuando se monta
    if (firstButtonRef.current) {
      AccessibilityInfo.setAccessibilityFocus(
        findNodeHandle(firstButtonRef.current)
      );
    }
  }, []);

  return (
    <Button 
      ref={firstButtonRef}
      onPress={handleCancel}
      accessible={true}
      accessibilityHint="Presiona Enter para cancelar"
    />
  );
}
```

### 3. **Keyboard Shortcuts**

```javascript
// En pantalla principal
<View onKeyDown={(e) => {
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
    // Ctrl+K o Cmd+K para buscar
    openSearch();
  }
  if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
    // Ctrl+N o Cmd+N para nueva tarea
    createTask();
  }
  if (e.key === 'Escape') {
    closeModal();
  }
}}>
```

---

## 🔄 IMPLEMENTACIÓN EN HOMESCREEN

### Problema Actual:
- Las tareas son solo tocables (no navegables por teclado)
- Los filtros no tienen hint de keyboard
- El search no es navegable por teclado

### Solución:

```javascript
// En HomeScreen.js
import { useCallback, useRef, useEffect } from 'react';

export default function HomeScreen({ navigation }) {
  const searchRef = useRef();
  const filterChipsRef = useRef([]);
  const tasksListRef = useRef();

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }

      // Tab: Navigate through filters
      if (e.key === 'Tab') {
        // Dejar que va natural pero ensure all children are focusable
      }

      // Enter: Activate filter
      if (e.key === 'Enter' && selectedFilterIndex >= 0) {
        handleFilterPress(filters[selectedFilterIndex]);
      }

      // Arrow keys: Navigate between filters
      if (e.key === 'ArrowRight' && selectedFilterIndex < filters.length - 1) {
        setSelectedFilterIndex(prev => prev + 1);
      }
      if (e.key === 'ArrowLeft' && selectedFilterIndex > 0) {
        setSelectedFilterIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedFilterIndex]);

  return (
    <View>
      {/* Search con focus ref */}
      <SearchBar
        ref={searchRef}
        placeholder="Buscar tareas... (Cmd+K)"
        accessibilityHint="Busca tareas por título. Usa Cmd+K para enfocarse"
      />

      {/* Filter chips con navegación arrow */}
      <View 
        role="tablist"
        aria-label="Filtros de tareas"
        style={{ flexDirection: 'row' }}
      >
        {filters.map((filter, idx) => (
          <FilterChip
            key={filter.id}
            filter={filter}
            isSelected={selectedFilterIndex === idx}
            onPress={() => handleFilterPress(filter)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                setSelectedFilterIndex(Math.min(idx + 1, filters.length - 1));
              } else if (e.key === 'ArrowLeft') {
                setSelectedFilterIndex(Math.max(idx - 1, 0));
              }
            }}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={`Filtro ${filter.label}`}
            accessibilityHint={`Presiona Enter para filtrar. ${
              idx > 0 ? 'Flecha izqda para anterior' : ''
            } ${idx < filters.length - 1 ? 'Flecha derecha para siguiente' : ''}`}
            accessibilitySelected={selectedFilterIndex === idx}
          />
        ))}
      </View>

      {/* Task list con role */}
      <FlatList
        ref={tasksListRef}
        data={filteredTasks}
        renderItem={({ item }) => (
          <TaskItem 
            task={item}
            accessible={true}
            role="listitem"
          />
        )}
      />
    </View>
  );
}
```

---

## ♿ CHECKLIST - KEYBOARD NAVIGATION

### HIGH PRIORITY (Completar esta semana)
- [ ] Todos los botones: Tab → Enter/Space
- [ ] Todos los inputs: Focus visible, tab-through
- [ ] Modals: Trap focus, ESC para cerrar
- [ ] Menus: Arrow keys para navegar
- [ ] Links: Enter para activar

### MEDIUM (2-3 semanas)
- [ ] Shortcuts (Ctrl+N, Ctrl+K, etc.)
- [ ] Focus visible outline en todos lados
- [ ] Search accesible por Screen Reader
- [ ] Scroll con Page Up/Down
- [ ] Home/End en listas

### OPTIONAL (Después)
- [ ] Vim keybindings (hjkl)
- [ ] Switch control support
- [ ] Eye-tracking support
- [ ] Voice control hints

---

## 🎹 KEYBOARD SHORTCUTS ESTÁNDAR

Implementa estos en tu app:

```javascript
const KEYBOARD_SHORTCUTS = {
  // Navegación
  'Cmd+K': 'Buscar',
  'Cmd+N': 'Nueva tarea',
  'Escape': 'Cerrar modal/Cancelar',
  'Enter': 'Activar/Confirmar',
  
  // En listas
  'ArrowUp': 'Item anterior',
  'ArrowDown': 'Item siguiente',
  'ArrowLeft': 'Padre/Contraer',
  'ArrowRight': 'Hijo/Expandir',
  'Home': 'Primero',
  'End': 'Último',
  'PageUp': 'Scroll arriba',
  'PageDown': 'Scroll abajo',
  
  // Editar
  'Cmd+E': 'Editar', 
  'Cmd+D': 'Duplicar',
  'Cmd+Del': 'Eliminar',
  'Cmd+Z': 'Deshacer',
  'Cmd+Shift+Z': 'Rehacer',
};
```

**Mostrar hints:**
```javascript
<Text style={{ fontSize: 11, color: theme.textTertiary }}>
  💡 Tip: Usa Cmd+K para buscar, Cmd+N para nueva tarea
</Text>
```

---

## 🔍 FOCUS INDICATORS

### Problema:
No se ve dónde está el foco en la app.

### Solución:
```javascript
// Crear hook para focus visible
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [focusColor, setFocusColor] = useState(null);

  return {
    onFocus: () => setIsFocusVisible(true),
    onBlur: () => setIsFocusVisible(false),
    focusStyle: isFocusVisible ? {
      borderWidth: 3,
      borderColor: '#3B82F6',
      boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.5)`,
    } : {},
  };
}

// En componente:
export function FocusableButton({ title, onPress }) {
  const { focusStyle, ...focusProps } = useFocusVisible();
  
  return (
    <Button
      {...focusProps}
      style={focusStyle}
      onPress={onPress}
    >
      {title}
    </Button>
  );
}
```

---

## 📋 TESTING CHECKLIST

### Manual Testing:
```
[ ] Tab through every interactive element
[ ] Shift+Tab backwards navigation
[ ] Enter/Space activates buttons
[ ] Escape closes modals
[ ] Arrows navigate menus
[ ] Each element has focus indicator visible
[ ] Focus never gets lost
[ ] Focus order makes logical sense
```

### Automated Testing:
```javascript
// Usar axe-core o similar
import { axe, toHaveNoViolations } from 'jest-axe';

test('keyboard is completely navigable', async () => {
  const { container } = render(<HomeScreen />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 🎓 RECURSOS

- [WCAG 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html)
- [ARIA APG - Keyboard Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [React A11y Docs](https://reactjs.org/docs/accessibility.html)

---

**Version:** 1.0 Phase 2  
**Status:** 📋 READY FOR IMPLEMENTATION
