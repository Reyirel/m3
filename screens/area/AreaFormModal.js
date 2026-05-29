// screens/area/AreaFormModal.js
// Modal para crear y editar áreas

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createArea, updateArea } from '../../services/area/areaManagement';
import WebSafeBlur from '../../components/WebSafeBlur';

export default function AreaFormModal({
  visible,
  onClose,
  editingArea,
  onSuccess,
  onError,
  theme,
  isDark,
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('secretaria');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Cargar datos si está editando
  useEffect(() => {
    if (editingArea) {
      setNombre(editingArea.nombre || '');
      setTipo(editingArea.tipo || 'secretaria');
      setDescripcion(editingArea.descripcion || '');
    } else {
      setNombre('');
      setTipo('secretaria');
      setDescripcion('');
    }
    setErrors({});
  }, [editingArea, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      let result;

      if (editingArea) {
        // Actualizar
        result = await updateArea(editingArea.id, {
          nombre: nombre.trim(),
          tipo,
          descripcion: descripcion.trim(),
        });
      } else {
        // Crear
        result = await createArea({
          nombre: nombre.trim(),
          tipo,
          descripcion: descripcion.trim(),
        });
      }

      setSaving(false);

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        if (onError) {
          onError(result.error || 'Error desconocido');
        }
      }
    } catch (error) {
      setSaving(false);
      if (onError) {
        onError(error.message || 'Error al guardar el área');
      }
    }
  };

  const tiposDisponibles = [
    { label: '📋 Secretaría', value: 'secretaria' },
    { label: '📁 Dirección', value: 'direccion' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <WebSafeBlur intensity={isDark ? 80 : 90} style={styles.blurContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1118' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {editingArea ? `Editar "${editingArea.nombre}"` : 'Nueva Área'}
                </Text>
                <TouchableOpacity onPress={onClose} disabled={saving}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                {/* Nombre */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Nombre *</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        borderColor: errors.nombre ? theme.error : theme.border,
                        backgroundColor: isDark ? theme.glass : theme.glassStrong,
                      },
                    ]}
                  >
                    <Ionicons name="folder" size={20} color={theme.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="Ej: Secretaría de Tesorería"
                      placeholderTextColor={theme.textSecondary}
                      value={nombre}
                      onChangeText={setNombre}
                      editable={!saving}
                      maxLength={80}
                    />
                  </View>
                  {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}
                </View>

                {/* Tipo */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Tipo *</Text>
                  <View style={styles.tipoContainer}>
                    {tiposDisponibles.map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.tipoButton,
                          tipo === t.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                          { borderColor: theme.border },
                        ]}
                        onPress={() => setTipo(t.value)}
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.tipoButtonText,
                            tipo === t.value && { color: '#FFFFFF' },
                            { color: theme.text },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Descripción */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Descripción</Text>
                  <View
                    style={[
                      styles.textareaContainer,
                      {
                        borderColor: theme.border,
                        backgroundColor: isDark ? theme.glass : theme.glassStrong,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.textarea, { color: theme.text }]}
                      placeholder="Describe la función de esta área..."
                      placeholderTextColor={theme.textSecondary}
                      value={descripcion}
                      onChangeText={setDescripcion}
                      editable={!saving}
                      multiline={true}
                      numberOfLines={4}
                      maxLength={500}
                    />
                  </View>
                </View>

                <View style={styles.spacer} />
              </ScrollView>

              {/* Footer / Actions */}
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: theme.border,
                    backgroundColor: isDark ? theme.surface : theme.glassStrong,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={[styles.buttonText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>{editingArea ? 'Guardar' : 'Crear'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </WebSafeBlur>
      </View>
    </Modal>
  );
};

const createStyles = (theme, isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    blurContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      height: '85%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      flexDirection: 'column',
      paddingTop: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    formGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      height: 48,
    },
    input: {
      flex: 1,
      marginLeft: 10,
      fontSize: 16,
      fontWeight: '500',
    },
    textareaContainer: {
      borderRadius: 12,
      borderWidth: 1.5,
      padding: 12,
      minHeight: 100,
    },
    textarea: {
      fontSize: 15,
      fontWeight: '400',
      textAlignVertical: 'top',
      flex: 1,
    },
    tipoContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    tipoButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
    },
    tipoButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    spacer: {
      height: 20,
    },
    errorText: {
      color: theme.error,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 6,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 24,
      borderTopWidth: 1,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    cancelButton: {
      borderWidth: 1.5,
      backgroundColor: 'transparent',
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '700',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
