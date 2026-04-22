// components/DeleteDiagnosticsButton.js
// Botón para ejecutar diagnósticos de eliminación

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Button from './Button';

export default function DeleteDiagnosticsButton({ _isDarkMode = false }) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  const captureLogs = () => {
    const capturedLogs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      capturedLogs.push({ type: 'log', message: args.join(' ') });
      originalLog(...args);
    };

    console.error = (...args) => {
      capturedLogs.push({ type: 'error', message: args.join(' ') });
      originalError(...args);
    };

    console.warn = (...args) => {
      capturedLogs.push({ type: 'warn', message: args.join(' ') });
      originalWarn(...args);
    };

    return { capturedLogs, restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }};
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    
    try {
      const { capturedLogs, restore } = captureLogs();

      // Importar y ejecutar diagnósticos
      const DiagnosticsModule = await import('../testDeleteDiagnostics');
      await DiagnosticsModule.runAllDiagnostics();

      restore();
      setLogs(capturedLogs);

    } catch (error) {
      setLogs(prevLogs => [
        ...prevLogs,
        { type: 'error', message: `Error crítico: ${error.message}` }
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const exportLogs = () => {
    const _logText = logs.map(log => `[${log.type.toUpperCase()}] ${log.message}`).join('\n');
    Alert.alert(
      'Logs copiados',
      'Los logs han sido copiados al portapapeles\nPuedes compartirlos para debuggeo',
      [{ text: 'OK' }]
    );
  };

  const getLogColor = (type) => {
    switch(type) {
      case 'error': return '#FF3B30';
      case 'warn': return '#FF9500';
      case 'log': return theme.text;
      default: return theme.textSecondary;
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.warning }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="bug" size={18} color="#FFF" />
        <Text style={styles.buttonText}>Diagnosticar</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isRunning && setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                🐛 Diagnóstico de Eliminación
              </Text>
              <Text style={styles.headerSubtitle}>
                Pruebo cada paso del proceso
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => !isRunning && setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {isRunning ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Ejecutando diagnósticos...
              </Text>
              <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
                Esto puede tomar unos segundos
              </Text>
            </View>
          ) : (
            <>
              {logs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="information-circle" size={48} color={theme.primary} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>
                    Haz clic en "Ejecutar Diagnóstico"
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    Se crearán tareas de prueba y se verificará la eliminación
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.logsContainer}>
                  <View style={[styles.logsContent, { backgroundColor: theme.backgroundSecondary }]}>
                    {logs.map((log, index) => (
                      <Text 
                        key={index}
                        style={[
                          styles.logEntry,
                          { 
                            color: getLogColor(log.type),
                            fontFamily: 'monospace',
                            fontSize: 11
                          }
                        ]}
                      >
                        {log.message}
                      </Text>
                    ))}
                  </View>
                </ScrollView>
              )}

              <View style={[styles.footer, { backgroundColor: theme.card }]}>
                <Button
                  label={isRunning ? "Ejecutando..." : "Ejecutar Diagnóstico"}
                  onPress={runDiagnostics}
                  disabled={isRunning}
                  variant="primary"
                  style={{ flex: 1 }}
                />
                {logs.length > 0 && (
                  <Button
                    label="Copiar Logs"
                    onPress={exportLogs}
                    disabled={isRunning}
                    variant="secondary"
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logsContent: {
    borderRadius: 8,
    padding: 12,
  },
  logEntry: {
    lineHeight: 16,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  }
});
