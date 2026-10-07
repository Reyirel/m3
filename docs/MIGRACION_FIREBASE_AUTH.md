# Migración a Firebase Auth

Hoy la app valida la contraseña en el cliente y las reglas de Firestore permiten
leer y escribir todo sin sesión. Esta migración mueve la autenticación a Firebase
Auth para que las reglas puedan exigir sesión y rol.

El código de la app ya soporta ambos esquemas: intenta primero Firebase Auth y, si
la cuenta no existe ahí, usa el hash guardado en Firestore. Por eso se puede
desplegar la app antes de migrar sin que nadie pierda acceso.

## Antes de empezar

- Los pasos 1 a 4 no afectan a los usuarios. El paso 5 (reglas) es el que cierra
  la base de datos: después de él, quien no tenga cuenta en Firebase Auth no entra.
- Nada de esto se ha probado contra el proyecto real. Prueba primero con un solo
  usuario (`--only=`) y, si puedes, con el emulador de Firebase.
- Las Cloud Functions requieren el plan Blaze.

## Pasos

### 0. Entrar con una cuenta que tenga acceso al proyecto

El proyecto es `infra-sublime-464215-m5` (ya está como predeterminado en `.firebaserc`).

```bash
firebase login
firebase projects:list
```

Si el proyecto no aparece en la lista, esa cuenta no tiene acceso: entra con la cuenta
dueña del proyecto (`firebase logout` y `firebase login` de nuevo) antes de seguir.

### 1. Activar el proveedor

Consola de Firebase → Authentication → Sign-in method → activar
**Correo electrónico/contraseña**.

### 2. Simular la migración

Descarga una cuenta de servicio (Configuración del proyecto → Cuentas de servicio)
y guárdala fuera del repositorio.

```bash
npm install --no-save firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/ruta/cuenta-de-servicio.json
node scripts/migrateUsersToFirebaseAuth.mjs
```

La simulación no escribe nada. Muestra cuántos usuarios conservan su contraseña
(hash `pbkdf2` o `sha256`) y cuáles necesitan una nueva (hash antiguo de 32 bits,
que Firebase Auth no puede importar).

### 3. Migrar un usuario de prueba y verificar

```bash
node scripts/migrateUsersToFirebaseAuth.mjs --apply --only=correo@dominio.com
```

Inicia sesión en la app con ese usuario y su contraseña de siempre. Si entra, la
importación de hashes funciona. Si no entra, detente aquí: el usuario sigue
pudiendo entrar por el esquema anterior solo si borras su cuenta en
Authentication.

### 4. Migrar al resto

```bash
node scripts/migrateUsersToFirebaseAuth.mjs --apply --reset-legacy
```

`--reset-legacy` crea las cuentas con hash antiguo usando una contraseña temporal
y las guarda en `migracion-contrasenas-temporales.csv`. Entrégalas por un canal
seguro y borra el archivo.

El uid de cada cuenta es el id de su documento en `users`, así que ninguna
referencia existente cambia.

### 5. Desplegar funciones y reglas

Antes de desplegar, comprueba las reglas en el emulador (necesita Java):

```bash
npm run test:rules
```

Las funciones usan Node 22 y requieren el plan Blaze:

```bash
cd firebase-functions && npm install && cd ..
firebase deploy --only functions
```

| Función | Para qué |
| --- | --- |
| `adminSetUserPassword` | El administrador cambia la contraseña de otra cuenta. **Necesaria.** |
| `onUserDeleted` | Al borrar un usuario, borra su cuenta de Auth y sus tokens. **Necesaria.** |
| `onAreaSubtaskChanged` | Recalcula el avance de las tareas repartidas entre áreas. **Necesaria** con las reglas seguras: un director ya no puede leer las subtareas de otras áreas. |
| `onNotificationCreated` | Envía por push cada aviso de la app. Opcional. |
| `onReportRated` | Avisa al autor cuando califican su reporte. Opcional. |
| `notifyDueTasksReminder` | Cada 30 min avisa de las tareas que vencen en menos de 6 horas. Opcional. |
| `cleanupExpiredTokens` | Borra una vez al día los tokens de push vencidos. Opcional. |

