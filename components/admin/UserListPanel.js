// components/admin/UserListPanel.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { hashPassword } from '../../utils/hashUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';

const ROLE_LABELS = {
  director: 'Director',
  secretario: 'Secretario',
  admin: 'Admin',
  otros: 'Otros',
};
export default function UserListPanel({ allUsers, currentUser, onUsersChanged }) {
  const { isDark, theme } = useTheme();

  const ROLE_COLORS = {
    director: theme.info,
    secretario: theme.secondary,
    admin: theme.error,
    otros: theme.warning,
  };
  const { showSuccess, showError, showWarning } = useNotification();

  const [showUserList, setShowUserList] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [showTempPass, setShowTempPass] = useState(false);

  const changeUserRole = useCallback(async (userId, newRole, userName) => {
    if (userId === currentUser?.userId) {
      showWarning('No puedes cambiar tu propio rol');
      return;
    }
    try {
      hapticLight();
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showSuccess(`${userName} ahora es ${ROLE_LABELS[newRole]}`);
      setEditingRoleUserId(null);
      if (onUsersChanged) onUsersChanged();
    } catch (error) {
      showError('No se pudo cambiar el rol: ' + error.message);
    }
  }, [currentUser, showWarning, showSuccess, showError, onUsersChanged]);

  const deleteUserAccount = (userId, userName) => {
    if (userId === currentUser?.userId) {
      showWarning('No puedes eliminar tu propia cuenta');
      return;
    }
    setDeleteConfirmUser({ id: userId, displayName: userName });
  };

  const confirmDeleteUser = useCallback(async () => {
    if (!deleteConfirmUser) return;
    try {
      hapticMedium();
      await deleteDoc(doc(db, 'users', deleteConfirmUser.id));
      showSuccess(`Cuenta de ${deleteConfirmUser.displayName} eliminada`);
      setDeleteConfirmUser(null);
      if (onUsersChanged) onUsersChanged();
    } catch (error) {
      showError('No se pudo eliminar: ' + error.message);
      setDeleteConfirmUser(null);
    }
  }, [deleteConfirmUser, showSuccess, showError, onUsersChanged]);

  const saveUserPassword = useCallback(async () => {
    if (!passwordUser || !newTempPassword.trim()) return;
    try {
      const hashed = await hashPassword(newTempPassword.trim(), passwordUser.email.toLowerCase());
      await updateDoc(doc(db, 'users', passwordUser.id), {
        password: hashed,
        tempPassword: newTempPassword.trim(),
      });
      showSuccess('Contraseña actualizada');
      setShowTempPass(true);
      if (onUsersChanged) onUsersChanged();
    } catch (error) {
      showError('Error al guardar: ' + error.message);
    }
  }, [passwordUser, newTempPassword, showSuccess, showError, onUsersChanged]);

  return (
    <View>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark
              ? 'rgba(30, 30, 35, 0.95)'
              : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <LinearGradient
            colors={[theme.info, theme.info]}
            style={styles.iconCircleSection}
          >
            <Ionicons name="people" size={24} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Usuarios ({allUsers.length})
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.expandButton,
            { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' },
          ]}
          onPress={() => {
            hapticLight();
            setShowUserList(!showUserList);
          }}
        >
          <Ionicons
            name={showUserList ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.expandButtonText, { color: theme.primary }]}>
            {showUserList ? 'Ocultar Lista' : 'Ver Todos los Usuarios'}
          </Text>
        </TouchableOpacity>

        {showUserList && (
          <View style={styles.userListContainer}>
            {/* Buscador */}
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)',
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar por nombre, correo o área..."
                placeholderTextColor={theme.textSecondary}
                value={userSearch}
                onChangeText={setUserSearch}
              />
              {userSearch.length > 0 && (
                <TouchableOpacity onPress={() => setUserSearch('')}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Agrupar usuarios por categoría */}
            {[
              {
                role: 'secretario',
                label: '💼 Secretarios',
                color: '#8B5CF6',
                lightBg: 'rgba(139, 92, 246, 0.08)',
                icon: 'briefcase',
              },
              {
                role: 'director',
                label: '🏢 Directores',
                color: theme.info,
                lightBg: theme.infoAlpha,
                icon: 'business',
              },
              {
                role: 'otros',
                label: '👥 Otros Funcionarios',
                color: theme.warning,
                lightBg: theme.warningAlpha,
                icon: 'people',
              },
              {
                role: 'admin',
                label: '🛡️ Administradores',
                color: theme.error,
                lightBg: theme.errorAlpha,
                icon: 'shield-checkmark',
              },
            ].map((section) => {
              let sectionUsers;
              if (section.role === 'otros') {
                sectionUsers = allUsers.filter(
                  (u) => !['secretario', 'director', 'admin'].includes(u.role)
                );
              } else {
                sectionUsers = allUsers.filter((u) => u.role === section.role);
              }
              if (userSearch.trim()) {
                const q = userSearch.toLowerCase();
                sectionUsers = sectionUsers.filter(
                  (u) =>
                    (u.displayName || '').toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.area || '').toLowerCase().includes(q) ||
                    (u.position || '').toLowerCase().includes(q)
                );
              }
              if (sectionUsers.length === 0) return null;

              return (
                <View key={section.role} style={{ marginBottom: 16 }}>
                  {/* Header de sección */}
                  <View
                    style={[
                      styles.roleSectionHeader,
                      {
                        backgroundColor: section.lightBg,
                        borderLeftColor: section.color,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sectionIconWrapper,
                        { backgroundColor: section.color },
                      ]}
                    >
                      <Ionicons name={section.icon} size={16} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[styles.roleSectionTitle, { color: theme.text }]}
                    >
                      {section.label}
                    </Text>
                    <View
                      style={[
                        styles.roleSectionBadge,
                        { backgroundColor: section.color },
                      ]}
                    >
                      <Text style={styles.roleSectionCount}>
                        {sectionUsers.length}
                      </Text>
                    </View>
                  </View>

                  {/* Lista de usuarios de esta sección */}
                  {sectionUsers.map((user) => (
                    <View
                      key={user.id}
                      style={[
                        styles.userCard,
                        {
                          backgroundColor: isDark
                            ? 'rgba(30, 30, 35, 0.95)'
                            : '#FFFFFF',
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        },
                      ]}
                    >
                      <View style={styles.userInfo}>
                        <View style={styles.userHeader}>
                          <View
                            style={[
                              styles.userAvatar,
                              {
                                backgroundColor: `${section.color}15`,
                                borderColor: section.color,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.avatarInitial,
                                { color: section.color },
                              ]}
                            >
                              {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={styles.userTextContainer}>
                            <Text
                              style={[styles.userName, { color: theme.text }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {user.displayName}
                            </Text>

                            {(user.position || user.area) && (
                              <View
                                style={[
                                  styles.positionBadge,
                                  {
                                    backgroundColor: `${section.color}12`,
                                    borderColor: `${section.color}30`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="briefcase"
                                  size={11}
                                  color={section.color}
                                />
                                <Text
                                  style={[
                                    styles.positionText,
                                    { color: section.color },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {user.position || user.area}
                                </Text>
                              </View>
                            )}

                            {user.position &&
                              user.area &&
                              user.position !== user.area && (
                                <View style={styles.areaTextRow}>
                                  <Ionicons
                                    name="business-outline"
                                    size={10}
                                    color={theme.textSecondary}
                                  />
                                  <Text
                                    style={[
                                      styles.areaText,
                                      { color: theme.textSecondary },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {user.area}
                                  </Text>
                                </View>
                              )}

                            <View style={styles.emailRow}>
                              <Ionicons
                                name="mail-outline"
                                size={10}
                                color={theme.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.userEmail,
                                  { color: theme.textSecondary },
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {user.email}
                              </Text>
                            </View>

                            {user.phone && (
                              <View style={styles.phoneRow}>
                                <Ionicons
                                  name="call-outline"
                                  size={10}
                                  color={theme.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.phoneText,
                                    { color: theme.textSecondary },
                                  ]}
                                >
                                  {user.phone}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.userActions}>
                        {/* Rol: chip o selector inline */}
                        {editingRoleUserId === user.id ? (
                          <View style={styles.roleEditContainer}>
                            {['director', 'secretario', 'admin'].map((role) => (
                              <TouchableOpacity
                                key={role}
                                style={[
                                  styles.roleOptionChip,
                                  { borderColor: ROLE_COLORS[role] },
                                  user.role === role && {
                                    backgroundColor: ROLE_COLORS[role],
                                  },
                                ]}
                                onPress={() =>
                                  changeUserRole(user.id, role, user.displayName)
                                }
                              >
                                <Text
                                  style={[
                                    styles.roleOptionText,
                                    {
                                      color:
                                        user.role === role
                                          ? '#fff'
                                          : ROLE_COLORS[role],
                                    },
                                  ]}
                                >
                                  {ROLE_LABELS[role]}
                                </Text>
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                              style={styles.roleEditClose}
                              onPress={() => setEditingRoleUserId(null)}
                            >
                              <Ionicons
                                name="close"
                                size={16}
                                color={theme.textSecondary}
                              />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.roleChip,
                              {
                                backgroundColor: `${
                                  ROLE_COLORS[user.role] || '#6B7280'
                                }18`,
                                borderColor:
                                  ROLE_COLORS[user.role] || '#6B7280',
                              },
                            ]}
                            onPress={() => {
                              hapticLight();
                              setEditingRoleUserId(user.id);
                            }}
                            disabled={user.id === currentUser?.userId}
                          >
                            <Ionicons
                              name="swap-horizontal-outline"
                              size={11}
                              color={ROLE_COLORS[user.role] || '#6B7280'}
                            />
                            <Text
                              style={[
                                styles.roleChipText,
                                {
                                  color: ROLE_COLORS[user.role] || '#6B7280',
                                },
                              ]}
                            >
                              {ROLE_LABELS[user.role] || user.role}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Ver / cambiar contraseña */}
                        <TouchableOpacity
                          style={[
                            styles.deleteUserBtn,
                            {
                              borderColor: theme.warningAlpha,
                              backgroundColor: theme.warningAlpha,
                            },
                          ]}
                          onPress={() => {
                            setPasswordUser(user);
                            setNewTempPassword('');
                            setShowTempPass(false);
                          }}
                        >
                          <Ionicons
                            name="key-outline"
                            size={13}
                            color={theme.warning}
                          />
                          <Text
                            style={[
                              styles.deleteUserBtnText,
                              { color: theme.warning },
                            ]}
                          >
                            Contraseña
                          </Text>
                        </TouchableOpacity>

                        {/* Eliminar */}
                        {user.id !== currentUser?.userId && (
                          <TouchableOpacity
                            style={styles.deleteUserBtn}
                            onPress={() =>
                              deleteUserAccount(user.id, user.displayName)
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={13}
                              color={theme.error}
                            />
                            <Text style={[styles.deleteUserBtnText, { color: theme.error }]}>
                              Eliminar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* MODAL: Confirmar eliminación */}
      <Modal visible={!!deleteConfirmUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: isDark ? '#1C1118' : '#FFFFFF' },
            ]}
          >
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash" size={28} color={theme.error} />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>
              Eliminar cuenta
            </Text>
            <Text style={[styles.confirmMsg, { color: theme.textSecondary }]}>
              {'¿Eliminar la cuenta de\n'}
              <Text style={{ fontWeight: '700', color: theme.text }}>
                {deleteConfirmUser?.displayName}
              </Text>
              {'?\nEsta acción no se puede deshacer.'}
            </Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#F3F4F6',
                  },
                ]}
                onPress={() => setDeleteConfirmUser(null)}
              >
                <Text style={[styles.confirmBtnText, { color: theme.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.error }]}
                onPress={confirmDeleteUser}
              >
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Ver / cambiar contraseña */}
      <Modal visible={!!passwordUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: isDark ? '#1C1118' : '#FFFFFF' },
            ]}
          >
            <View
              style={[styles.confirmIconWrap, { backgroundColor: theme.warningAlpha }]}
            >
              <Ionicons name="key" size={28} color={theme.warning} />
            </View>
            <Text
              style={[styles.confirmTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {passwordUser?.displayName}
            </Text>
            <Text style={[styles.confirmMsg, { color: theme.textSecondary }]}>
              {passwordUser?.email}
            </Text>

            {/* Contraseña actual si existe */}
            {passwordUser?.tempPassword ? (
              <View
                style={[
                  styles.passBox,
                  {
                    backgroundColor: theme.warningAlpha,
                    borderColor: theme.warningAlpha,
                  },
                ]}
              >
                <Text
                  style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}
                >
                  Contraseña actual:
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.warning,
                    fontFamily: 'monospace',
                    letterSpacing: 2,
                  }}
                >
                  {passwordUser.tempPassword}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.passBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#F9FAFB',
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  Sin contraseña registrada
                </Text>
              </View>
            )}

            {/* Establecer nueva contraseña */}
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                alignSelf: 'flex-start',
                marginTop: 14,
                marginBottom: 6,
              }}
            >
              Nueva contraseña:
            </Text>
            <View
              style={[
                styles.passInputRow,
                {
                  borderColor: theme.border,
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : '#F9FAFB',
                },
              ]}
            >
              <TextInput
                style={{ flex: 1, color: theme.text, fontSize: 14 }}
                value={newTempPassword}
                onChangeText={setNewTempPassword}
                placeholder="Escribe la nueva contraseña"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showTempPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowTempPass((v) => !v)}>
                <Ionicons
                  name={showTempPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#F3F4F6',
                  },
                ]}
                onPress={() => {
                  setPasswordUser(null);
                  setNewTempPassword('');
                }}
              >
                <Text style={[styles.confirmBtnText, { color: theme.text }]}>
                  Cerrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: newTempPassword.trim() ? theme.warning : theme.border,
                  },
                ]}
                onPress={saveUserPassword}
                disabled={!newTempPassword.trim()}
              >
                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircleSection: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 14,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  userListContainer: {
    marginTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  roleSectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  roleSectionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  userCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  userTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  userAvatar: {
    width: Platform.OS === 'web' ? 48 : 44,
    height: Platform.OS === 'web' ? 48 : 44,
    borderRadius: Platform.OS === 'web' ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
  },
  userActions: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  roleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 200,
  },
  roleOptionChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleEditClose: {
    padding: 4,
  },
  deleteUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
  },
  deleteUserBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'transparent',
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 2,
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  areaTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  areaText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userName: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 0,
  },
  userEmail: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  confirmMsg: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  passBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  passInputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
});
