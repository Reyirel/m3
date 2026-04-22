// components/OrgChart.js
// Organigrama interactivo estilo ER — Admin → Secretarios → Directores
// Todos los niveles son colapsables

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { getDireccionesBySecretaria, resolveAreaName, SECRETARIAS, DIRECCIONES } from '../config/areas';

const ALL_AREAS = [...SECRETARIAS, ...DIRECCIONES];

// ─── Dimensiones ──────────────────────────────────────────────────────────────
const NW  = 168;  // node width
const NH  = 78;   // node height
const HG  = 16;   // gap horizontal entre hermanos
const VG  = 52;   // gap vertical entre niveles
const PAD = 24;   // padding del canvas

// ─── Paleta de roles ──────────────────────────────────────────────────────────
const ROLE = {
  admin:      { colors: ['#DC2626','#991B1B'], border: '#DC2626', icon: 'shield-checkmark', label: 'Admin'      },
  secretario: { colors: ['#9F2241','#7D1A33'], border: '#9F2241', icon: 'briefcase',        label: 'Secretario' },
  director:   { colors: ['#0EA5E9','#0284C7'], border: '#0EA5E9', icon: 'business',         label: 'Director'   },
  virtual:    { colors: ['#6B7280','#4B5563'], border: '#6B7280', icon: 'people',            label: 'Sin área'   },
};

