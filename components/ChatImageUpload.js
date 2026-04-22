// components/ChatImageUpload.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Modal, SafeAreaView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export default function ChatImageUpload({ onImageCapture = () => {}, disabled = false }) {
  const [selectedImage, setSelectedImage]           = useState(null);
  const [previewVisible, setPreviewVisible]         = useState(false);
  const [sourceMenuVisible, setSourceMenuVisible]   = useState(false);
  const [uploading, setUploading]                   = useState(false);
  const [uploadProgress, setUploadProgress]         = useState(0);

  // ── permisos ────────────────────────────────────────────────────────────────
  const requestPermissions = async (needsCamera) => {
    if (needsCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas permiso de cámara para tomar fotos.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas permiso de galería para seleccionar fotos.');
        return false;
      }
    }
    return true;
  };

  // ── comprimir ────────────────────────────────────────────────────────────────
  const compressImage = async (uri) => {
    try {
      const maxSize = Platform.OS === 'web' ? 800 : 1280;
      const quality = Platform.OS === 'web' ? 0.6 : 0.75;
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxSize, height: maxSize } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
      );
      return result.uri;
    } catch {
      return uri;
    }
  };

  // ── seleccionar fuente ───────────────────────────────────────────────────────
  const openCamera = async () => {
    setSourceMenuVisible(false);
    const ok = await requestPermissions(true);
    if (!ok) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [4, 3], quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = await compressImage(result.assets[0].uri);
        setSelectedImage({ uri, type: 'photo' });
        setPreviewVisible(true);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara.');
    }
  };

  const openGallery = async () => {
    setSourceMenuVisible(false);
    const ok = await requestPermissions(false);
    if (!ok) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = await compressImage(result.assets[0].uri);
        setSelectedImage({ uri, type: 'gallery' });
        setPreviewVisible(true);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  // ── enviar ───────────────────────────────────────────────────────────────────
  const sendImage = async () => {
    if (!selectedImage) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      if (!storage) {
        Alert.alert('No disponible', 'El almacenamiento de imágenes no está configurado.');
        return;
      }

      const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storageRef = ref(storage, `chat-images/${filename}`);
      setUploadProgress(20);

      // Obtener blob
      let blob;
      try {
        const response = await fetch(selectedImage.uri);
        blob = await response.blob();
      } catch (fetchErr) {
        if (__DEV__) console.error('[ChatImageUpload] fetch blob error:', fetchErr);
        throw new Error('No se pudo procesar la imagen seleccionada.');
      }

      // Verificar tamaño — máximo 4 MB
      if (blob.size > 4 * 1024 * 1024) {
        Alert.alert('Imagen muy grande', 'La imagen debe ser menor a 4 MB. Intenta con otra.');
        return;
      }

      setUploadProgress(50);
      await uploadBytes(storageRef, blob);
      setUploadProgress(85);

      const downloadURL = await getDownloadURL(storageRef);
      setUploadProgress(100);

      onImageCapture({ uri: downloadURL, name: filename, type: 'image' });
      setSelectedImage(null);
      setPreviewVisible(false);
      setUploadProgress(0);

    } catch (error) {
      if (__DEV__) console.error('[ChatImageUpload] upload error:', error);
      Alert.alert('Error al enviar', error.message || 'No se pudo subir la imagen. Intenta de nuevo.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const cancel = () => {
    setSelectedImage(null);
    setPreviewVisible(false);
    setUploadProgress(0);
  };

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <View>
      {/* Botón del composer */}
      <TouchableOpacity
        style={[styles.imageBtn, (disabled || uploading) && styles.imageBtnDisabled]}
        onPress={() => setSourceMenuVisible(true)}
        disabled={disabled || uploading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Adjuntar imagen"
        accessibilityRole="button"
      >
        {uploading
          ? <ActivityIndicator size="small" color="#9F2241" />
          : <Ionicons name="image" size={22} color={(disabled || uploading) ? '#CCC' : '#9F2241'} />
        }
      </TouchableOpacity>

      {/* Menú: Cámara o Galería */}
      <Modal
        visible={sourceMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSourceMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setSourceMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Adjuntar imagen</Text>

            <TouchableOpacity style={styles.menuOption} onPress={openCamera}>
              <View style={styles.menuIconBg}>
                <Ionicons name="camera" size={22} color="#9F2241" />
              </View>
              <View>
                <Text style={styles.menuOptionLabel}>Cámara</Text>
                <Text style={styles.menuOptionSub}>Tomar una foto ahora</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption} onPress={openGallery}>
              <View style={styles.menuIconBg}>
                <Ionicons name="images" size={22} color="#9F2241" />
              </View>
              <View>
                <Text style={styles.menuOptionLabel}>Galería</Text>
                <Text style={styles.menuOptionSub}>Elegir de tus fotos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCancel} onPress={() => setSourceMenuVisible(false)}>
              <Text style={styles.menuCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de vista previa */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={cancel}
      >
        <SafeAreaView style={styles.previewContainer}>
          {/* Header */}
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={cancel} disabled={uploading} style={styles.previewHeaderBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Vista previa</Text>
            <TouchableOpacity
              onPress={sendImage}
              disabled={uploading}
              style={[styles.previewSendBtn, uploading && styles.previewSendBtnDisabled]}
            >
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.previewSendLabel}>Enviar</Text>
            </TouchableOpacity>
          </View>

          {/* Imagen */}
          <View style={styles.previewImageWrap}>
            {selectedImage && (
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="contain" />
            )}

            {/* Overlay de progreso */}
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadText}>Subiendo imagen…</Text>
                <Text style={styles.uploadPercent}>{uploadProgress}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          {!uploading && (
            <View style={styles.previewFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={sendImage}>
                <Ionicons name="send" size={16} color="#FFF" />
                <Text style={styles.confirmBtnText}>Enviar foto</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Botón en el composer
  imageBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(159,34,65,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(159,34,65,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBtnDisabled: {
    opacity: 0.45,
  },

  // Menú fuente
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 4,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  menuIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(159,34,65,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  menuOptionSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 1,
  },
  menuCancel: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },

  // Modal vista previa
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111111',
  },
  previewHeaderBtn: {
    padding: 6,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#9F2241',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewSendBtnDisabled: {
    opacity: 0.5,
  },
  previewSendLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  previewImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadPercent: {
    color: '#FF9F9F',
    fontSize: 28,
    fontWeight: '800',
  },
  progressBar: {
    width: 180,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9F2241',
    borderRadius: 2,
  },
  previewFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#111111',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9F2241',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
