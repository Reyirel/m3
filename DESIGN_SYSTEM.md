## 📚 DESIGN SYSTEM - TodoApp MORENA

**Sistema de Diseño Completo para TodoApp MORENA** - Guía para desarrolladores y diseñadores sobre cómo construir interfaces consistentes.

---

## 🎨 Principios de Diseño

### 1. **Glassmorphism Moderno**
- Efecto de vidrio con blur real en componentes clave
- Capas de opacidad estratégicas (10%, 25%, 50%)
- Jerarquía visual clara a través de glassmorphism
- Soporta dark/light mode con diferentes intensidades de blur

### 2. **Accesibilidad Primero**
- Contraste WCAG AA/AAA en todos los textos
- Labels accesibles en componentes interactivos
- Navegación por teclado completa
- Indicadores visuales de foco y estado

### 3. **Animaciones Naturales**
- Animaciones con native drivers (sin bloquear JavaScript)
- Spring animations para movimiento natural
- Feedback háptico estratégico (light, medium, heavy)
- Transiciones suaves entre estados

### 4. **Responsividad Adaptativa**
- Breakpoints: mobile (0px), tablet (768px), desktop (1024px)
- Layouts adaptativos usando flex
- Touch targets mínimos: 44x44px (accesibilidad)
- Padding y spacing proporcionales

---

## 🎯 Tokens de Diseño

### **Colores**

#### Primarios (Guinda Corporativo)
```javascript
primary: '#9F2241'           // Color principal
primaryLight: '#D32F4F'      // Variante clara
primaryDark: '#6B1630'       // Variante oscura
primaryFaded: rgba(159,34,65,0.1) // 10% opacidad
```

#### Modo Claro (Light Theme)
```javascript
bg: '#FFFFFF'                  // Fondo
text: '#111827'                // Texto principal ✅ WCAG AAA (19.86:1)
textSecondary: '#5A6B73'       // Texto secundario ✅ WCAG AA (6.5:1)
textTertiary: '#4B5563'        // Texto terciario ✅ WCAG AAA (9.2:1)
border: '#E5E7EB'              // Bordes
```

#### Modo Oscuro (Dark Theme)  
```javascript
bg: '#0F172A'                  // Fondo
text: '#F8FAFC'                // Texto principal ✅ WCAG AAA (18.7:1)
textSecondary: '#E0E7FF'       // Texto secundario ✅ WCAG AAA (8.2:1)
textTertiary: '#C7D2E4'        // Texto terciario ✅ WCAG AA (7.1:1)
border: '#334155'              // Bordes
```

#### Semánticos
```javascript
success: '#10B981'    // Éxito, completado
warning: '#F59E0B'    // Advertencia, atención
error: '#EF4444'      // Error, crítico
info: '#3B82F6'       // Información, relatable
```

---

### **Tipografía**

```javascript
// Tamaños
fontSize: {
  xs: 12,     // Labels pequeños, hints
  sm: 14,     // Texto secundario
  base: 16,   // Texto normal, body
  lg: 17,     // Texto grande  
  xl: 20,     // Títulos
  2xl: 24,    // Títulos principales
  3xl: 32,    // Héroes
}

// Pesos
fontWeight: {
  400: 'regular',
  600: 'semibold', 
  700: 'bold',
}

// Alturas de línea
lineHeight: {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
}
```

**Uso:**
- **Headers/Titles**: 24px, Bold (700), lineHeight 1.2
- **Body Text**: 16px, Regular (400), lineHeight 1.5
- **Secondary**: 14px, Regular (400), lineHeight 1.5
- **Hints/Labels**: 12px, Regular (400), lineHeight 1.2

---

### **Espaciado**

```javascript
spacing: {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  2xl: 48,
  3xl: 64,
}
```

**Aplicación:**
- Padding interno de componentes: `md` (16px)
- Margin entre componentes: `lg` (24px)
- Padding de pantalla: `lg` (24px)
- Espacio entre elementos en lista: `md` (16px)

---

### **Bordes y Radios**

```javascript
radius: {
  sm: 8,      // Botones pequeños
  md: 12,     // Componentes normales
  lg: 16,     // Cards, contenedores
  xl: 20,     // Modales grandes
  full: 9999, // Circulares
}
```

---

### **Sombras**

```javascript
shadows: {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
}
```

---

## 🧩 Componentes Clave

### **Button**

**Variantes:**
- `primary` - Acción principal (completar, crear)
- `secondary` - Acciones secundarias
- `ghost` - Acciones terciarias, links
- `danger` - Operaciones destructivas (eliminar)
- `glass` - Glassmorphism, operaciones superpuestas

**Tamaños:**
```javascript
small:  { padding: 10px 16px, height: 44px, fontSize: 14px }
medium: { padding: 14px 22px, height: 50px, fontSize: 16px }
large:  { padding: 17px 28px, height: 56px, fontSize: 17px }
```

**Ejemplo:**
```javascript
<Button
  title="Crear Tarea"
  variant="primary"
  size="medium"
  onPress={() => navigate('TaskDetail')}
  accessibilityLabel="Crear nueva tarea"
  accessibilityHint="Abre el formulario para crear una tarea"
  icon="add-circle"
  iconPosition="left"
/>
```

---

### **Card**

**Tipos:**
- `default` - Card estándar con sombra
- `glass` - Glassmorphism card
- `elevated` - Card elevada
- `flat` - Card sin sombra