Para desplegar solo las necesarias:

```bash
firebase deploy --only functions:adminSetUserPassword,functions:onUserDeleted,functions:onAreaSubtaskChanged
```

El push solo llega a la app nativa y necesita además `EAS_PROJECT_ID` al compilar
(ver `services/pushNotifications.js`). En web los avisos llegan mientras la app está abierta.

Luego reemplaza el contenido de `firestore.rules` por el de `firestore.secure.rules`
y despliega:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Si algo sale mal, vuelve a poner el contenido anterior de `firestore.rules` y despliega
de nuevo: los hashes siguen en Firestore hasta el paso 6, así que el acceso anterior
se recupera en segundos.

### 6. Borrar los hashes

Cuando todos puedan entrar:

```bash
node scripts/migrateUsersToFirebaseAuth.mjs --apply --strip-hashes
```

Borra `password` y `tempPassword` de los documentos ya migrados.

## Qué cambia para el administrador

- **Crear usuario**: crea la cuenta en Firebase Auth y el documento con el mismo uid.
- **Cambiar contraseña de otro usuario**: pasa por la función `adminSetUserPassword`.
  La contraseña nueva se muestra una vez en pantalla y ya no se guarda en Firestore.
- **Borrar usuario**: al borrar el documento, `onUserDeleted` borra la cuenta de Auth.

## Qué revisar después de activar las reglas

`firestore.secure.rules` exige usuario activo para todo y reserva al admin la
gestión de usuarios y áreas. Cualquier colección no listada queda denegada: si una
pantalla falla con "Missing or insufficient permissions", falta declarar su colección.

### Qué puede hacer cada quien

Las reglas aplican en el servidor lo mismo que `utils/taskVisibility.js` y
`services/permissions.js` en la app:

- **Admin**: ve y modifica todas las tareas.
- **Director**: solo las que tienen su correo en `assignedTo`.
- **Secretario**: las asignadas a su correo y las que tienen su secretaría en
  `secretarias`. Ese campo lo calcula la app al guardar (áreas de la tarea más la
  secretaría de cada asignado).
- Secretarios y directores solo mueven la tarea entre pendiente, en proceso y en
  revisión, confirman su parte y anotan avance. No editan el contenido, no finalizan
  ni reabren, y no tocan una tarea ya finalizada (salvo chat y reportes).
- Solo el secretario (y el admin) reasigna o delega; el director no.
- Nadie borra tareas: "eliminar" las marca con `deleted: true` (papelera).
- **Chat**: cada quien escribe a su nombre; los mensajes no se editan ni se borran.
- **Reportes**: el autor crea y completa el suyo; califican el admin y los secretarios.
  La lectura sigue abierta a cualquier usuario activo (la app filtra por rol).
- **Notificaciones**: cada quien lee solo las suyas.
- **Storage**: solo fotos de hasta 5 MB; no se sobrescriben ni se borran.

Todo esto está probado en el emulador (`tests/rules/`, 40 casos) con las mismas
consultas y escrituras que hace la app. Lo que el emulador no puede comprobar son
los datos reales. Antes de desplegar, revisa:

1. **Área canónica en `users`**: la regla compara `area` del secretario con
   `secretarias` de la tarea. El usuario de Seguridad Pública tiene
   `Secretaría de Seguridad Pública`; debe decir el nombre completo de
   `config/areas.js`. Si no coincide, la consulta del secretario se rechaza entera.
2. **Tareas anteriores sin `secretarias`**: los secretarios no las verán hasta
   rellenar el campo (los directores y el admin sí).
3. **Tareas antiguas con `assignedTo` como texto** (un solo correo en lugar de una
   lista): las reglas no las reconocen como asignadas. Conviértelas a lista.
4. Pantallas que consultan `tasks` sin filtro (analíticas, reportes, alertas por
   área): están pensadas para el admin; con otro rol devolverán error de permisos.
5. **Prueba cada rol** con una cuenta real (admin, secretario, director) antes de
   borrar los hashes: entrar, ver sus tareas, cambiar un estado, escribir en el chat
   y enviar un reporte con foto.
