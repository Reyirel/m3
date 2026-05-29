# M3 — Sistema de Gestión de Tareas Municipales

> Versión mejorada y pulida | Rama: `improvements/refactor`

Sistema de gestión de tareas para administración municipal, con roles diferenciados, delegación, confirmación de avance y diseño glassmorphism.

---

## Características principales

- **Tablero Kanban** — columnas: Pendiente, En proceso, En revisión, Cerrada
- **Roles y permisos** — sistema de tres niveles con acceso diferenciado por rol
- **Delegación de tareas** — secretarios delegan a directores de sus áreas adscritas
- **Confirmación de avance** — directores confirman su parte; tarea pasa a revisión al completarse
- **Tareas coordinadas** — asignación a varias áreas genera subtareas por área automáticamente
- **Reportes y actividad** — historial de cambios y reportes por tarea
- **Chat por tarea** — comunicación contextual vinculada a cada tarea con subida de imágenes
- **Modo oscuro / claro** — toggle en el encabezado principal
- **Notificaciones en tiempo real** — alertas de asignación y vencimiento
- **Onboarding por rol** — tour guiado para administradores, secretarios y directores
- **Estadísticas** — métricas de cumplimiento en el dashboard

---

## Roles del sistema

| Rol | Descripción | Permisos clave |
|---|---|---|
| **Admin** | Administrador del sistema | Crear, editar, eliminar y cerrar cualquier tarea; gestión de usuarios; reportes globales |
| **Secretario** | Coordinador de área | Ver tareas de sus áreas adscritas; delegar a directores adscritos; crear subtareas |
| **Director** | Responsable de ejecución | Ver y actualizar tareas asignadas; confirmar avance propio |

---

## Tecnologías

- **React Native** + **Expo SDK**
- **Firebase Firestore** — base de datos en tiempo real con `onSnapshot`
- **Firebase Auth** — autenticación por email
- **Firebase Storage** — subida de imágenes en chat
- **React Navigation** — navegación entre pantallas
- **Expo Notifications** — notificaciones push
- **Glassmorphism UI** — color primario `#9F2241` (vino tinto)

---

## Estructura del proyecto

```
m3/
├── screens/          # Pantallas principales (Home, TaskDetail, Login, Chat…)
├── components/       # Componentes reutilizables
│   ├── task/         # Componentes específicos de tareas (ReadOnlyTaskModal, etc.)
│   ├── glass/        # Componentes con efecto glassmorphism
│   └── ui/           # Elementos de interfaz generales (HomeHeader, etc.)
├── services/         # Lógica de negocio y Firebase
│   ├── tasks.js      # CRUD de tareas con filtros por rol
│   ├── roles.js      # Consulta de titulares por área
│   ├── permissions.js        # Validación de cambios de estado por rol
│   └── taskConfirmations.js  # Confirmación individual de avance
├── contexts/         # ThemeContext, NotificationContext
├── hooks/            # useTasks, useTaskPermissions
├── utils/            # dateUtils, taskHelpers (normalizeStatus, isTaskAssignedToUser)
└── firebase.js       # Configuración de Firebase
```

---

## Flujo de delegación

1. El **secretario** abre una tarea de su área
2. Selecciona un director de sus áreas adscritas (`direcciones`)
3. La tarea queda asignada al director y visible para ambos
4. El director actualiza el estado y confirma su avance con **"Confirmar mi avance"**
5. Cuando todos los asignados confirman, la tarea pasa automáticamente a `en_revision`
6. El **admin** valida y cierra la tarea

---

## Instalación

### Requisitos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Proyecto Firebase con Firestore y Authentication habilitados

### Pasos

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

## Variables de entorno

Crea un archivo `.env` en la raíz:

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_BASE_URL=https://tu-dominio.com
```

---

## Cambios recientes destacados

### UX / Interfaz
- Diseño glassmorphism completo con soporte de modo oscuro y claro
- `TaskCard` rediseñado con barra de prioridad, badge de estado y chips de meta
- Header con avatar del usuario, badge de notificaciones y toggle de tema
- Skeleton loading en pantallas principales
- Tira de estadísticas en el dashboard

### Lógica de negocio
- Delegación de tareas: secretario → director de área adscrita
- Confirmación de avance individual por asignado
- Filtros de visibilidad estrictos por rol (secretario solo ve sus áreas)
- Validación de permisos antes de cualquier cambio de estado
- Normalización de `assignedTo` para compatibilidad con datos legacy

### Chat
- Burbujas estilo WhatsApp con separadores de fecha automáticos
- Subida de imágenes desde cámara o galería (hasta 4 MB)

---

## Licencia

Uso interno municipal. Todos los derechos reservados.