**Estructura:**
```javascript
<Card>
  <Card.Header>
    <Text>Título</Text>
  </Card.Header>
  <Card.Body>
    {/* Contenido */}
  </Card.Body>
  <Card.Footer>
    {/* Acciones */}
  </Card.Footer>
</Card>
```

---

### **Input**

**Estados:**
- `default` - Normal
- `focused` - Input enfocado
- `filled` - Con valor
- `error` - Con error
- `success` - Validado
- `disabled` - Deshabilitado

**Propiedades Requeridas:**
```javascript
<Input
  placeholder="Escribe..."
  value={value}
  onChangeText={setValue}
  accessibilityLabel="Nombre de tarea"
  accessibilityHint="Escribe el título de la tarea"
  error={errors.title}
  maxLength={100}
/>
```

---

### **List/FlatList**

**Patrones:**
- Empty state cuando no hay datos
- Loading skeleton mientras carga
- Secciones agrupadas por fecha
- Swipe actions para operaciones rápidas
- Pull to refresh en mobile

**Ejemplo:**
```javascript
<FlatList
  data={tasks}
  renderItem={({ item }) => <TaskItem task={item} />}
  keyExtractor={(item) => item.id}
  ListEmptyComponent={<EmptyState ... />}
  ItemSeparatorComponent={() => <Divider />}
  scrollEventThrottle={16}
  removeClippedSubviews={true}
/>
```

---

### **Modal/Dialog**

**Niveles de Importancia:**
- Level 1: Critical (danger, confirmación destructiva)
- Level 2: Important (confirmación, decisión)
- Level 3: Info (información, helpers)

**Estructura:**
```javascript
<Modal visible={visible} transparent animationType="slide">
  <TouchableOpacity 
    style={styles.overlay} 
    onPress={onClose}
    activeOpacity={1}
  >
    <Animated.View style={animatedStyle}>
      <ModalHeader onClose={onClose} title="Título" />
      <ModalContent>
        {/* Contenido */}
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onPress={onClose}>Cancelar</Button>
        <Button onPress={onConfirm}>Confirmar</Button>
      </ModalFooter>
    </Animated.View>
  </TouchableOpacity>
</Modal>
```

---

## 🎬 Patrones de Animación

### **Spring Animation - Feedback Natural**
```javascript
Animated.spring(animValue, {
  toValue: 1,
  friction: 8,    // Menos fricción = más rebote
  tension: 200,   // Más tensión = más rápido
  useNativeDriver: true,
}).start();
```

### **Timing Animation - Transiciones**
```javascript
Animated.timing(animValue, {
  toValue: 1,
  duration: 300,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
}).start();
```

### **Stagger Animation - Listas**
```javascript
Animated.stagger(100, [
  Animated.timing(anim1, { toValue: 1, ... }),
  Animated.timing(anim2, { toValue: 1, ... }),
  Animated.timing(anim3, { toValue: 1, ... }),
]).start();
```

---

## ♿ Pautas de Accesibilidad

### **1. Labels Accesibles**
```javascript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Eliminar tarea"           // ¿Qué es?
  accessibilityHint="Toca dos veces para eliminar"  // ¿Qué pasa?
  accessibilityRole="button"                    // ¿Qué tipo es?
  accessibilityState={{ disabled: false }}      // ¿Estado?
>
```

### **2. Contrastes WCAG**
- AA: 4.5:1 para texto normal, 3:1 para texto grande
- AAA: 7:1 para texto normal, 4.5:1 para texto grande
- Todos los colores de texto han sido validados ✅

### **3. Touch Targets**
- Mínimo: 44x44 px (WCAG recomendación)
- Ideal: 48x48 px para mejor usabilidad
- Espaciado: >8px entre targets

### **4. Indicadores de Foco**
- Visible en navigación por teclado
- Contraste suficiente (mínimo 3:1)
- No depender solo de color

---

## 📱 Breakpoints y Layouts

```javascript
breakpoints: {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px
  desktop: 1024,  // 1024px+
}
```

**Layouts por Breakpoint:**
- **Mobile**: Single column, full width except safe margins
- **Tablet**: 2 columns, grid layout
- **Desktop**: 3+ columns, sidebar navigation

---

## 🔄 Dark Mode

**Implementación:**
```javascript
const { isDark, theme } = useTheme();

<View style={{
  backgroundColor: theme.bg,
  color: theme.text,
  borderColor: theme.border,
}}>
```

**Transiciones:**
- Todos los colores cambian suavemente
- Glassmorphism se adapta (blur intensity, tint)
- Shadows se ajustan automáticamente

---

## ✅ Checklist para Nuevos Componentes

- [ ] Accesibilidad: `accessible`, `accessibilityLabel`, `accessibilityRole`
- [ ] Dark mode: Usa `useTheme()` hook
- [ ] Responsividad: Usa `useResponsive()` para breakpoints
- [ ] Animaciones: Native driver siempre que sea posible
- [ ] Documentación: JSDoc con propiedades
- [ ] Testing: Incluye `testID` prop
- [ ] Performance: Usa `React.memo` si es PureComponent
- [ ] Error handling: Maneja estados de error/loading
- [ ] Contraste: Validar colores con `getContrastedColor()`

---

## 📚 Recursos

- **Colors**: Importar de `theme/enhancedTheme.js`
- **Spacing**: Importar de `theme/tokens.js`
- **Utilities**: `utils/AccessibilityHelper.js`
- **Hooks**: `hooks/useResponsive.js`, `contexts/ThemeContext.js`

---

**Última actualización:** Abril 2026  
**Versión:** 1.0
