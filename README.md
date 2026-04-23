# M3 — Versión Experimental v2.0.0

> Rama: `improvements/refactor` | Repo: https://github.com/Haz117/M2.git

Esta versión es un rediseño visual y estructural completo sobre la base estable. **No está lista para producción.**

---

## Qué cambió en esta versión

### Chat de tareas (`TaskChatScreen`)
- Burbujas estilo WhatsApp: mensajes propios a la derecha (color vino), ajenos a la izquierda (blanco/cristal)
- Avatar circular con inicial del remitente en mensajes ajenos
- Separadores de fecha automáticos: `Hoy`, `Ayer`, `Lun 20 Abr`
- Timestamps compactos: `10:35 AM` en lugar de cadena completa
- Estado vacío con ícono cuando no hay mensajes
- Los mensajes nuevos guardan `authorId` para detección confiable de "es mío / es de otro"

### Subida de imágenes en chat (`ChatImageUpload`)
- Menú visible con dos opciones: **Cámara** y **Galería** (antes era long press oculto)
- Eliminado el fallback base64 que podía superar el límite de 1 MB de Firestore
- Indicador de actividad en el botón mientras sube la imagen
- Validación de tamaño máximo (4 MB)

### Formulario de tarea (`Nueva Tarea` / `TaskDetailScreen`)
- **Prioridad y Estado**: píldoras horizontales compactas con color propio, agrupadas en una tarjeta
- **Áreas**: trigger compacto → modal con búsqueda en tiempo real y agrupación por Secretarías / Direcciones
- **Asignados**: trigger con avatares apilados → modal de búsqueda de usuarios con checkbox
- **Fecha y Hora**: dos filas compactas que abren el picker nativo del sistema

### Pantalla principal (`HomeScreen`)
- `TaskCard` rediseñado: barra izquierda de color por prioridad, badge de estado, chips de meta en footer
- Corrección de crash al navegar a `TaskDetailScreen` sin parámetros

### Bandeja (`MyInboxScreen`)
- Eliminados los botones flotantes de acción rápida
- Acciones integradas directamente en la tarjeta: cambio de estado + chat

### Calendario (`CalendarScreen`)
- Días tappables con `TouchableOpacity` (antes `PremiumGlassCard` no respondía a clic en web)
- Colores de celda: vencida (naranja), alta prioridad (rojo), completada (verde)

### Contraste de texto (`ThemeContext`)
- `textSecondary`, `textTertiary`, `textMuted` aumentados en modo claro para mejor legibilidad

---

## Estado actual

| Módulo | Estado |
|---|---|
| Chat de tareas | Funcional |
| Subida de imágenes | Funcional (requiere Firebase Storage configurado) |
| Prioridad / Estado | Funcional |
| Selector de Áreas | Funcional (modal con búsqueda) |
| Selector de Asignados | Funcional (modal) — pendiente conectar `availableUsers` en `TaskDetailScreen` |
| Selector de Fecha | Funcional iOS/Android — en web usa picker nativo del browser |
| Calendario | Funcional |
| Bandeja | Funcional |

---

## Pendiente antes de fusionar a `main`

- [ ] `TaskDetailScreen.js`: cambiar `selected={}` por `value={}` en `AreaSelector` y `AssigneeSelector`
- [ ] Cargar y pasar `availableUsers` con `getAllUsersNames()` en `TaskDetailScreen`
- [ ] Pruebas en dispositivo iOS/Android (DateTimePicker nativo)
- [ ] Revisar permisos de Firestore para el campo `authorId` en mensajes de chat

---

## Instalación

```bash
npm install
npx expo start
```

Para web:
```bash
npx expo export --platform web
npx serve dist
```

---

## Variables de entorno requeridas

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```
