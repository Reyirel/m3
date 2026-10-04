// components/OrgChartEditor.js
// Editor visual del organigrama municipal — modos: Lista editable + Diagrama jerárquico

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addSecretariaToStructure, getAreaNameError, getOrgStructure, moveDireccionInStructure,
  moveSecretariaInStructure, renameAreaInStructure,
} from '../config/areas';
import { useTheme } from '../contexts/ThemeContext';
import {
  applyAreaRename, applyDireccionMove, moveDireccion, removeArea, renameArea, saveOrgStructure,
  subscribeToSavedOrgStructure,
} from '../services/orgStructure';
import { showDialog } from '../utils/alert';
import OrgDiagramBoard from './OrgDiagramBoard';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ─── Vista Lista (editable) ────────────────────────────────────────────────────
function ListView({ orgData, setOrgData, persist, onRename, onRemove, theme, isDark }) {
  const [expanded, setExpanded] = useState({});
  const [editingDir, setEditingDir] = useState(null);
  const [addingDir, setAddingDir] = useState(null);
  // "Enter" y perder el foco confirman los dos: solo cuenta el primero
  const editingRef = useRef(null);
  const addingRef = useRef(null);
  editingRef.current = editingDir;
  addingRef.current = addingDir;

  const cardBg = isDark ? '#1E1E2E' : '#FFFFFF';
  const borderCol = isDark ? '#2E2E3E' : '#E5E7EB';
  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  const confirmRename = (secIdx, dirIdx) => {
    const editing = editingRef.current;
    if (!editing) return;
    editingRef.current = null;
    setEditingDir(null);
    const oldName = orgData.secretarias[secIdx].direcciones[dirIdx];
    const name = editing.value.trim();
    if (!name || name === oldName) return;
    const error = getAreaNameError(orgData, name, oldName);
    if (error) {
      showDialog({ title: 'No se cambió el nombre', message: error });
      return;
    }
    onRename(oldName, name);
  };

  const confirmAdd = async (secIdx) => {
    const adding = addingRef.current;
    if (!adding) return;
    addingRef.current = null;
    setAddingDir(null);
    const name = adding.value.trim();
    if (!name) return;
    const error = getAreaNameError(orgData, name);
    if (error) {
      showDialog({ title: 'No se agregó la dirección', message: error });
      return;
    }
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones.push(name);
    setOrgData(newData);
    await persist(newData);
  };

  const removeDir = (secIdx, dirIdx) => onRemove(orgData.secretarias[secIdx].direcciones[dirIdx]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Admin node */}
      <View style={list.adminNodeWrap}>
        <View style={list.adminNode}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={list.adminRole}>ADMIN</Text>
            <Text style={list.adminName}>Administrador Municipal</Text>
          </View>
        </View>
        <View style={list.vertConnector} />
      </View>

      {orgData.secretarias.map((sec, secIdx) => {
        const isOpen = !!expanded[secIdx];
        const dirCount = sec.direcciones?.length ?? 0;
        return (
          <View key={secIdx} style={list.secWrapper}>
            <View style={list.leftTrack}>
              <View style={[list.horzDash, { backgroundColor: theme.primary }]} />
            </View>
            <View style={[list.secCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <TouchableOpacity
                style={list.secHeader}
                onPress={() => setExpanded(e => ({ ...e, [secIdx]: !e[secIdx] }))}
                activeOpacity={0.7}
              >
                <View style={list.secBadge}>
                  <Ionicons name="business-outline" size={13} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[list.secName, { color: theme.text }]} numberOfLines={2}>
                    {sec.nombre}
                  </Text>
                  <Text style={[list.secMeta, { color: subtextCol }]}>
                    {dirCount} dirección{dirCount !== 1 ? 'es' : ''}
                  </Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                  size={20} color={theme.primary}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={[list.dirsBox, { borderTopColor: borderCol }]}>
                  {(sec.direcciones || []).map((dir, dirIdx) => (
                    <View key={dirIdx} style={[list.dirRow, { borderBottomColor: borderCol }]}>
                      <View style={list.dirDot} />
                      {editingDir?.secIdx === secIdx && editingDir?.dirIdx === dirIdx ? (
                        <TextInput
                          style={[list.dirInput, { color: theme.text, borderColor: theme.primary, backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
                          value={editingDir.value}
                          onChangeText={v => setEditingDir(e => ({ ...e, value: v }))}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => confirmRename(secIdx, dirIdx)}
                          onBlur={() => confirmRename(secIdx, dirIdx)}
                        />
                      ) : (
                        <Text style={[list.dirName, { color: theme.text }]} numberOfLines={2}>{dir}</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => setEditingDir({ secIdx, dirIdx, value: dir })}
                        style={list.iconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Editar"
                      >
                        <Ionicons name="pencil-outline" size={15} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeDir(secIdx, dirIdx)}
                        style={[list.iconBtn, { marginLeft: 2 }]}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar"
                      >
                        <Ionicons name="close-circle-outline" size={15} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {addingDir?.secIdx === secIdx ? (
                    <View style={[list.dirRow, { borderBottomColor: 'transparent' }]}>
                      <View style={[list.dirDot, { backgroundColor: theme.primary }]} />
                      <TextInput
                        style={[list.dirInput, { flex: 1, color: theme.text, borderColor: theme.primary, backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
                        value={addingDir.value}
                        onChangeText={v => setAddingDir(e => ({ ...e, value: v }))}
                        placeholder="Nombre de la nueva dirección..."
                        placeholderTextColor={subtextCol}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => confirmAdd(secIdx)}
                        onBlur={() => confirmAdd(secIdx)}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={list.addBtn}
                      onPress={() => setAddingDir({ secIdx, value: '' })}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={theme.primary} />
                      <Text style={list.addBtnText}>Agregar dirección</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ─── Pedir un nombre (secretaría nueva o renombrada) ───────────────────────────
function NamePrompt({ prompt, orgData, theme, onClose }) {
  const [value, setValue] = useState(prompt.currentName || '');
  const [error, setError] = useState(null);

  const submit = () => {
    const name = value.trim();
    const problem = getAreaNameError(orgData, name, prompt.currentName);
    if (problem) {
      setError(problem);
      return;
    }
    onClose();
    if (name !== prompt.currentName) prompt.onSubmit(name);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.promptOverlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.promptCard, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
          <Text style={[styles.promptTitle, { color: theme.text }]} accessibilityRole="header">
            {prompt.title}
          </Text>
          <TextInput
            style={[styles.promptInput, { color: theme.text, borderColor: error ? theme.error : theme.primary }]}
            value={value}
            onChangeText={(text) => { setValue(text); setError(null); }}
            placeholder="Nombre de la secretaría"
            placeholderTextColor={theme.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Nombre de la secretaría"
          />
          {error && <Text style={[styles.promptError, { color: theme.error }]}>{error}</Text>}
          <View style={styles.promptButtons}>
            <TouchableOpacity
              style={[styles.promptButton, { backgroundColor: theme.surfaceL2 }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={[styles.promptButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promptButton, { backgroundColor: theme.primary }]}
              onPress={submit}
              accessibilityRole="button"
            >
              <Text style={[styles.promptButtonText, { color: '#fff' }]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function OrgChartEditor() {
  const { theme, isDark } = useTheme();
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | 'list'
  // Resultado del último cambio: { type: 'success' | 'warning', text, retry? }
  const [notice, setNotice] = useState(null);
  // Nombre que se está pidiendo: { title, currentName?, onSubmit }
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    return subscribeToSavedOrgStructure((structure) => {
      setOrgData(structure);
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (newData) => {
    setSaving(true);
    try {
      await saveOrgStructure(newData);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  }, []);

  // Aplicar a usuarios y tareas un cambio cuyo organigrama ya se guardó.
  // `retry` es la función que lo aplica y devuelve { users, tasks }.
  const applyPending = useCallback(async (retry) => {
    setSaving(true);
    try {
      const applied = await retry();
      setNotice({
        type: 'success',
        text: `Cambio aplicado: ${plural(applied.users, 'usuario actualizado', 'usuarios actualizados')} y ${plural(applied.tasks, 'tarea actualizada', 'tareas actualizadas')}.`,
      });
    } catch {
      setNotice({
        type: 'warning',
        text: 'Aún no se pudo aplicar el cambio a usuarios y tareas. Revisa tu conexión.',
        retry,
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Renombrar una secretaría o dirección: el nombre nuevo llega también a usuarios y tareas
  const performRename = useCallback(async (oldName, newName) => {
    setSaving(true);
    setNotice(null);
    setOrgData((prev) => renameAreaInStructure(prev, oldName, newName).structure);
    try {
      const result = await renameArea(oldName, newName);
      setOrgData(getOrgStructure());
      if (!result.changed) return;
      if (result.pending) {
        setNotice({
          type: 'warning',
          text: `El organigrama ya dice "${newName}", pero falta cambiar el nombre en usuarios y tareas.`,
          retry: () => applyAreaRename(oldName, newName),
        });
      } else {
        setNotice({
          type: 'success',
          text: `"${oldName}" ahora se llama "${newName}". ${plural(result.users, 'usuario actualizado', 'usuarios actualizados')} y ${plural(result.tasks, 'tarea actualizada', 'tareas actualizadas')}.`,
        });
      }
    } catch {
      setOrgData(getOrgStructure());
      Alert.alert('No se pudo renombrar', 'El organigrama no se guardó. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, []);

  const performRemove = useCallback(async (name) => {
    setSaving(true);
    setNotice(null);
    try {
      const { removed, usage } = await removeArea(name);
      setOrgData(getOrgStructure());
      if (removed) {
        setNotice({ type: 'success', text: `"${name}" se eliminó del organigrama.` });
      } else {
        showDialog({
          title: 'No se puede eliminar',
          message: `"${name}" todavía tiene ${plural(usage.users, 'usuario', 'usuarios')} y ${plural(usage.tasks, 'tarea abierta', 'tareas abiertas')}.\n\nCambia de área a esos usuarios y tareas, o cierra las tareas, y vuelve a intentarlo. Si solo cambió de nombre, renómbrala.`,
        });
      }
    } catch {
      Alert.alert('No se pudo eliminar', 'No se pudo revisar si el área sigue en uso. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleRemoveDireccion = useCallback((direccion) => {
    showDialog({
      title: 'Eliminar dirección',
      message: `"${direccion}" dejará de aparecer en el organigrama y en los selectores de área.\n\nSolo se elimina si ya no tiene usuarios ni tareas abiertas.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => performRemove(direccion) },
      ],
    });
  }, [performRemove]);

  const handleRemoveSecretaria = useCallback((nombre) => {
    const secretaria = orgData?.secretarias.find((sec) => sec.nombre === nombre);
    if (!secretaria) return;
    if (orgData.secretarias.length === 1) {
      showDialog({ title: 'No se puede eliminar', message: 'El organigrama necesita al menos una secretaría.' });
      return;
    }
    if (secretaria.direcciones.length > 0) {
      showDialog({
        title: 'No se puede eliminar',
        message: `"${nombre}" tiene ${plural(secretaria.direcciones.length, 'dirección', 'direcciones')}. Muévelas a otra secretaría o elimínalas antes.`,
      });
      return;
    }
    showDialog({
      title: 'Eliminar secretaría',
      message: `"${nombre}" dejará de aparecer en el organigrama.\n\nSolo se elimina si ya no tiene usuarios ni tareas abiertas.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => performRemove(nombre) },
      ],
    });
  }, [orgData, performRemove]);

  // Cambios que solo tocan el organigrama: el orden de las secretarías y una secretaría nueva
  const saveStructureChange = useCallback(({ structure, changed }) => {
    if (!changed) return;
    setNotice(null);
    setOrgData(structure);
    persist(structure);
  }, [persist]);

  const handleMoveSecretaria = useCallback((nombre, toIndex) => {
    saveStructureChange(moveSecretariaInStructure(orgData, nombre, toIndex));
  }, [orgData, saveStructureChange]);

  const handleAddSecretaria = useCallback(() => {
    setPrompt({
      title: 'Nueva secretaría',
      onSubmit: (nombre) => saveStructureChange(addSecretariaToStructure(orgData, nombre)),
    });
  }, [orgData, saveStructureChange]);

  const handleRenameSecretaria = useCallback((nombre) => {
    setPrompt({
      title: 'Cambiar nombre de la secretaría',
      currentName: nombre,
      onSubmit: (nuevo) => performRename(nombre, nuevo),
    });
  }, [performRename]);

  const performMove = useCallback(async ({ direccion, fromSecretaria, toSecretaria, toIndex }) => {
    setSaving(true);
    setNotice(null);
    // El diagrama muestra el cambio de inmediato; si no se puede guardar, se revierte
    setOrgData((prev) => moveDireccionInStructure(prev, direccion, toSecretaria, toIndex).structure);
    try {
      const result = await moveDireccion(direccion, toSecretaria, toIndex);
      setOrgData(getOrgStructure());
      if (!result.changed || fromSecretaria === toSecretaria) return;
      if (result.pending) {
        setNotice({
          type: 'warning',
          text: `"${direccion}" ya aparece en ${toSecretaria}, pero falta aplicar el cambio a usuarios y tareas.`,
          retry: () => applyDireccionMove(direccion, fromSecretaria, toSecretaria),
        });
      } else {
        setNotice({
          type: 'success',
          text: `"${direccion}" ahora pertenece a ${toSecretaria}. ${plural(result.users, 'usuario actualizado', 'usuarios actualizados')} y ${plural(result.tasks, 'tarea actualizada', 'tareas actualizadas')}.`,
        });
      }
    } catch {
      setOrgData(getOrgStructure());
      Alert.alert('No se pudo mover', 'El organigrama no se guardó. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, []);

  // Cambiar el orden dentro de la misma secretaría no afecta permisos: se guarda sin preguntar.
  // Cambiar de secretaría sí cambia quién ve las tareas: se confirma antes.
  const handleMove = useCallback((move) => {
    if (move.fromSecretaria === move.toSecretaria) {
      performMove(move);
      return;
    }
    showDialog({
      title: 'Mover dirección',
      message: `"${move.direccion}" pasará de ${move.fromSecretaria} a ${move.toSecretaria}.\n\nEl secretario de ${move.toSecretaria} verá sus tareas abiertas y podrá delegarle; el de ${move.fromSecretaria} dejará de verlas.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Mover', onPress: () => performMove(move) },
      ],
    });
  }, [performMove]);

  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={[styles.loadingText, { color: subtextCol }]}>Cargando organigrama...</Text>
      </View>
    );
  }

  if (!orgData) return null;

  return (
    <View style={styles.root}>
      {/* Toggle de vista */}
      <View style={[styles.toggleRow, { borderBottomColor: isDark ? '#2E2E3E' : '#E5E7EB' }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'diagram' && styles.toggleBtnActive]}
          onPress={() => setViewMode('diagram')}
        >
          <Ionicons name="git-network" size={16} color={viewMode === 'diagram' ? '#fff' : theme.primary} />
          <Text style={[styles.toggleText, viewMode === 'diagram' && styles.toggleTextActive]}>
            Diagrama
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : theme.primary} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            Editar nombres
          </Text>
        </TouchableOpacity>

        {saving && (
          <View style={styles.savingPill}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.savingText}>Guardando</Text>
          </View>
        )}
      </View>

      {notice && (
        <View
          style={[
            styles.notice,
            {
              backgroundColor: notice.type === 'success' ? theme.successAlpha : theme.warningAlpha,
              borderColor: notice.type === 'success' ? theme.success : theme.warning,
            },
          ]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name={notice.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={notice.type === 'success' ? theme.success : theme.warningText}
          />
          <Text style={[styles.noticeText, { color: theme.text }]}>{notice.text}</Text>
          {notice.retry && (
            <TouchableOpacity
              onPress={() => applyPending(notice.retry)}
              style={[styles.noticeAction, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.noticeActionText}>Reintentar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setNotice(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
          >
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Contenido según modo */}
      <View style={styles.content}>
        {viewMode === 'list' ? (
          <ListView
            orgData={orgData}
            setOrgData={setOrgData}
            persist={persist}
            onRename={performRename}
            onRemove={handleRemoveDireccion}
            theme={theme}
            isDark={isDark}
          />
        ) : (
          <OrgDiagramBoard
            orgData={orgData}
            theme={theme}
            busy={saving}
            onMove={handleMove}
            onMoveSecretaria={handleMoveSecretaria}
            onRenameSecretaria={handleRenameSecretaria}
            onRemoveSecretaria={handleRemoveSecretaria}
            onAddSecretaria={handleAddSecretaria}
          />
        )}
      </View>

      {prompt && (
        <NamePrompt prompt={prompt} orgData={orgData} theme={theme} onClose={() => setPrompt(null)} />
      )}
    </View>
  );
}

// ─── Estilos comunes ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 13 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8B0000',
    gap: 5,
  },
  toggleBtnActive: { backgroundColor: '#8B0000', borderColor: '#8B0000' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#8B0000' },
  toggleTextActive: { color: '#fff' },
  savingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(139,0,0,0.8)', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 5, marginLeft: 'auto',
  },
  savingText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  noticeAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  noticeActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  promptOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  promptCard: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24 },
  promptTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  promptInput: { fontSize: 15, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  promptError: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  promptButtons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  promptButton: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  promptButtonText: { fontSize: 15, fontWeight: '600' },
});

// ─── Estilos Vista Lista ───────────────────────────────────────────────────────
const list = StyleSheet.create({
  adminNodeWrap: { alignItems: 'center', marginBottom: 0 },
  adminNode: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#8B0000', paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: 12, alignSelf: 'center',
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  adminRole: { color: '#FECACA', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  adminName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  vertConnector: { width: 2, height: 18, backgroundColor: '#8B0000', opacity: 0.4 },
  secWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7, paddingLeft: 12 },
  leftTrack: { width: 22, paddingTop: 18, alignItems: 'flex-end' },
  horzDash: { height: 2, width: 14, opacity: 0.4, borderRadius: 1 },
  secCard: {
    flex: 1, borderRadius: 10, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    }),
  },
  secHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 9 },
  secBadge: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#8B0000', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  secName: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  secMeta: { fontSize: 11, marginTop: 1 },
  dirsBox: { borderTopWidth: 1, paddingHorizontal: 11, paddingTop: 4, paddingBottom: 8 },
  dirRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  dirDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#8B0000', opacity: 0.5, marginRight: 7, flexShrink: 0 },
  dirName: { flex: 1, fontSize: 12, lineHeight: 16 },
  dirInput: { flex: 1, fontSize: 12, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: Platform.OS === 'web' ? 3 : 2, marginRight: 4 },
  iconBtn: { padding: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 7, gap: 4 },
  addBtnText: { fontSize: 12, color: '#8B0000', fontWeight: '500' },
});