// ─── Tarjeta de nodo ──────────────────────────────────────────────────────────
function NodeCard({ user, x, y, isVirtual, selected, onPress, theme, isDark }) {
  const key  = isVirtual ? 'virtual' : (ROLE[user.role] ? user.role : 'director');
  const cfg  = ROLE[key];
  const init = (user.displayName || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

  return (
    <TouchableOpacity
      onPress={() => onPress(user.id)}
      activeOpacity={0.75}
      style={[styles.node, {
        position: 'absolute', left: x, top: y, width: NW, height: NH,
        backgroundColor: isDark ? '#1C1C23' : '#FFFFFF',
        borderColor: selected ? theme.warning : cfg.border,
        borderWidth: selected ? 2.5 : 1.5,
        shadowColor: cfg.border,
      }]}
    >
      <LinearGradient colors={cfg.colors} style={styles.avatar}>
        <Text style={styles.initials}>{init}</Text>
      </LinearGradient>
      <View style={styles.nodeBody}>
        <Text style={[styles.nodeName, { color: theme.text }]} numberOfLines={2}>
          {user.displayName || 'Sin nombre'}
        </Text>
        {(user.position || user.area) ? (
          <Text style={[styles.nodeArea, { color: cfg.border }]} numberOfLines={1}>
            {user.position || user.area}
          </Text>
        ) : null}
        <View style={[styles.rolePill, { backgroundColor: cfg.border + '18', borderColor: cfg.border + '40' }]}>
          <Ionicons name={cfg.icon} size={8} color={cfg.border} />
          <Text style={[styles.roleText, { color: cfg.border }]}>{cfg.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Botón colapsar / expandir ────────────────────────────────────────────────
function CollapseBtn({ cx, y, collapsed, count, color, onPress, isDark }) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.collapseBtn, {
          left: cx - 11, top: y - 11,
          backgroundColor: isDark ? '#2A2A35' : '#F0F0F8',
          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
        }]}
      >
        <Ionicons name={collapsed ? 'add' : 'remove'} size={13} color={isDark ? '#FFF' : '#333'} />
      </TouchableOpacity>
      {collapsed && count > 0 && (
        <View style={[styles.badge, { left: cx + 2, top: y - 18, backgroundColor: color }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OrgChart({ users, areas = [], fullScreen = false }) {
  const { theme, isDark } = useTheme();
  const [selectedId,     setSelectedId]     = useState(null);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [collapsed,      setCollapsed]      = useState(new Set());
  const [editingArea,    setEditingArea]    = useState(false);
  const [areaSearch,     setAreaSearch]     = useState('');
  const [savingArea,     setSavingArea]     = useState(false);

  // ── Agrupar ────────────────────────────────────────────────────────────────
  const admins      = useMemo(() => users.filter(u => u.role === 'admin'),      [users]);
  const secretarios = useMemo(() => users.filter(u => u.role === 'secretario'), [users]);
  const directors   = useMemo(() => users.filter(u => u.role === 'director'),   [users]);

  // Colapsar todos los secretarios al inicio
  useEffect(() => {
    setCollapsed(new Set(secretarios.map(s => s.id).concat(['__unassigned__'])));
  }, [secretarios]);

  // ── Árbol: secretario → directores ────────────────────────────────────────
  const tree = useMemo(() => {
    const assigned = new Set();
    const hasAreas = areas && areas.length > 0;

    const getDirs = (sec) => {
      // ── Estrategia 1: colección areas con parentId/jefeId ───────────────
      if (hasAreas) {
        const secArea =
          areas.find(x => x.tipo === 'secretaria' && x.jefeId === sec.id) ||
          areas.find(x => x.tipo === 'secretaria' && (x.nombre === (sec.area || sec.department)));

        if (secArea) {
          const dirs = areas
            .filter(x => x.tipo === 'direccion' && x.parentId === secArea.id && x.activa !== false)
            .map(dirArea =>
              directors.find(d => d.id === dirArea.jefeId) ||
              directors.find(d => (d.area || d.department) === dirArea.nombre)
            )
            .filter(Boolean);
          if (dirs.length > 0) return dirs;
        }
      }

      // ── Estrategia 2: config/areas.js (fuente de verdad) ────────────────
      const secAreaName = resolveAreaName(sec.area || sec.department || '');
      const oficiales   = getDireccionesBySecretaria(secAreaName);
      const firebase    = sec.direcciones || [];
      const direcciones = [...new Set([...oficiales, ...firebase])].filter(Boolean);

      if (direcciones.length > 0) {
        return directors.filter(d => {
          const da = resolveAreaName(d.area || d.department || '');
          // Coincidencia exacta con nombre de dirección
          if (direcciones.includes(da) || direcciones.includes(d.area) || direcciones.includes(d.department)) return true;
          // Fallback: el director tiene como área el nombre de la secretaría padre
          // (datos aún sin actualizar en Firebase)
          const dArea = (d.area || d.department || '').toLowerCase().trim();
          const sArea = secAreaName.toLowerCase().trim();
          if (sArea && dArea === sArea) return true;
          return false;
        });
      }

      // ── Estrategia 3: el director tiene exactamente el nombre de la secretaría ─
      if (secAreaName) {
        const sArea = secAreaName.toLowerCase().trim();
        return directors.filter(d => {
          const dArea = (d.area || d.department || '').toLowerCase().trim();
          return dArea === sArea;
        });
      }

      return [];
    };

    const result = secretarios.map(sec => {
      const dirs = getDirs(sec);
      dirs.forEach(d => assigned.add(d.id));
      return { sec, dirs };
    });

    const unassigned = directors.filter(d => !assigned.has(d.id));
    if (unassigned.length > 0) {
      result.push({
        sec: { id: '__unassigned__', displayName: 'Sin Secretaría', role: 'secretario', _virtual: true },
        dirs: unassigned,
      });
    }
    return result;
  }, [secretarios, directors, areas]);

  // ── Layout ─────────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    // Si hay múltiples admins, van en fila centrada
    const adminCount = Math.max(1, admins.length);
    const adminsRowW = adminCount * NW + (adminCount - 1) * HG;

    // ── ADMIN COLAPSADO: solo fila de admins ──
    if (adminCollapsed) {
      const chartW = adminsRowW + PAD * 2;
      const chartH = NH + PAD * 2;
      const adminLayouts = admins.map((a, i) => ({
        user: a,
        x: PAD + i * (NW + HG),
        y: PAD,
        cx: PAD + i * (NW + HG) + NW / 2,
      }));
      const adminGroupCX = PAD + adminsRowW / 2;
      return { adminLayouts, adminGroupCX, adminBY: PAD + NH, secLayouts: [], chartW, chartH };
    }

    // ── ADMIN EXPANDIDO: calcular nivel de secretarios ──
    const cols = tree.map(({ sec, dirs }) => {
      const isCol = collapsed.has(sec.id);
      const vis   = isCol ? 0 : dirs.length;
      return { colW: Math.max(1, vis) * (NW + HG) - HG };
    });
    const secsW = cols.reduce((s, c, i) => s + c.colW + (i > 0 ? HG : 0), 0);
    const totalW = Math.max(adminsRowW, secsW);

    // Centrar admins sobre el total
    const adminOffsetX = PAD + (totalW - adminsRowW) / 2;
    const adminLayouts = admins.map((a, i) => ({
      user: a,
      x: adminOffsetX + i * (NW + HG),
      y: PAD,
      cx: adminOffsetX + i * (NW + HG) + NW / 2,
    }));
    const adminGroupCX = adminOffsetX + adminsRowW / 2;
    const adminBY = PAD + NH;
    const secY    = PAD + NH + VG;
    const secBY   = secY + NH;
    const dirY    = secY + NH + VG;

    // Centrar secretarios sobre el total
    const secOffsetX = PAD + (totalW - secsW) / 2;
    let curX = secOffsetX;
    const secLayouts = tree.map(({ sec, dirs }, i) => {
      const { colW } = cols[i];
      const secCX = curX + colW / 2;
      const isCol = collapsed.has(sec.id);
      const dirLayouts = isCol ? [] : dirs.map((dir, j) => ({
        user: dir,
        x: curX + j * (NW + HG),
        y: dirY,
        cx: curX + j * (NW + HG) + NW / 2,
      }));
      const entry = { sec, x: secCX - NW / 2, y: secY, cx: secCX, isCol, dirs, dirLayouts };
      curX += colW + HG;
      return entry;
    });

    const maxDirs  = Math.max(0, ...tree.map(t => collapsed.has(t.sec.id) ? 0 : t.dirs.length));
    const chartH   = PAD + NH + VG + NH + (maxDirs > 0 ? VG + NH : 0) + PAD + 32;
    const chartW   = totalW + PAD * 2;

    return { adminLayouts, adminGroupCX, adminBY, secLayouts, secY, secBY, dirY, chartW, chartH };
  }, [admins, tree, collapsed, adminCollapsed]);

  // ── Líneas SVG ─────────────────────────────────────────────────────────────
  const lines = useMemo(() => {
    const { adminGroupCX, adminBY, secLayouts, secY, secBY, dirY } = layout;
    if (!secLayouts || secLayouts.length === 0) return [];
    const result = [];
    const push = (key, x1, y1, x2, y2) => result.push({ key, x1, y1, x2, y2 });

    const midY = adminBY + (secY - adminBY) / 2;
    push('a-down', adminGroupCX, adminBY, adminGroupCX, midY);

    if (secLayouts.length === 1) {
      push('a-sec', adminGroupCX, midY, secLayouts[0].cx, midY);
      push('sec-0-in', secLayouts[0].cx, midY, secLayouts[0].cx, secY);
    } else {
      const lx = Math.min(...secLayouts.map(s => s.cx));
      const rx = Math.max(...secLayouts.map(s => s.cx));
      push('h-bar', lx, midY, rx, midY);
      secLayouts.forEach((s, i) => push(`sec-${i}-drop`, s.cx, midY, s.cx, secY));
    }

    secLayouts.forEach((s, i) => {
      if (s.isCol || s.dirLayouts.length === 0) return;
      const dmid = secBY + (dirY - secBY) / 2;
      if (s.dirLayouts.length === 1) {
        push(`d${i}-s`, s.cx, secBY, s.dirLayouts[0].cx, dirY);
      } else {
        const lx = Math.min(...s.dirLayouts.map(d => d.cx));
        const rx = Math.max(...s.dirLayouts.map(d => d.cx));
        push(`d${i}-v`,  s.cx, secBY, s.cx, dmid);
        push(`d${i}-h`,  lx,   dmid,  rx,   dmid);
        s.dirLayouts.forEach((d, j) => push(`d${i}-${j}`, d.cx, dmid, d.cx, dirY));
      }
    });

    return result;
  }, [layout]);

  // ── Usuario seleccionado ───────────────────────────────────────────────────
  const selectedUser = useMemo(
    () => selectedId ? users.find(u => u.id === selectedId) || null : null,
    [selectedId, users]
  );

  const LC = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)';
  const DC = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.26)';

  return (
    <View>
      {/* Leyenda */}
      <View style={styles.legend}>
        {['admin','secretario','director'].map(k => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ROLE[k].border }]} />
            <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>{ROLE[k].label}</Text>
          </View>
        ))}
        <Text style={[styles.legendHint, { color: theme.textSecondary }]}>· Toca un nodo para detalles</Text>
      </View>

      {/* Canvas */}
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.canvas}>
        <ScrollView
          showsVerticalScrollIndicator
          style={fullScreen ? undefined : { maxHeight: 500 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ width: layout.chartW, height: layout.chartH }}>
            {/* Líneas */}
            <Svg style={StyleSheet.absoluteFill} width={layout.chartW} height={layout.chartH}>
              {lines.map(l => (
                <Line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={LC} strokeWidth={2} strokeLinecap="round" />
              ))}
              {lines.filter(l => l.key.endsWith('-drop') || l.key.endsWith('-in') || l.key.endsWith('-s')).map(l => (
                <Circle key={`dot-${l.key}`} cx={l.x1} cy={l.y1} r={3} fill={DC} />
              ))}
            </Svg>

            {/* Nodos Admin */}
            {layout.adminLayouts.map((a, _i) => (
              <NodeCard key={a.user.id} user={a.user} x={a.x} y={a.y}
                selected={selectedId === a.user.id} onPress={setSelectedId}
                theme={theme} isDark={isDark} />
            ))}

            {/* Botón colapsar nivel de secretarios (bajo el admin) */}
            <CollapseBtn
              cx={layout.adminGroupCX}
              y={layout.adminBY}
              collapsed={adminCollapsed}
              count={secretarios.length}
              color={ROLE.secretario.border}
              onPress={() => setAdminCollapsed(v => !v)}
              isDark={isDark}
            />

            {/* Nodos Secretarios + Directores */}
            {layout.secLayouts.map((s, _i) => (
              <React.Fragment key={s.sec.id}>
                <NodeCard user={s.sec} x={s.x} y={s.y} isVirtual={s.sec._virtual}
                  selected={selectedId === s.sec.id} onPress={setSelectedId}
                  theme={theme} isDark={isDark} />

                {/* Botón colapsar directores del secretario */}
                {s.dirs.length > 0 && (
                  <CollapseBtn
                    cx={s.cx}
                    y={s.y + NH}
                    collapsed={s.isCol}
                    count={s.dirs.length}
                    color={ROLE.director.border}
                    onPress={() => setCollapsed(prev => {
                      const next = new Set(prev);
                      next.has(s.sec.id) ? next.delete(s.sec.id) : next.add(s.sec.id);
                      return next;
                    })}
                    isDark={isDark}
                  />
                )}

                {/* Directores */}
                {s.dirLayouts.map(d => (
                  <NodeCard key={d.user.id} user={d.user} x={d.x} y={d.y}
                    selected={selectedId === d.user.id} onPress={setSelectedId}
                    theme={theme} isDark={isDark} />
                ))}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Panel detalle */}
      {selectedUser && (
        <View style={[styles.detail, {
          backgroundColor: isDark ? 'rgba(28,28,35,0.98)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }]}>
          {/* Cabecera */}
          <View style={styles.detailHead}>
            <LinearGradient
              colors={ROLE[selectedUser.role]?.colors || ROLE.director.colors}
              style={styles.detailAvatar}
            >
              <Text style={styles.detailInit}>
                {(selectedUser.displayName || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailName, { color: theme.text }]}>{selectedUser.displayName}</Text>
              <Text style={[styles.detailRole, { color: ROLE[selectedUser.role]?.border || '#888' }]}>
                {ROLE[selectedUser.role]?.label || selectedUser.role}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedId(null); setEditingArea(false); setAreaSearch(''); }}>
              <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Filas de info */}
          <View style={styles.detailRows}>
            {selectedUser.email && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailVal, { color: theme.text }]}>{selectedUser.email}</Text>
              </View>
            )}

            {/* Área — editable */}
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.detailVal, { color: theme.text }]}>
                {selectedUser.area || selectedUser.department || 'Sin área'}
              </Text>
              <TouchableOpacity
                onPress={() => { setEditingArea(v => !v); setAreaSearch(''); }}
                style={[styles.editBtn, { backgroundColor: ROLE[selectedUser.role]?.border + '22' }]}
              >
                <Ionicons name={editingArea ? 'chevron-up' : 'pencil'} size={11} color={ROLE[selectedUser.role]?.border || '#888'} />
                <Text style={[styles.editBtnText, { color: ROLE[selectedUser.role]?.border || '#888' }]}>
                  {editingArea ? 'Cerrar' : 'Editar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de área inline */}
            {editingArea && (
              <View style={[styles.areaPicker, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#16161E' : '#F8F8FC' }]}>
                <TextInput
                  value={areaSearch}
                  onChangeText={setAreaSearch}
                  placeholder="Buscar área..."
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.areaSearch, { color: theme.text, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                />
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator>
                  {ALL_AREAS
                    .filter(a => !areaSearch || a.toLowerCase().includes(areaSearch.toLowerCase()))
                    .map(area => {
                      const isSec = SECRETARIAS.includes(area);
                      const isCurrent = area === (selectedUser.area || selectedUser.department);
                      return (
                        <TouchableOpacity
                          key={area}
                          disabled={savingArea}
                          onPress={async () => {
                            setSavingArea(true);
                            try {
                              await updateDoc(doc(db, 'users', selectedUser.id), { area: area, department: area });
                            } catch (e) { /* silent */ }
                            setSavingArea(false);
                            setEditingArea(false);
                            setAreaSearch('');
                          }}
                          style={[styles.areaOption, isCurrent && { backgroundColor: (ROLE[selectedUser.role]?.border || '#888') + '22' }]}
                        >
                          <Ionicons
                            name={isSec ? 'briefcase-outline' : 'folder-outline'}
                            size={12}
                            color={isSec ? '#9F2241' : '#0EA5E9'}
                          />
                          <Text style={[styles.areaOptionText, { color: theme.text }, isCurrent && { fontWeight: '700' }]} numberOfLines={2}>
                            {area}
                          </Text>
                          {isCurrent && <Ionicons name="checkmark" size={13} color={ROLE[selectedUser.role]?.border || '#888'} />}
                        </TouchableOpacity>
                      );
                    })
                  }
                </ScrollView>
                {savingArea && (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" color={ROLE[selectedUser.role]?.border || '#888'} />
                    <Text style={[styles.savingText, { color: theme.textSecondary }]}>Guardando...</Text>
                  </View>
                )}
              </View>
            )}

            {selectedUser.position && (
              <View style={styles.detailRow}>
                <Ionicons name="briefcase-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailVal, { color: theme.text }]}>{selectedUser.position}</Text>
              </View>
            )}
            {selectedUser.direcciones?.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="git-branch-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {selectedUser.direcciones.length} direcciones a cargo
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons
                name={selectedUser.active !== false ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={14}
                color={selectedUser.active !== false ? theme.success : theme.error}
              />
              <Text style={[styles.detailVal, { color: selectedUser.active !== false ? theme.success : theme.error }]}>
                {selectedUser.active !== false ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Leyenda
  legend:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
  legendHint:  { fontSize: 10, fontStyle: 'italic' },

  canvas: { borderRadius: 12, overflow: 'hidden' },

  // Nodo
  node: {
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    padding: 10, gap: 8,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 6, elevation: 4,
  },
  avatar:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initials: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  nodeBody: { flex: 1, gap: 2 },
  nodeName: { fontSize: 11, fontWeight: '700', lineHeight: 14 },
  nodeArea: { fontSize: 9,  fontWeight: '500', lineHeight: 12 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, borderWidth: 0.5, alignSelf: 'flex-start', marginTop: 2,
  },
  roleText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Colapsar
  collapseBtn: {
    position: 'absolute', zIndex: 10,
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  badge:     { position: 'absolute', zIndex: 11, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Panel detalle
  detail:     { marginTop: 14, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailAvatar:{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  detailInit: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  detailName: { fontSize: 15, fontWeight: '700' },
  detailRole: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  detailRows: { gap: 7 },
  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailVal:  { fontSize: 12, flex: 1 },
  // Edición de área
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  editBtnText:  { fontSize: 10, fontWeight: '700' },
  areaPicker:   { borderRadius: 10, borderWidth: 1, padding: 8, gap: 6, marginTop: 2 },
  areaSearch:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, marginBottom: 4 },
  areaOption:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 6 },
  areaOptionText: { fontSize: 12, flex: 1 },
  savingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  savingText:   { fontSize: 12 },
});
