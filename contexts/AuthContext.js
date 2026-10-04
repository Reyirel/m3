// contexts/AuthContext.js
// Única fuente de la sesión del usuario para toda la app.
//
// La sesión guardada en el dispositivo solo sirve para abrir la app sin conexión.
// Mientras hay sesión, el rol, el área y el estado de la cuenta se leen en tiempo real
// del documento del usuario en Firestore: lo que diga el servidor reemplaza la copia local.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentSession,
  logoutUser,
  subscribeToSessionUser,
} from '../services/authFirestore';
import { clearOfflineData } from '../services/offlineSync';
import { ROLES } from '../services/permissions';

const AuthContext = createContext(null);

const sameSession = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' mientras se restaura la sesión guardada
  const [status, setStatus] = useState('loading');
  // Motivo por el que el servidor cerró la sesión ('disabled', 'deleted', 'permission-denied')
  const [revokedReason, setRevokedReason] = useState(null);

  const reload = useCallback(async () => {
    try {
      const result = await getCurrentSession();
      if (result.success) {
        setRevokedReason(null);
        setUser(result.session);
        setStatus('signedIn');
      } else {
        setUser(null);
        setStatus('signedOut');
      }
      return result;
    } catch (error) {
      setUser(null);
      setStatus('signedOut');
      return { success: false, error: error.message };
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const signOut = useCallback(async () => {
    // Siempre cerrar sesión aunque algo falle
    try { await logoutUser(); } catch {}
    try { await clearOfflineData(); } catch {}
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Rol, áreas y estado de la cuenta: siempre los del servidor
  const userId = user?.userId;
  const authProvider = user?.authProvider;
  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToSessionUser(
      { userId, authProvider },
      (fresh) => setUser((prev) => (prev && sameSession(prev, fresh) ? prev : fresh)),
      (reason) => {
        setRevokedReason(reason);
        signOut();
      }
    );
  }, [userId, authProvider, signOut]);

  const value = useMemo(() => {
    const role = user?.role || null;
    return {
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'signedIn',
      role,
      isAdmin: role === ROLES.ADMIN,
      isSecretario: role === ROLES.SECRETARIO,
      isDirector: role === ROLES.DIRECTOR,
      revokedReason,
      reload,
      signOut,
    };
  }, [user, status, revokedReason, reload, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe estar dentro de AuthProvider');
  }
  return context;
}
