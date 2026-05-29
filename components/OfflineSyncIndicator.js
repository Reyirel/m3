/**
 * Componente para mostrar estado de sincronización de reportes offline
 * Puede integrarse en la UI principal para dar feedback al usuario
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import useOfflineReportsSync from '../hooks/useOfflineReportsSync';

const OfflineSyncIndicator = ({ compact = false }) => {
  const { theme, isDark } = useTheme();
  const { syncStats, isSyncing, syncProgress, isOnline, manualSync, hasPendingReports, hasFailedReports } = useOfflineReportsSync();
  const [showDetail, setShowDetail] = useState(false);

  // No mostrar nada si no hay reportes pendientes
  if (!hasPendingReports && !hasFailedReports) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? theme.glass : theme.glassStrong,
      borderRadius: 12,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle,
      borderLeftWidth: 4,
      borderLeftColor: hasFailedReports ? theme.error : theme.warning,
    },
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    compactLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    icon: {
      marginRight: 12,
    },
    text: {
      color: isDark ? '#fff' : '#000',
      fontSize: 13,
      fontWeight: '500',
    },
    badge: {
      backgroundColor: hasFailedReports ? '#FF3B30' : '#FFA500',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '600',
    },
    button: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    buttonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    detailModalContent: {
      backgroundColor: isDark ? '#1C1118' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
    },
    detailTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginBottom: 12,
    },
    detailSection: {
      marginBottom: 12,
    },
    detailLabel: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    progressContainer: {
      marginVertical: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: isDark ? '#333' : '#e0e0e0',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
    },
    progressText: {
      fontSize: 12,
      color: isDark ? '#888' : '#666',
      textAlign: 'center',
    },
    warningBox: {
      backgroundColor: hasFailedReports ? '#FF3B30' : '#FFA500',
      opacity: 0.1,
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    warningText: {
      color: hasFailedReports ? '#FF3B30' : '#FFA500',
      fontSize: 13,
      fontWeight: '500',
    },
  });

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowDetail(true)}
      >
        <View style={styles.compactContainer}>
          <View style={styles.compactLeft}>
            <Ionicons
              name={isSyncing ? 'sync' : hasFailedReports ? 'alert-circle' : 'cloud-upload'}
              size={18}
              color={hasFailedReports ? '#FF3B30' : '#FFA500'}
              style={styles.icon}
            />
            <Text style={styles.text}>
              {isSyncing ? 'Sincronizando reportes...' : `${syncStats.totalPending} reporte(s) pendiente(s)`}
            </Text>
            {hasFailedReports && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{syncStats.totalFailed} fallo(s)</Text>
              </View>
            )}
          </View>

          {!isSyncing && !isOnline && (
            <Text style={[styles.text, { color: '#FFA500' }]}>Sin conexión</Text>
          )}

          {!isSyncing && isOnline && (
            <TouchableOpacity style={styles.button} onPress={manualSync}>
              <Text style={styles.buttonText}>Sincronizar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Vista detallada
  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowDetail(true)}
      >
        <View style={styles.compactContainer}>
          <View style={styles.compactLeft}>
            <Ionicons
              name={isSyncing ? 'sync' : 'cloud-upload'}
              size={20}
              color={theme.primary}
              style={styles.icon}
            />
            <Text style={styles.text}>
              {isSyncing ? 'Sincronizando...' : 'Reportes pendientes de enviar'}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? '#666' : '#ccc'}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showDetail}
        transparent
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
          <View style={styles.detailModalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.detailTitle}>Estado de Sincronización</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>

            {hasFailedReports && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ {syncStats.totalFailed} reporte(s) con error. Tap para reintentar.
                </Text>
              </View>
            )}

            {isSyncing && syncProgress && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(syncProgress.current / syncProgress.total) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {syncProgress.current} de {syncProgress.total}
                </Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 300 }}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Pendientes de Enviar</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.detailValue}>{syncStats.totalPending}</Text>
                  <Text style={[styles.detailLabel, { marginLeft: 8 }]}>reportes presentes</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Ya Sincronizados</Text>
                <Text style={styles.detailValue}>{syncStats.totalSynced}</Text>
              </View>

              {hasFailedReports && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Con Error</Text>
                  <Text style={[styles.detailValue, { color: '#FF3B30' }]}>{syncStats.totalFailed}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Conexión</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={isOnline ? 'wifi' : 'wifi-off'}
                    size={16}
                    color={isOnline ? '#4CAF50' : '#FF3B30'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.detailValue, { color: isOnline ? '#4CAF50' : '#FF3B30' }]}>
                    {isOnline ? 'Conectado' : 'Sin conexión'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.button, { marginTop: 16, width: '100%', justifyContent: 'center' }]}
              onPress={() => {
                setShowDetail(false);
                manualSync();
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {syncStats.totalPending > 0 ? 'Sincronizar Ahora' : 'Cerrar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default OfflineSyncIndicator;
