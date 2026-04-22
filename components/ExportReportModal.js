import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { exportReportToPDF, sharePDF, getReportExportStats } from '../services/exportService';
import { useNotification } from '../contexts/NotificationContext';
import WebSafeBlur from './WebSafeBlur';

Dimensions.get('window');

const ExportReportModal = ({ visible, onClose, report, task, allReports = [] }) => {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [exportType, setExportType] = useState('single'); // 'single' or 'all'
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    background: {
      flex: 1,
    },
    sheet: {
      maxHeight: '80%',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: isDark ? '#1C1118' : '#FFFFFF',
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    header: {
      marginBottom: 24,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#000',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: isDark ? '#888' : '#666',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 12,
    },
    optionCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    optionCardActive: {
      borderColor: theme.primary,
      backgroundColor: isDark ? 'rgba(159, 34, 65, 0.1)' : 'rgba(159, 34, 65, 0.05)',
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginBottom: 2,
    },
    optionDescription: {
      fontSize: 11,
      color: isDark ? '#888' : '#666',
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleSection: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
      borderRadius: 10,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#fff' : '#000',
    },
    statsCard: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)',
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      marginBottom: 12,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
      fontSize: 12,
    },
    statLabel: {
      color: isDark ? '#888' : '#666',
    },
    statValue: {
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    exportButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    buttonText: {
      fontWeight: '600',
      fontSize: 14,
    },
    cancelText: {
      color: isDark ? '#fff' : '#000',
    },
    exportText: {
      color: '#fff',
    },
  }), [isDark, theme]);

  useEffect(() => {
    if (allReports && allReports.length > 0) {
      setStats(getReportExportStats(allReports));
    }
  }, [allReports]);

  const handleExport = async () => {
    if (!report && exportType === 'single') {
      showError('Error: No report selected');
      return;
    }

    setLoading(true);
    try {
      let pdfUri;

      if (exportType === 'single' && report) {
        // Export single report
        pdfUri = await exportReportToPDF(
          report,
          report.images || [],
          task
        );
        showSuccess('PDF generado exitosamente');
      } else if (exportType === 'all' && allReports.length > 0) {
        // Export all reports
        pdfUri = await exportReportToPDF(
          allReports[0],
          allReports[0].images || [],
          task
        );
        showSuccess('Reportes exportados');
      }

      // Ask user what to do with PDF
      setTimeout(() => {
        Alert.alert(
          '¿Qué deseas hacer?',
          'El PDF está listo',
          [
            {
              text: 'Compartir',
              onPress: async () => {
                try {
                  await sharePDF(pdfUri);
                } catch (error) {
                  showError('Error al compartir: ' + error.message);
                }
              },
            },
            {
              text: 'Descargar',
              onPress: () => {
                showSuccess('PDF descargado a tu dispositivo');
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
            },
          ]
        );

        setLoading(false);
        onClose();
      }, 500);
    } catch (error) {
      if (__DEV__) console.error('Export error:', error);
      showError('Error: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <WebSafeBlur intensity={70} style={styles.container}>
        <TouchableOpacity
          style={styles.background}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Ionicons
                name="document-text"
                size={32}
                color={theme.primary}
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.title}>Exportar Reporte</Text>
              <Text style={styles.subtitle}>
                Descarga como PDF con fotos
              </Text>
            </View>

            {/* Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Exportación</Text>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  exportType === 'single' && styles.optionCardActive,
                ]}
                onPress={() => setExportType('single')}
                disabled={loading}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={exportType === 'single' ? 'checkmark-circle' : 'document'}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>Este Reporte</Text>
                  <Text style={styles.optionDescription}>
                    Exportar solo este documento
                  </Text>
                </View>
              </TouchableOpacity>

              {allReports && allReports.length > 1 && (
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    exportType === 'all' && styles.optionCardActive,
                  ]}
                  onPress={() => setExportType('all')}
                  disabled={loading}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={exportType === 'all' ? 'checkmark-circle' : 'documents'}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>Todos los Reportes</Text>
                    <Text style={styles.optionDescription}>
                      Exportar {allReports.length} reportes en un PDF
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Statistics */}
            {stats && exportType === 'all' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Resumen</Text>
                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total de reportes:</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Con calificación:</Text>
                    <Text style={styles.statValue}>{stats.rated}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Promedio de rating:</Text>
                    <Text style={styles.statValue}>
                      {stats.avgRating} / 5 ⭐
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Con imágenes:</Text>
                    <Text style={styles.statValue}>
                      {stats.withImages} ({stats.totalImages} fotos)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opciones</Text>
              <View style={styles.toggleSection}>
                <Text style={styles.toggleLabel}>
                  Incluir metadata
                </Text>
                <Switch
                  value={includeMetadata}
                  onValueChange={setIncludeMetadata}
                  disabled={loading}
                  trackColor={{ false: '#767577', true: theme.primary }}
                />
              </View>
            </View>

            {/* Info */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#666' }}>
                ℹ️ El PDF incluirá fecha, hora, descripción y todas las fotos
                adjuntas. Puedes compartir o descargar después.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.cancelText]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={[styles.buttonText, styles.exportText]}>
                    Exportar PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </WebSafeBlur>

    </Modal>
  );
};

export default ExportReportModal;
