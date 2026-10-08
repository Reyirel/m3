import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { createTaskReport, uploadReportImage } from '../services/reportsService';
import { getCurrentSession } from '../services/authFirestore';
import { savePendingReport } from '../services/offlineReportsService';
import { useNotification } from '../contexts/NotificationContext';
import { prepareImage } from '../utils/imageData';
import { showDialog } from '../utils/alert';
import WebSafeBlur from './WebSafeBlur';
import PrimaryButton from './ui/PrimaryButton';
import { createStyles } from './ReportFormModalStyles';


const ReportFormModal = ({ visible, onClose, taskId, onSuccess }) => {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError, showWarning } = useNotification();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showTemplates, setShowTemplates] = useState(true);

  const hasUnsavedChanges = title.trim() !== '' || description.trim() !== '' || images.length > 0 || rating > 0 || ratingComment.trim() !== '';

  const handleClose = () => {
    if (hasUnsavedChanges && !loading) {
      showDialog({
        title: 'Descartar cambios',
        message: '¿Deseas cerrar sin guardar? Se perderá el reporte no guardado.',
        buttons: [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: onClose },
        ],
      });
    } else {
      onClose();
    }
  };

  // 📋 Plantillas de reportes rápidos
  const REPORT_TEMPLATES = [
    {
      id: 'progress',
      icon: '📊',
      label: 'Avance',
      title: 'Reporte de avance',
      description: 'Se ha realizado avance en la tarea. ',
    },
    {
      id: 'completed',
      icon: '✅',
      label: 'Completado',
      title: 'Tarea completada exitosamente',
      description: 'Se completó la tarea satisfactoriamente. Resultados: ',
    },
    {
      id: 'issue',
      icon: '⚠️',
      label: 'Problema',
      title: 'Reporte de incidencia',
      description: 'Se presenta el siguiente problema o bloqueo: ',
    },
    {
      id: 'noNews',
      icon: '📌',
      label: 'Sin novedad',
      title: 'Sin novedad',
      description: 'No hay novedades que reportar en esta tarea. El trabajo continúa según lo planeado.',
    },
  ];

  const applyTemplate = (template) => {
    setTitle(template.title);
    setDescription(template.description);
    setShowTemplates(false);
  };

  // Monitorear estado de conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected === true);
    });
    
    // Verificar estado inicial
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected === true);
    });

    return () => unsubscribe();
  }, []);

  const styles = useMemo(() => createStyles(isDark, theme), [isDark, theme]);

  // Agregar una foto: se reduce antes de guardarla en el formulario, para que el envío
  // sea rápido y para poder conservarla en el dispositivo si no hay conexión
  const addPickedImage = async (asset) => {
    setPreparingImage(true);
    try {
      const prepared = await prepareImage(asset.uri);
      setImages(prev => [...prev, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        uri: prepared.uri,
        dataUrl: prepared.dataUrl,
        uploading: false,
      }]);
    } finally {
      setPreparingImage(false);
    }
  };

  const handleAddImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addPickedImage(result.assets[0]);
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking image:', error);
      showError('Error al seleccionar imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Se necesita permiso para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await addPickedImage(result.assets[0]);
      }
    } catch (error) {
      if (__DEV__) console.error('Error taking photo:', error);
      showError('Error al tomar foto');
    }
  };

  const handleRemoveImage = (imageId) => {
    setImages(images.filter((img) => img.id !== imageId));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    }

    if (!description.trim()) {
      newErrors.description = 'La descripción es requerida';
    } else if (description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Foto en el formato que se puede guardar en el dispositivo (data URL; la URI como respaldo)
  const storableImage = (img) => img.dataUrl || img.uri;

  // Guardar el reporte (o solo las fotos que faltan de uno ya enviado) para enviarlo después.
  // No pide confirmación: los diálogos con botones no funcionan en la versión web.
  const saveForLater = async ({ cloudId = null, pendingImages = images, userId } = {}) => {
    await savePendingReport({
      taskId,
      cloudId,
      title: title.trim(),
      description: description.trim(),
      images: pendingImages.map(storableImage),
      imageCount: pendingImages.length,
      rating: rating > 0 ? rating : null,
      ratingComment: ratingComment.trim(),
      userId,
    });
  };

  const handleSubmit = async () => {
    if (loading || !validateForm()) {
      return;
    }

    setLoading(true);
    setUploadingImages(false);

    let currentUser = null;
    let reportId = null;

    try {
      const result = await getCurrentSession();
      if (!result.success || !result.session) {
        throw new Error('Usuario no autenticado');
      }
      currentUser = result.session;

      // Sin conexión: guardar en el dispositivo; se envía solo al recuperar la señal
      const netState = await NetInfo.fetch();
      if (netState.isConnected !== true) {
        await saveForLater({ userId: currentUser.userId });
        showSuccess('Reporte guardado en el dispositivo. Se enviará al recuperar la conexión.');
        setTimeout(() => closeAndReset(), 800);
        return;
      }

      // PASO 1: Crear reporte SIN imágenes primero
      reportId = await createTaskReport(taskId, currentUser.userId, {
        title: title.trim(),
        description: description.trim(),
        rating: rating > 0 ? rating : null,
        ratingComment: ratingComment.trim(),
        images: [], // Vacío inicialmente
      });

      // PASO 2: Subir imágenes una por una
      const failedImages = [];
      // Fotos que no caben en el reporte: reintentar no lo arregla, no se guardan para después
      const rejectedImages = [];
      if (images.length > 0) {
        setUploadingImages(true);

        for (const img of images) {
          try {
            setUploadProgress(prev => ({
              ...prev,
              [img.id]: { status: 'uploading', progress: 0 }
            }));

            await uploadReportImage(taskId, reportId, {
              uri: img.uri,
              dataUrl: img.dataUrl,
              uploadedBy: currentUser.userId,
            });

            setUploadProgress(prev => ({
              ...prev,
              [img.id]: { status: 'success', progress: 100 }
            }));
          } catch (imgError) {
            if (imgError?.code === 'failed-precondition') rejectedImages.push(img);
            else failedImages.push(img);
            if (__DEV__) console.error('⚠️ Error subiendo foto:', imgError);
            setUploadProgress(prev => ({
              ...prev,
              [img.id]: { status: 'error', progress: 0, error: imgError.message }
            }));
          }
        }

        setUploadingImages(false);
      }

      // PASO 3: Las fotos que fallaron se guardan para reintentarse solas. El reporte ya
      // existe, así que se guarda su ID: el reintento solo sube las fotos, no lo duplica.
      if (failedImages.length > 0) {
        await saveForLater({ cloudId: reportId, pendingImages: failedImages, userId: currentUser.userId });
      }
      if (rejectedImages.length > 0) {
        showWarning(
          `Reporte enviado, pero ${rejectedImages.length} de ${images.length} foto(s) no cupieron. Envíalas en otro reporte.`
        );
      } else if (failedImages.length > 0) {
        showWarning(
          `Reporte enviado. ${failedImages.length} de ${images.length} foto(s) no se pudieron subir y se reintentarán automáticamente.`
        );
      } else {
        showSuccess(images.length > 0 ? 'Reporte y fotos enviados' : 'Reporte enviado');
      }

      setTimeout(() => closeAndReset(), 800);

    } catch (error) {
      if (__DEV__) console.error('❌ Error creating report:', error);

      // Si el reporte no llegó a crearse, se conserva en el dispositivo en vez de perderlo
      if (!reportId && currentUser) {
        try {
          await saveForLater({ userId: currentUser.userId });
          showWarning('No se pudo enviar ahora. El reporte quedó guardado y se enviará automáticamente.');
          setTimeout(() => closeAndReset(), 800);
        } catch (offlineError) {
          if (__DEV__) console.error('Error guardando offline:', offlineError);
          showError(offlineError.message || 'No se pudo enviar ni guardar el reporte');
        }
      } else {
        showError('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const closeAndReset = () => {
    setTitle('');
    setDescription('');
    setImages([]);
    setRating(0);
    setRatingComment('');
    setErrors({});
    setUploadProgress({});
    setUploadingImages(false);
    onSuccess?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <WebSafeBlur intensity={70} style={styles.container}>
        <TouchableOpacity accessibilityLabel="Cerrar"
          style={styles.background}
          activeOpacity={1}
          onPress={handleClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>Nuevo Reporte</Text>
                {/* Indicador de conexión */}
                <View style={[
                  styles.connectionBadge,
                  { backgroundColor: isOnline ? theme.success : theme.warning }
                ]}>
                  <Ionicons
                    name={isOnline ? 'wifi' : 'cloud-offline'}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.connectionText}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Documenta el avance con fotos y notas
              </Text>
            </View>

            {/* Aviso de modo offline */}
            {!isOnline && (
              <View style={styles.offlineWarning}>
                <Ionicons name="information-circle" size={18} color={theme.warning} />
                <Text style={styles.offlineWarningText}>
                  Sin conexión. El reporte se guardará localmente y se enviará cuando tengas internet.
                </Text>
              </View>
            )}

            {/* Plantillas rápidas */}
            {showTemplates && (
              <View style={styles.templatesSection}>
                <View style={styles.templatesHeader}>
                  <Text style={styles.templatesTitle}>📋 Plantillas rápidas</Text>
                  <TouchableOpacity onPress={() => setShowTemplates(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
                    <Ionicons name="close-circle-outline" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.templatesGrid}>
                  {REPORT_TEMPLATES.map(template => (
                    <TouchableOpacity 
                      key={template.id} 
                      style={[styles.templateChip, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}
                      onPress={() => applyTemplate(template)}
                    >
                      <Text style={styles.templateIcon}>{template.icon}</Text>
                      <Text style={[styles.templateLabel, { color: theme.text }]}>{template.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.label}>Título del Reporte *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Trabajo completado exitosamente"
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                value={title}
                onChangeText={setTitle}
                editable={!loading}
                maxLength={120}
                accessibilityLabel="Título del reporte"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {errors.title ? (
                  <Text style={styles.errorText}>{errors.title}</Text>
                ) : <View />}
                <Text style={{ fontSize: 12, color: title.length > 100 ? theme.warning : theme.textTertiary }}>
                  {title.length}/120
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.label}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe qué se hizo, pasos realizados, resultados..."
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                value={description}
                onChangeText={setDescription}
                multiline
                editable={!loading}
                maxLength={2000}
                accessibilityLabel="Descripción del reporte"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {errors.description ? (
                  <Text style={styles.errorText}>{errors.description}</Text>
                ) : <View />}
                <Text style={{ fontSize: 12, color: description.length > 1800 ? theme.warning : theme.textTertiary }}>
                  {description.length}/2000
                </Text>
              </View>
            </View>

            {/* Photos/Evidence */}
            <View style={styles.section}>
              <Text style={styles.label}>Fotos / Evidencia</Text>
              <View style={styles.imageGrid}>
                {images.map((image) => {
                  const imageStatus = uploadProgress[image.id];
                  return (
                    <View key={image.id} style={styles.imageContainer}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.image}
                        opacity={imageStatus?.status === 'error' ? 0.5 : 1}
                      />
                      
                      {/* Indicador de estado de upload */}
                      {uploadingImages && (
                        <View style={styles.uploadOverlay}>
                          {imageStatus?.status === 'uploading' && (
                            <ActivityIndicator color="#fff" size="large" />
                          )}
                          {imageStatus?.status === 'success' && (
                            <View style={styles.successBadge}>
                              <Ionicons name="checkmark-circle" size={32} color={theme.success} />
                            </View>
                          )}
                          {imageStatus?.status === 'error' && (
                            <View style={styles.errorBadge}>
                              <Ionicons name="close-circle" size={32} color={theme.error} />
                            </View>
                          )}
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(image.id)}
                        disabled={uploadingImages}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar"
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {preparingImage && (
                  <View style={[styles.addImageButton, { borderStyle: 'solid' }]}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={styles.addImageText}>Preparando…</Text>
                  </View>
                )}

                {images.length < 5 && !uploadingImages && !preparingImage && (
                  <View style={styles.imageButtonsRow}>
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={handleTakePhoto}
                      disabled={loading}
                    >
                      <Ionicons
                        name="camera"
                        size={28}
                        color={theme.primary}
                      />
                      <Text style={styles.addImageText}>Cámara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={handleAddImage}
                      disabled={loading}
                    >
                      <Ionicons
                        name="images"
                        size={28}
                        color={theme.primary}
                      />
                      <Text style={styles.addImageText}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Resumen de uploads si está uploadingImages */}
              {uploadingImages && (
                <View style={[styles.uploadSummary, { marginTop: 12 }]}>
                  <ActivityIndicator 
                    color={theme.primary} 
                    size="small" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={[styles.uploadSummaryText, { color: theme.primary }]}>
                    Enviando {images.length} foto(s)...
                  </Text>
                </View>
              )}
            </View>

            {/* Quality Rating */}
            <View style={styles.section}>
              <Text style={styles.label}>Calificación de Calidad</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={[
                      styles.star,
                      rating >= star && styles.starActive,
                    ]}
                    onPress={() => setRating(star)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Calificar"
                  >
                    <Ionicons
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={24}
                      color={rating >= star ? theme.text : theme.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <View style={styles.section}>
                  <Text style={styles.label}>Comentarios Adicionales</Text>
                  <TextInput
                    style={[styles.input, styles.ratingCommentInput]}
                    placeholder="Comparte detalles sobre la calidad del trabajo..."
                    placeholderTextColor={isDark ? '#666' : '#ccc'}
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    multiline
                    editable={!loading}
                    accessibilityLabel="Comentarios adicionales sobre la calificación"
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <PrimaryButton
              title="Cancelar"
              onPress={handleClose}
              disabled={loading}
              variant="secondary"
              size="medium"
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title={isOnline ? 'Enviar reporte' : 'Guardar sin conexión'}
              onPress={handleSubmit}
              loading={loading}
              disabled={preparingImage}
              size="medium"
              style={{ flex: 1 }}
              icon="checkmark-done"
            />
          </View>
        </View>
        </KeyboardAvoidingView>
      </WebSafeBlur>

    </Modal>
  );
};

export default ReportFormModal;
