// components/MultiUserSelector.js
// Selector de múltiples usuarios para asignaciones
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Modal,
  TextInput,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';

export default function MultiUserSelector({ 
  selectedUsers = [], 
  onSelectionChange = () => {},
  role = 'admin',
  area = null,
  _secretarioEmail = null,
  allowedAreas = []  // Array de áreas permitidas para secretarios
}) {
  const { theme } = useTheme();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let usersList = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        let include = false;
        
        if (role === 'admin') {
          // Admin puede asignar a cualquiera
          include = true;
        } else if (role === 'secretario') {
          // Secretario puede asignar a directores de sus áreas (direcciones)
          // Combinar todas las áreas del secretario
          const todasAreasSec = [...new Set([area, ...allowedAreas])].filter(Boolean);
          
          if (['director'].includes(userData.role)) {
            // Directors de las áreas del secretario
            include = todasAreasSec.includes(userData.area) || todasAreasSec.includes(userData.department);
          }
        } else if (role === 'director') {
          // Director can only view their own data
          include = userData.area === area && 
                   ['director'].includes(userData.role);
        }
        
        // Excluir admins de la lista a menos que seas admin
        if (include && (userData.role !== 'admin' || role === 'admin')) {
          usersList.push({
            id: doc.id,
            email: userData.email,
            displayName: userData.displayName,
            role: userData.role,
            department: userData.department,
            area: userData.area,
            avatar: userData.avatar || null,
            // Agregar datos adicionales para filtrar áreas
            direcciones: userData.direcciones || [],
            areasPermitidas: userData.areasPermitidas || [],
            position: userData.position || null
          });
        }
      });
      
      // Ordenar por rol y nombre
      usersList.sort((a, b) => {
        const roleOrder = { admin: 0, secretario: 1, director: 2 };
        const orderA = roleOrder[a.role] || 3;
        const orderB = roleOrder[b.role] || 3;
        if (orderA !== orderB) return orderA - orderB;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      
      setUsers(usersList);
      setFilteredUsers(usersList);
    } catch (error) {
      if (__DEV__) console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  }, [role, area, allowedAreas]);

  // Cargar usuarios disponibles
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Helpers para mostrar roles
  const getRoleColor = (role) => {
    const colors = {
      admin: theme.error,
      secretario: '#9F2241',
      director: '#235B4E'
    };
    return colors[role] || theme.textMuted;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      secretario: 'Secretario',
      director: 'Director'
    };
    return labels[role] || 'Funcionario';
  };

  // Organizar usuarios por secciones de rol
  const sections = useMemo(() => {
    const roleConfig = [
      { role: 'secretario', title: 'Secretarios', color: '#9F2241' },
      { role: 'director', title: 'Directores', color: '#235B4E' },
      { role: 'otros', title: 'Otros Funcionarios', color: theme.textMuted },
      { role: 'admin', title: 'Admins', color: theme.error },
    ];
    
    return roleConfig
      .map(config => {
        let data;
        if (config.role === 'otros') {
          data = filteredUsers.filter(u => !['secretario', 'director', 'admin'].includes(u.role));
        } else {
          data = filteredUsers.filter(u => u.role === config.role);
        }
        return { ...config, data };
      })
      .filter(section => section.data.length > 0);
  }, [filteredUsers]);

  // Filtrar usuarios por búsqueda
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchText, users]);

  const toggleUserSelection = (user) => {
    const isSelected = selectedUsers.some(u => u.email === user.email);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedUsers.filter(u => u.email !== user.email);
    } else {
      newSelection = [...selectedUsers, user];
    }
    
    onSelectionChange(newSelection);
  };

  const isUserSelected = (email) => {
    return selectedUsers.some(u => u.email === email);
  };

  const removeSelectedUser = (email) => {
    const newSelection = selectedUsers.filter(u => u.email !== email);
    onSelectionChange(newSelection);
  };

  const UserItem = ({ user, isSelected }) => (
    <TouchableOpacity
      style={[styles.userItem, isSelected && styles.userItemSelected]}
      onPress={() => toggleUserSelection(user)}
    >
      <View style={styles.userAvatarContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={[styles.userRoleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
          <Text style={[styles.userRoleText, { color: getRoleColor(user.role) }]}>
            {getRoleLabel(user.role)}
          </Text>
        </View>
      </View>
      
      <View style={styles.checkbox}>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#9F2241" />
        )}
      </View>
    </TouchableOpacity>
  );

  const SelectedUserTag = ({ user }) => (
    <View style={styles.selectedTag}>
      <Text style={styles.selectedTagText} numberOfLines={1}>
        {user.displayName}
      </Text>
      <TouchableOpacity
        onPress={() => removeSelectedUser(user.email)}
        style={styles.removeTagButton}
      >
        <Ionicons name="close-circle" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Vista de usuarios seleccionados */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>Asignados ({selectedUsers.length})</Text>
          <View style={styles.selectedTags}>
            {selectedUsers.map(user => (
              <SelectedUserTag key={user.email} user={user} />
            ))}
          </View>
        </View>
      )}

      {/* Botón para abrir selector */}
      <TouchableOpacity
        style={[styles.selectorButton, selectedUsers.length > 0 && styles.selectorButtonActive]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add-circle-outline" size={20} color="#9F2241" />
        <Text style={styles.selectorButtonText}>
          {selectedUsers.length === 0 ? 'Asignar a' : 'Agregar más'}
        </Text>
      </TouchableOpacity>

      {/* Modal selector */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Asignados</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o email..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de usuarios por secciones */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Cargando usuarios...</Text>
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchText ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={[styles.sectionBadge, { backgroundColor: section.color }]}>
                    <Text style={styles.sectionCount}>{section.data.length}</Text>
                  </View>
                </View>
              )}
              renderItem={({ item }) => (
                <UserItem
                  user={item}
                  isSelected={isUserSelected(item.email)}
                />
              )}
              keyExtractor={item => item.email}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={true}
            />
          )}

          {/* Footer con botón de confirmación */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>
                Confirmar ({selectedUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  
  selectedContainer: {
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingLeft: 2,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9F2241',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedTagText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 140,
  },
  removeTagButton: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    marginLeft: 4,
  },

  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#9F2241',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(159, 34, 65, 0.06)',
  },
  selectorButtonActive: {
    backgroundColor: 'rgba(159, 34, 65, 0.10)',
    borderColor: '#9F2241',
  },
  selectorButtonText: {
    color: '#9F2241',
    fontSize: 15,
    fontWeight: '700',
  },

  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#9F2241',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 44,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
  },
  sectionCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  userItemSelected: {
    backgroundColor: 'rgba(159, 34, 65, 0.08)',
    borderColor: '#9F2241',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  userAvatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(159, 34, 65, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#9F2241',
    fontSize: 20,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },
  userRoleBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(159, 34, 65, 0.1)',
    alignSelf: 'flex-start',
  },
  userRoleText: {
    fontSize: 11,
    color: '#9F2241',
    fontWeight: '600',
  },
  checkbox: {
    marginLeft: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },

  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  confirmButton: {
    backgroundColor: '#9F2241',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
