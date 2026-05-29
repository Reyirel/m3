# 🔐 Guía de Seguridad - Firestore Rules y Firebase

## Descripción General

Este documento detalla la estrategia de seguridad para el proyecto TodoApp MORENA usando Firebase/Firestore.

## ⚠️ Principios Fundamentales

1. **Least Privilege** - Los usuarios solo acceden a lo que necesitan
2. **Role-Based Access Control (RBAC)** - Permisos basados en roles
3. **Audit Trail** - Registrar cambios importantes
4. **Encryption in Transit** - All data via HTTPS

---

## 🔑 Estructura de Datos en Firestore

```
firestore-db/
├── users/{userId}
│   ├── email (string)
│   ├── role (ADMIN | JEFE | SECRETARIO | OPERATIVO)
│   ├── area (string - area del usuario)
│   ├── permissions (map)
│   ├── createdAt (timestamp)
│   └── lastActivity (timestamp)
├── tasks/{taskId}
│   ├── title (string)
│   ├── area (string)
│   ├── areas (array - para multi-area)
│   ├── assignedTo (array - emails)
│   ├── priority (HIGH | MEDIUM | LOW)
│   ├── status (PENDING | IN_PROGRESS | COMPLETED)
│   ├── createdBy (userId)
│   ├── createdAt (timestamp)
│   ├── updatedAt (timestamp)
│   └── isCoordinationTask (boolean)
├── auditLogs/{logId}
│   ├── action (CREATE | UPDATE | DELETE)
│   ├── collectionName (string)
│   ├── documentId (string)
│   ├── userId (string)
│   ├── changes (map)
│   ├── timestamp (timestamp)
│   └── ipAddress (string - opcional)
└── areas/{areaId}
    ├── name (string)
    ├── managers (array - userIds)
    └── permissions (map)
```

---

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== HELPERS =====
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }

    function isJefe() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'JEFE';
    }

    function isSecretario() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SECRETARIO';
    }

    function isOwnerOrAdmin(userId) {
      return request.auth.uid == userId || isAdmin();
    }

    function userArea() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.area;
    }

    // ===== USERS =====
    match /users/{userId} {
      // Leer propia info
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      
      // Crear propia cuenta (en signup)
      allow create: if request.auth.uid == userId && isSignedIn();
      
      // Actualizar propia info
      allow update: if request.auth.uid == userId && 
        !request.resource.data.role.exists(); // No pueden cambiar su rol
      
      // Solo ADMIN puede cambiar roles
      allow update: if isAdmin();
      
      // ADMIN puede eliminar
      allow delete: if isAdmin();
      
      // Listar usuarios (solo ADMIN, SECRETARIO)
      allow list: if isAdmin() || isSecretario();
    }

    // ===== TASKS =====
    match /tasks/{taskId} {
      // Leer tareas asignadas a este usuario o si es ADMIN
      allow read: if isSignedIn() && (
        isAdmin() ||
        request.auth.email in resource.data.assignedTo ||
        resource.data.createdBy == request.auth.uid
      );
      
      // ADMIN, JEFE, SECRETARIO pueden crear
      allow create: if isSignedIn() && (
        isAdmin() || isJefe() || isSecretario()
      ) && 
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.createdAt == request.time &&
        request.resource.data.assignedTo.size() > 0;
      
      // Actualizar si eres ADMIN o creador
      allow update: if isSignedIn() && (
        isAdmin() || 
        resource.data.createdBy == request.auth.uid
      ) &&
        request.resource.data.updatedAt == request.time;
      
      // Eliminar si eres ADMIN o creador
      allow delete: if isSignedIn() && (
        isAdmin() || 
        resource.data.createdBy == request.auth.uid
      );
    }

    // ===== AUDIT LOGS (solo lectura para ADMIN) =====
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Solo Cloud Functions escriben
    }

    // ===== NOTIFICATIONS =====
    match /notifications/{userId}/messages/{messageId} {
      allow read, update: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId || isAdmin();
    }
  }
}
```

---

## 🛡️ Medidas de Seguridad Adicionales

### 1. **Authentication**
```javascript
// ✅ Usar Firebase Auth con:
- Email/Password (verificado)
- MFA habilitado para roles críticos (ADMIN, SECRETARIO)
- Session timeout después de 30 min inactividad
```

### 2. **API Security**
```javascript
// En Cloud Functions, validar:
- Request signature
- Rate limiting (máx 100 req/min por usuario)
- Input validation (sanitize strings)
- Logs auditoria de cambios
```

### 3. **Data Encryption**
```
- Firebase encrypta datos en reposo (automático)
- HTTPS en tránsito (automático)
- Sensible data: Usar enkripción adicional
```

### 4. **Backup & Recovery**
```
- Firestore automated backups (cada 24h)
- Retención de 7 días de snapshots
- Recovery point objective (RPO): 24 horas
```

---

## 🚨 Checklist de Seguridad

- [ ] Firestore Rules están en producción (no en modo público)
- [ ] MFA habilitado para cuentas ADMIN
- [ ] Audit logs están siendo registrado en auditLogs
- [ ] API keys restringidas a solo servicios necesarios
- [ ] Dependencias de npm con `npm audit` sin vulnerabilidades críticas
- [ ] Secrets (.env) NO están en git
- [ ] Cloud Functions con autenticación requerida
- [ ] Rate limiting implementado en APIs
- [ ] Logs rotados y archivados regularmente
- [ ] Backup automático verificado

---

## 🔄 Implementación de Audit Logs

```javascript
// services/auditLog.js
export async function createAuditLog(action, collectionName, documentId, changes) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      action,           // CREATE | UPDATE | DELETE
      collectionName,   // tasks, users, etc
      documentId,
      userId: auth.currentUser.uid,
      changes,          // {fieldName: {before, after}}
      timestamp: serverTimestamp(),
      ipAddress: await getUserIpAddress(), // opcional
    });
  } catch (error) {
    logger.error('AuditLog', 'Failed to create audit log', error);
  }
}
```

---

## 📊 Monitoreo y Alertas

### Recomendaciones de Monitoring:
1. **Firebase Console** - Monitorear latencia y errores
2. **Cloud Logging** - Buscar patrones sospechosos
3. **Alertas automáticas** si:
   - Tasa de errores > 5%
   - Eliminación masiva de documentos
   - Múltiples login fallidos (brute force)
   - Acceso fuera de horario laboral

---

## 🔧 Troubleshooting Permisos

**Error: "PERMISSION_DENIED"**
- [ ] Verificar que usuario está autenticado
- [ ] Verificar role del usuario
- [ ] Verificar que task está asignada a usuario

**Error: "FAILED_PRECONDITION"**
- [ ] Rules tienen syntax errors
- [ ] Intentar en nueva ventana (caché de browser)

---

## 📚 Recursos Adicionales

- [Firebase Security Best Practices](https://firebase.google.com/docs/security/best-practices)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Última actualización**: 2026-04-13  
**Autor**: Equipo de Desarrollo
