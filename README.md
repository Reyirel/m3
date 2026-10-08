# Sistema de Gestión Municipal

Aplicación para asignar, seguir y reportar las tareas de las áreas de un municipio. Funciona en web (instalable como app) y en Android e iOS con el mismo código.

Cada persona ve solo lo que le corresponde según su rol: el administrador ve todo, el secretario ve su secretaría y sus direcciones, y el director ve su área.

---

## Qué hace

- **Inicio** — resumen de lo que pide atención: tareas vencidas, las que vencen hoy, en revisión y de los próximos 7 días. Los recuadros de arriba filtran la misma pantalla.
- **Bandeja** — la lista de trabajo: buscar, filtrar, cambiar el estado, abrir el chat y eliminar.
- **Tablero** — columnas Pendiente, En proceso, En revisión y Cerrada.
- **Calendario** — tareas por día.
- **Reportes** — una sola pantalla con pestañas: indicadores por área (con alertas de las áreas con problemas), reportes enviados y analíticas.
- **Panel por rol** — ejecutivo (administrador), de secretaría o de área.
- **Detalle de tarea** — subtareas, avance, delegación, confirmación de avance, reportes con fotos y chat.
- **Notificaciones** en tiempo real dentro de la app y, en el teléfono, avisos locales de vencimiento.
- **Sin conexión** — la app abre con la última copia de las tareas y guarda los cambios en una cola que se envía al volver la red.
- **Modo claro y oscuro.**

## Roles

| Rol | Qué ve | Qué puede hacer |
|---|---|---|
| **Administrador** | Todas las tareas | Crear, editar, eliminar y cerrar tareas; administrar usuarios y áreas; ver todos los reportes |
| **Secretario** | Su secretaría y sus direcciones | Delegar a los directores de sus direcciones, crear subtareas, enviar a revisión |
| **Director** | Su área y lo que tiene asignado | Actualizar sus tareas, confirmar su avance, enviar reportes |

Las reglas están en `services/permissions.js` (cambios de estado y borrado) y `utils/taskVisibility.js` (qué tareas ve cada quien).

### Flujo de una tarea delegada

1. El secretario abre una tarea de su área y la delega a un director de sus direcciones.
2. El director trabaja la tarea y confirma su avance.
3. Cuando todos los asignados confirman, la tarea pasa a **En revisión**.
4. El administrador la revisa y la cierra.

---

## Tecnología

- **React Native 0.81** con **Expo SDK 54**; en web se usa `react-native-web`.
- **Firebase**: Firestore (datos en tiempo real), Storage (fotos de reportes y chat), Auth y Cloud Functions.
- **React Navigation 6** (pestañas + pila, con enlaces directos en web).
- **Jest** para las pruebas y **ESLint** para el estilo.
- Despliegue web en **Vercel** desde la rama `main`.

## Estructura

```
App.js                 Navegación, proveedores y pantalla de error
firebase.js            Configuración de Firebase y copia local de Firestore
screens/               Una pantalla por archivo
  home/ inbox/ kanban/ calendar/ reports/ dashboard/ task/ …
                       Piezas y estilos que solo usa esa pantalla
components/            Componentes compartidos
  ui/                  Base del diseño: Card, PrimaryButton, ScreenHeader
  task/ admin/ selectors/
services/              Acceso a datos y reglas de negocio (las pantallas no leen Firestore directo)
contexts/              Sesión, tareas, tema y avisos
hooks/ utils/          Lógica reutilizable sin interfaz
theme/                 tokens.js (espaciado, tipografía, radios) y motion.js (animaciones)
tests/                 Pruebas; render/ dibuja las pantallas, rules/ prueba las reglas
scripts/               Mantenimiento; archivo/ guarda los de un solo uso ya ejecutados
docs/                  Seguridad, rendimiento y migración a Firebase Auth
```

### Convenciones de diseño

- Los colores salen del tema (`useTheme()`), no se escriben a mano: así funcionan en modo claro y oscuro.
- Espaciado, tipografía y radios salen de `theme/tokens.js`.
- Las animaciones se crean con `timing`, `spring` y `loop` de `theme/motion.js`, que respetan "reducir movimiento".
- Los estilos largos van en un archivo `…Styles.js` junto a su pantalla.
- Tarjeta, botón y encabezado comunes: `components/ui/Card.js`, `PrimaryButton.js` y `ScreenHeader.js`.

---

## Puesta en marcha

Requisitos: Node.js 18 o superior y un proyecto de Firebase con Firestore, Storage y Authentication.

```bash
npm install
cp .env.example .env    # y completa las credenciales de Firebase
npm start               # servidor de desarrollo (web: tecla w)
```

Variables de `.env` (las lee `app.config.js` al compilar):

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
```

Si cambias `babel.config.js` o instalas o quitas dependencias, reinicia limpiando la caché: `npx expo start -c`.

## Comandos

| Comando | Para qué |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run build:web` | Build web en `dist/` (el que usa Vercel) |
| `npm run lint` | Revisión de estilo; debe quedar sin avisos |
| `npm test` | Pruebas de lógica: permisos, visibilidad, cola sin conexión, resumen de Inicio, alertas |
| `npm run test:render` | Dibuja 28 pantallas con los tres roles y en tema oscuro; detecta errores que solo aparecen al mostrar una pantalla |
| `npm run test:rules` | Reglas de Firestore y Storage contra el emulador (necesita Java y `firebase-tools`) |
| `node scripts/generateIcon.mjs` | Regenera todos los iconos a partir de los SVG de `assets/` |

Antes de subir cambios: `npm run lint`, `npm test` y `npm run test:render`.

## Despliegue

Vercel compila y publica la rama `main` con `npm run build:web`: todo lo que llega a `main` sale a producción.

La app web guarda una copia para abrir sin conexión (service worker). Después de un despliegue, si el navegador sigue mostrando la versión anterior, recarga con Ctrl+F5.

## Seguridad

La migración de las cuentas a Firebase Auth está pendiente. Hasta completarla, las reglas publicadas (`firestore.rules`) no restringen el acceso; las reglas definitivas ya están escritas y probadas en `firestore.secure.rules`. El procedimiento paso a paso está en [docs/MIGRACION_FIREBASE_AUTH.md](docs/MIGRACION_FIREBASE_AUTH.md) y el contexto en [docs/SECURITY.md](docs/SECURITY.md).

## Problemas conocidos

- **"FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state"** en la consola del navegador: la copia local de Firestore quedó dañada. La app la borra y se recarga sola; si persiste, borra los datos del sitio en el navegador (F12 → Application → Storage → Clear site data).
- **El build nativo** (Android/iOS) solo está comprobado a nivel de bundle de JavaScript; falta probar la app compilada después de los últimos cambios de dependencias.

---

## Licencia

Uso interno municipal. Todos los derechos reservados.
