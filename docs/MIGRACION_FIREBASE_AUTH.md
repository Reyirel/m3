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

`firestore.secure.rules` exige usuario activo para todo, reserva al admin el
borrado de tareas y la gestión de usuarios y áreas, y deja el historial, las
firmas y la auditoría como solo-agregar. Cualquier colección no listada queda
denegada: si una pantalla falla con "Missing or insufficient permissions", falta
declarar su colección.
