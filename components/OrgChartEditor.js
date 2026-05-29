// components/OrgChartEditor.js
// Editor visual del organigrama municipal — modos: Lista editable + Diagrama jerárquico

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SECRETARIAS, getDireccionesBySecretaria } from '../config/areas';
import { useTheme } from '../contexts/ThemeContext';

const ORG_DOC_REF = () => doc(db, 'metadata', 'orgStructure');
const COL_WIDTH = 175;

function buildFromConfig() {
  return {
    secretarias: SECRETARIAS.map(nombre => ({
      nombre,
      direcciones: getDireccionesBySecretaria(nombre),
    })),
  };
}

// ─── Vista Diagrama ────────────────────────────────────────────────────────────
function DiagramView({ orgData, theme, isDark }) {
  const [expandedSec, setExpandedSec] = useState({});
  const borderColor = isDark ? '#2E2E3E' : '#E5E7EB';
  const cardBg = isDark ? '#1E1E2E' : '#FFFFFF';
  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Admin node */}
      <View style={diag.adminRow}>
        <View style={diag.adminBox}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
          <View style={{ marginLeft: 8 }}>
            <Text style={diag.adminRole}>ADMINISTRADOR</Text>
            <Text style={diag.adminSub}>Control total del sistema</Text>
          </View>
        </View>
      </View>

      {/* Línea vertical desde admin */}
      <View style={diag.centerConnector}>
        <View style={diag.vLineLong} />
      </View>

      {/* Barra horizontal entre secretarías */}
      <View style={diag.hBarWrap}>
        <View style={[diag.hBar, { backgroundColor: '#8B0000' }]} />
      </View>

      {/* ScrollView horizontal para las secretarías */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 16 }}>
        <View style={diag.colsRow}>
          {orgData.secretarias.map((sec, i) => {
            const isOpen = !!expandedSec[i];
            const dirCount = sec.direcciones?.length ?? 0;
            return (
              <View key={i} style={diag.column}>
                {/* Conector vertical desde barra horizontal */}
                <View style={diag.colTopConnector} />

                {/* Caja de secretaría */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedSec(e => ({ ...e, [i]: !e[i] }))}
                  style={[diag.secBox, { backgroundColor: '#8B0000' }]}
                >
                  <Ionicons name="business" size={13} color="#FECACA" />
                  <Text style={diag.secBoxName} numberOfLines={3}>{sec.nombre}</Text>
                  <View style={diag.secBoxBadge}>
                    <Text style={diag.secBoxBadgeText}>{dirCount}</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={12} color="#FECACA" style={{ marginTop: 4 }}
                  />
                </TouchableOpacity>

                {/* Direcciones (expandibles) */}
                {isOpen && (
                  <View style={diag.dirsCol}>
                    <View style={[diag.vLineShort, { backgroundColor: '#8B0000' }]} />
                    {(sec.direcciones || []).map((dir, j) => (
                      <View key={j}>
                        <View style={[diag.dirBox, { backgroundColor: cardBg, borderColor }]}>
                          <View style={diag.dirDot} />
                          <Text style={[diag.dirBoxName, { color: theme.text }]} numberOfLines={3}>
                            {dir}
                          </Text>
                        </View>
                        {j < sec.direcciones.length - 1 && (
                          <View style={[diag.vLineMini, { backgroundColor: borderColor }]} />
                        )}
                      </View>
                    ))}
                    {dirCount === 0 && (
                      <Text style={[diag.emptyDirs, { color: subtextCol }]}>Sin direcciones</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Text style={[diag.hint, { color: subtextCol }]}>
        Toca cada secretaría para ver sus direcciones
      </Text>
    </ScrollView>
  );
}

// ─── Vista Lista (editable) ────────────────────────────────────────────────────
function ListView({ orgData, setOrgData, persist, theme, isDark }) {
  const [expanded, setExpanded] = useState({});
  const [editingDir, setEditingDir] = useState(null);
  const [addingDir, setAddingDir] = useState(null);

  const cardBg = isDark ? '#1E1E2E' : '#FFFFFF';
  const borderCol = isDark ? '#2E2E3E' : '#E5E7EB';
  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  const confirmRename = async (secIdx, dirIdx) => {
    const name = editingDir?.value?.trim();
    if (!name) { setEditingDir(null); return; }
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones[dirIdx] = name;
    setOrgData(newData);
    setEditingDir(null);
    await persist(newData);
  };

  const confirmAdd = async (secIdx) => {
    const name = addingDir?.value?.trim();
    setAddingDir(null);
    if (!name) return;
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones.push(name);
    setOrgData(newData);
    await persist(newData);
  };

  const removeDir = async (secIdx, dirIdx) => {
    const newData = JSON.parse(JSON.stringify(orgData));
    newData.secretarias[secIdx].direcciones.splice(dirIdx, 1);
    setOrgData(newData);
    await persist(newData);
  };

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
              <View style={[list.horzDash, { backgroundColor: '#8B0000' }]} />
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
                  size={20} color="#8B0000"
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={[list.dirsBox, { borderTopColor: borderCol }]}>
                  {(sec.direcciones || []).map((dir, dirIdx) => (
                    <View key={dirIdx} style={[list.dirRow, { borderBottomColor: borderCol }]}>
                      <View style={list.dirDot} />
                      {editingDir?.secIdx === secIdx && editingDir?.dirIdx === dirIdx ? (
                        <TextInput
                          style={[list.dirInput, { color: theme.text, borderColor: '#8B0000', backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
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
                      >
                        <Ionicons name="pencil-outline" size={15} color="#8B0000" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeDir(secIdx, dirIdx)}
                        style={[list.iconBtn, { marginLeft: 2 }]}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <Ionicons name="close-circle-outline" size={15} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {addingDir?.secIdx === secIdx ? (
                    <View style={[list.dirRow, { borderBottomColor: 'transparent' }]}>
                      <View style={[list.dirDot, { backgroundColor: '#8B0000' }]} />
                      <TextInput
                        style={[list.dirInput, { flex: 1, color: theme.text, borderColor: '#8B0000', backgroundColor: isDark ? '#2A2A3A' : '#FFF5F5' }]}
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
                      <Ionicons name="add-circle-outline" size={16} color="#8B0000" />
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

// ─── Componente principal ──────────────────────────────────────────────────────
export default function OrgChartEditor() {
  const { theme, isDark } = useTheme();
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'diagram'

  useEffect(() => {
    const unsub = onSnapshot(
      ORG_DOC_REF(),
      (snap) => {
        if (snap.exists()) {
          setOrgData(snap.data());
        } else {
          const initial = buildFromConfig();
          setOrgData(initial);
          setDoc(ORG_DOC_REF(), initial).catch(() => {});
        }
        setLoading(false);
      },
      () => {
        setOrgData(buildFromConfig());
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const persist = useCallback(async (newData) => {
    setSaving(true);
    try {
      await setDoc(ORG_DOC_REF(), newData);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  }, []);

  const subtextCol = isDark ? '#9CA3AF' : '#6B7280';

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color="#8B0000" size="large" />
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
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : '#8B0000'} />
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'diagram' && styles.toggleBtnActive]}
          onPress={() => setViewMode('diagram')}
        >
          <Ionicons name="git-network" size={16} color={viewMode === 'diagram' ? '#fff' : '#8B0000'} />
          <Text style={[styles.toggleText, viewMode === 'diagram' && styles.toggleTextActive]}>
            Diagrama
          </Text>
        </TouchableOpacity>

        {saving && (
          <View style={styles.savingPill}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.savingText}>Guardando</Text>
          </View>
        )}
      </View>

      {/* Contenido según modo */}
      <View style={styles.content}>
        {viewMode === 'list' ? (
          <ListView
            orgData={orgData}
            setOrgData={setOrgData}
            persist={persist}
            theme={theme}
            isDark={isDark}
          />
        ) : (
          <DiagramView orgData={orgData} theme={theme} isDark={isDark} />
        )}
      </View>
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
  savingText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
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
  adminRole: { color: '#FECACA', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
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
  secMeta: { fontSize: 10, marginTop: 1 },
  dirsBox: { borderTopWidth: 1, paddingHorizontal: 11, paddingTop: 4, paddingBottom: 8 },
  dirRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  dirDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#8B0000', opacity: 0.5, marginRight: 7, flexShrink: 0 },
  dirName: { flex: 1, fontSize: 12, lineHeight: 16 },
  dirInput: { flex: 1, fontSize: 12, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: Platform.OS === 'web' ? 3 : 2, marginRight: 4 },
  iconBtn: { padding: 3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingTop: 7, gap: 4 },
  addBtnText: { fontSize: 12, color: '#8B0000', fontWeight: '500' },
});

// ─── Estilos Vista Diagrama ────────────────────────────────────────────────────
const diag = StyleSheet.create({
  adminRow: { alignItems: 'center', paddingVertical: 8 },
  adminBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#8B0000', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, alignSelf: 'center',
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  adminRole: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  adminSub: { color: '#FECACA', fontSize: 10 },
  centerConnector: { alignItems: 'center' },
  vLineLong: { width: 2, height: 16, backgroundColor: '#8B0000', opacity: 0.5 },
  hBarWrap: { paddingHorizontal: 16 },
  hBar: { height: 2, borderRadius: 1, opacity: 0.4 },
  colsRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 0, gap: 8 },
  column: { width: COL_WIDTH, alignItems: 'center' },
  colTopConnector: { width: 2, height: 14, backgroundColor: '#8B0000', opacity: 0.4 },
  secBox: {
    width: COL_WIDTH, borderRadius: 8, padding: 10, alignItems: 'center',
    shadowColor: '#8B0000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  secBoxName: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 4, lineHeight: 14 },
  secBoxBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, marginTop: 5,
  },
  secBoxBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  dirsCol: { width: COL_WIDTH, alignItems: 'center' },
  vLineShort: { width: 2, height: 10, opacity: 0.4 },
  vLineMini: { width: 2, height: 4, alignSelf: 'center', opacity: 0.3 },
  dirBox: {
    width: COL_WIDTH - 8, borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  dirDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#8B0000', opacity: 0.6, marginRight: 5, marginTop: 4, flexShrink: 0 },
  dirBoxName: { flex: 1, fontSize: 10, lineHeight: 14 },
  emptyDirs: { fontSize: 10, fontStyle: 'italic', marginTop: 8 },
  hint: { textAlign: 'center', fontSize: 10, marginTop: 8, marginBottom: 4 },
});
