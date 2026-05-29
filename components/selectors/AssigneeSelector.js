/**
 * AssigneeSelector.js
 * Trigger compacto + modal de búsqueda para asignar usuarios
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, TextInput, SafeAreaView, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import Avatar from '../Avatar';

export default function AssigneeSelector({
  value = [],
  onChange = () => {},
  availableUsers = [],
  disabled = false,
}) {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible]   = useState(false);
  const [searchText, setSearchText]       = useState('');

  const selectedUsers   = useMemo(() => availableUsers.filter(u => value.includes(u.id)), [availableUsers, value]);
  const unselectedUsers = useMemo(() => availableUsers.filter(u => !value.includes(u.id)), [availableUsers, value]);

  const filteredUsers = useMemo(() => {
    const q = searchText.toLowerCase();
    return availableUsers.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [availableUsers, searchText]);

  const toggle = (userId) => {
    const next = value.includes(userId)
      ? value.filter(id => id !== userId)
      : [...value, userId];
    onChange(next);
  };

  const hasAssignees = value.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Etiqueta */}
      <View style={styles.labelRow}>
        <Ionicons name="people" size={13} color="#007AFF" />
        <Text style={[styles.label, { color: isDark ? 'rgba(235,235,245,0.50)' : 'rgba(60,60,67,0.50)' }]}>
          Asignados
        </Text>
        {hasAssignees && (
          <View style={[styles.badge, { backgroundColor: '#007AFF' }]}>
            <Text style={styles.badgeText}>{value.length}</Text>
          </View>
        )}
      </View>

      {/* Trigger */}
      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.75}
        style={[
          styles.trigger,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
            borderColor: hasAssignees ? '#007AFF60' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
          },
        ]}
      >
        {hasAssignees ? (
          // Avatares apilados
          <View style={styles.avatarStack}>
            {selectedUsers.slice(0, 4).map((u, i) => (
              <View key={u.id} style={[styles.avatarWrap, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}>
                <Avatar name={u.name} url={u.avatar} size={28} />
              </View>
            ))}
            {selectedUsers.length > 4 && (
              <View style={[styles.avatarMore, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarMoreText}>+{selectedUsers.length - 4}</Text>
              </View>
            )}
          </View>
        ) : (
          <Ionicons name="person-add-outline" size={18} color={isDark ? 'rgba(235,235,245,0.35)' : 'rgba(60,60,67,0.35)'} />
        )}
        <Text style={[
          styles.triggerText,
          { color: hasAssignees ? theme.text : (isDark ? 'rgba(235,235,245,0.40)' : 'rgba(60,60,67,0.40)') },
        ]}>
          {hasAssignees
            ? selectedUsers.map(u => u.name?.split(' ')[0]).join(', ')
            : 'Seleccionar personas…'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={isDark ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.30)'} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.50)' }]}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]}>
            {/* Handle */}
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
            </View>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Asignar personas</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                  {value.length > 0 ? `${value.length} seleccionado${value.length > 1 ? 's' : ''}` : 'Selecciona uno o más'}
                </Text>
              </View>
              {value.length > 0 && (
                <View style={[styles.statBadge, { backgroundColor: '#007AFF' }]}>
                  <Text style={styles.statText}>{value.length}</Text>
                </View>
              )}
            </View>

            {/* Buscador */}
            <View style={styles.searchWrap}>
              <View style={[styles.searchBox, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', borderColor: theme.border }]}>
                <Ionicons name="search" size={17} color={theme.textSecondary} />
                <TextInput
                  placeholder="Buscar persona…"
                  placeholderTextColor={theme.textSecondary}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={[styles.searchInput, { color: theme.text }]}
                  autoFocus
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={17} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Lista */}
            <FlatList
              data={filteredUsers}
              keyExtractor={u => u.id}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = value.includes(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.userRow,
                      {
                        backgroundColor: selected
                          ? (isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.07)')
                          : 'transparent',
                        borderColor: selected ? '#007AFF40' : 'transparent',
                      },
                    ]}
                  >
                    <Avatar name={item.name} url={item.avatar} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: selected ? '#007AFF' : theme.text }]}>{item.name}</Text>
                      <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
                    </View>
                    <View style={[
                      styles.radio,
                      selected
                        ? { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                        : { borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)' },
                    ]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="person-outline" size={40} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay personas disponibles</Text>
                </View>
              }
            />

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FAFAFA' }]}>
              <TouchableOpacity
                style={[styles.footerBtnSecondary, { borderColor: theme.border }]}
                onPress={() => onChange([])}
                disabled={value.length === 0}
              >
                <Text style={[styles.footerBtnSecondaryText, { color: value.length === 0 ? theme.textMuted : theme.text }]}>
                  Limpiar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtnPrimary, { backgroundColor: '#007AFF' }]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.footerBtnPrimaryText}>
                  {value.length > 0 ? `Confirmar (${value.length})` : 'Cerrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2, flex: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '500' },

  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF' },
  avatarMore: {
    width: 28, height: 28, borderRadius: 14, marginLeft: -10, zIndex: 1,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  avatarMoreText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { height: '88%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, borderBottomWidth: 1,
  },
  closeBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  modalSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  statBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 40, alignItems: 'center' },
  statText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  searchWrap: { paddingHorizontal: 20, paddingVertical: 14 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },

  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 4 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
  },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  footer: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 16,
    borderTopWidth: 1,
  },
  footerBtnSecondary: {
    flex: 0.8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  footerBtnSecondaryText: { fontSize: 15, fontWeight: '600' },
  footerBtnPrimary: {
    flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 8,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 10, elevation: 6,
  },
  footerBtnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
