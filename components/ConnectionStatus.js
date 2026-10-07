// components/ConnectionStatus.js
// Único indicador de conexión y sincronización de la app.
// Reemplaza a OfflineIndicator, OfflineBanner y OfflineSyncIndicator, que aparecían a la vez.
//
// Estados (solo se muestra uno):
//   sin conexión  → "Sin conexión · los cambios se guardan en este dispositivo"
//   sincronizando → "Sincronizando…"
//   pendientes    → "N cambios por sincronizar" + botón Sincronizar
//   con error     → "N reportes no se pudieron enviar" + botón Reintentar
// Con conexión y sin pendientes no se muestra nada.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  subscribeToConnectionState,
  subscribeToDiscardedOperations,
  getPendingCount,
  syncPendingOperations,
} from '../services/offlineSync';
import useOfflineReportsSync from '../hooks/useOfflineReportsSync';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, TYPOGRAPHY, TOUCH_TARGET } from '../theme/tokens';

const PENDING_POLL_MS = 5000;
const HIDDEN_OFFSET = -120;

export default function ConnectionStatus() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState(0);
  const [syncingOps, setSyncingOps] = useState(false);
  const reports = useOfflineReportsSync();
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;

  const refreshPending = useCallback(async () => {
    try {
      setPendingOps(await getPendingCount());
    } catch {
      // Sin acceso al almacenamiento: se conserva el último conteo
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToConnectionState((online) => {
      setIsOnline(online);
      refreshPending();
    });
    refreshPending();
    const interval = setInterval(refreshPending, PENDING_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshPending]);

  // Un cambio hecho sin conexión que el servidor rechazó (o que agotó los reintentos)
  // se descarta: se avisa, para que no desaparezca sin explicación
  useEffect(() => subscribeToDiscardedOperations((count) => {
    Toast.show({
      type: 'error',
      text1: count === 1
        ? 'Un cambio hecho sin conexión no se pudo guardar'
        : `${count} cambios hechos sin conexión no se pudieron guardar`,
      text2: 'Revisa la tarea y vuelve a hacer el cambio',
      position: 'top',
      visibilityTime: 7000,
    });
  }), []);

  const failedReports = reports.syncStats.totalFailed;
  const pendingTotal = pendingOps + reports.syncStats.totalPending;
  const isSyncing = syncingOps || reports.isSyncing;

  let state = null;
  if (!isOnline) {
    state = {
      icon: 'cloud-offline-outline',
      color: theme.textSecondary,
      text: pendingTotal > 0
        ? `Sin conexión · ${pendingTotal} ${pendingTotal === 1 ? 'cambio guardado' : 'cambios guardados'} en este dispositivo`
        : 'Sin conexión · los cambios se guardan en este dispositivo',
    };
  } else if (isSyncing) {
    state = { icon: 'sync-outline', color: theme.info, text: 'Sincronizando…' };
  } else if (failedReports > 0) {
    state = {
      icon: 'alert-circle-outline',
      color: theme.error,
      text: `${failedReports} ${failedReports === 1 ? 'reporte no se pudo enviar' : 'reportes no se pudieron enviar'}`,
      action: 'Reintentar',
    };
  } else if (pendingTotal > 0) {
    state = {
      icon: 'cloud-upload-outline',
      color: theme.warningText,
      text: `${pendingTotal} ${pendingTotal === 1 ? 'cambio' : 'cambios'} por sincronizar`,
      action: 'Sincronizar',
    };
  }

  const visible = !!state;
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : HIDDEN_OFFSET,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, translateY]);

  // Se conserva el último estado mientras la barra se oculta, para que no quede vacía
  const lastStateRef = useRef(null);
  if (state) lastStateRef.current = state;
  const shown = state || lastStateRef.current;

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    setSyncingOps(true);
    try {
      const result = await syncPendingOperations();
      if (typeof result?.pending === 'number') setPendingOps(result.pending);
      await reports.manualSync().catch(() => {});
    } catch {
      // El conteo de pendientes ya refleja lo que no se pudo enviar
    } finally {
      setSyncingOps(false);
      refreshPending();
    }
  };

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
      style={[
        styles.bar,
        {
          top: insets.top + SPACING.sm,
          backgroundColor: theme.surfaceL2,
          borderColor: theme.glassBorderStrong,
          shadowColor: theme.shadowColor,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={shown.icon} size={18} color={shown.color} />
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
        {shown.text}
      </Text>
      {shown.action && (
        <TouchableOpacity
          onPress={handleSync}
          style={[styles.action, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel={shown.action}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.actionText, { color: theme.buttonPrimaryText }]}>{shown.action}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    alignSelf: 'center',
    maxWidth: 520,
    left: SPACING.lg,
    right: SPACING.lg,
    marginHorizontal: 'auto',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: TOUCH_TARGET.min,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  action: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
});
