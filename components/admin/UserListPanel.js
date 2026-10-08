// components/admin/UserListPanel.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteUser, setUserRole } from '../../services/usersDirectory';
import { adminSetUserPassword } from '../../services/authFirestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { styles } from './UserListPanelStyles';

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
      await setUserRole(userId, newRole);
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
      await deleteUser(deleteConfirmUser.id);
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
      await adminSetUserPassword(passwordUser.id, passwordUser.email, newTempPassword.trim());
      // La contraseña ya no se guarda en texto plano: solo se muestra en esta ventana
      setPasswordUser(prev => prev && { ...prev, tempPassword: newTempPassword.trim() });
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
            { backgroundColor: theme.glass, borderColor: theme.glassBorder },
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
                <TouchableOpacity onPress={() => setUserSearch('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
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
                              accessibilityRole="button"
                              accessibilityLabel="Cerrar"
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
                    backgroundColor: theme.background,
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
                  style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}
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
                    backgroundColor: theme.background,
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
                  backgroundColor: theme.background,
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
              <TouchableOpacity onPress={() => setShowTempPass((v) => !v)} accessibilityRole="button" accessibilityLabel="Mostrar u ocultar contraseña">
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
                    backgroundColor: theme.background,
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
