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

```bash
cd firebase-functions && npm install && cd ..
firebase deploy --only functions:adminSetUserPassword,functions:onUserDeleted
```

Despliega solo esas dos. Las demás funciones de `firebase-functions/index.js`
apuntan a una colección `Tasks` y a campos que la app no usa.

Luego reemplaza el contenido de `firestore.rules` por el de `firestore.secure.rules`
y despliega:

```bash
firebase deploy --only firestore:rules,storage
```

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

`firestore.secure.rules` exige usuario activo para todo, reserva al admin la
gestión de usuarios y áreas, y deja el historial, las firmas y la auditoría como
solo-agregar. Cualquier colección no listada queda denegada: si una pantalla
falla con "Missing or insufficient permissions", falta declarar su colección.

### Visibilidad de tareas

Las reglas aplican en el servidor lo mismo que `utils/taskVisibility.js` en la app:

- **Admin**: ve y modifica todas las tareas.
- **Director**: solo las que tienen su correo en `assignedTo`.
- **Secretario**: las asignadas a su correo y las que tienen su secretaría en
  `secretarias`. Ese campo lo calcula la app al guardar (áreas de la tarea más la
  secretaría de cada asignado).
- Secretarios y directores solo pueden cambiar estado, confirmaciones, delegación
  y avance; no pueden finalizar ni editar el contenido.
- Nadie borra tareas: "eliminar" las marca con `deleted: true` (papelera).

Estas reglas no se han probado con el emulador. Antes de desplegarlas, revisa:

1. **Área canónica en `users`**: la regla compara `area` del secretario con
   `secretarias` de la tarea. El usuario de Seguridad Pública tiene
   `Secretaría de Seguridad Pública`; debe decir el nombre completo de
   `config/areas.js`.
2. **Tareas anteriores sin `secretarias`**: los secretarios no las verán hasta
   rellenar el campo (los directores y el admin sí).
3. **Avance entre áreas**: un director que no está asignado a la tarea principal
   no puede leer las subtareas de las otras áreas, así que el avance de la tarea
   principal solo se recalcula cuando el cambio lo hace el admin, el secretario o
   un asignado a la principal. Lo correcto a futuro es moverlo a una Cloud Function.
4. Pantallas que consultan `tasks` sin filtro (analíticas, reportes, alertas por
   área): están pensadas para el admin; con otro rol devolverán error de permisos.
