// components/SuggestedOperativesPanel.js
// Panel que muestra directores sugeridos basado en secretarios seleccionados
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const roleLabel = {
  'director': '👤 Director',
  'secretario': '🔑 Secretario'
};

export default function SuggestedOperativesPanel({
  selectedUsers = [],
  onAddUser = () => {},
  theme = {}
}) {
  const [suggestedDirectors, setSuggestedDirectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  // Cargar directores sugeridos cuando cambien los usuarios seleccionados
  const loadSuggestedDirectors = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener solo directores seleccionados
      const directoresSeleccionados = selectedUsers.filter(u => u.role === 'director');
      
      if (directoresSeleccionados.length === 0) {
        setSuggestedDirectors([]);
        return;
      }

      // Obtener áreas de los directores seleccionados
      const areasDeDirectores = new Set(
        directoresSeleccionados
          .map(d => d.area || d.department)
          .filter(Boolean)
      );

      if (areasDeDirectores.size === 0) {
        setSuggestedDirectors([]);
        return;
      }

      // Obtener directores de esas áreas
      const directoresRef = collection(db, 'users');
      const q = query(
        directoresRef,
        where('role', 'in', ['director', 'secretario']),
        where('active', '==', true)
      );
      
      const snapshot = await getDocs(q);
      const directors = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        // Filtrar por área
        if (areasDeDirectores.has(userData.area) || areasDeDirectores.has(userData.department)) {
          directors.push({ id: doc.id, ...userData });
        }
      });

      // Filtrar los que ya están seleccionados
      const selectedEmails = new Set(selectedUsers.map(u => u.email?.toLowerCase()));
      const unselectedDirectors = directors.filter(
        o => !selectedEmails.has(o.email?.toLowerCase())
      );
      
      setSuggestedDirectors(unselectedDirectors);
    } catch (error) {
      if (__DEV__) console.error('Error cargando directores sugeridos:', error);
      setSuggestedDirectors([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUsers]);

  useEffect(() => {
    loadSuggestedDirectors();
  }, [loadSuggestedDirectors]);

  // No mostrar si no hay secretarios seleccionados
  if (!selectedUsers.some(u => ['secretario', 'admin'].includes(u.role))) {
    return null;
  }

  if (suggestedDirectors.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={theme?.primary || '#9F2241'} />
        <Text style={[styles.headerText, { color: theme?.text || '#333' }]}>
          Directores sugeridos
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme?.primary || '#9F2241'} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.operativesScroll}
          contentContainerStyle={styles.operativesContainer}
        >
          {suggestedDirectors.map(director => (
            <DirectorCard
              key={director.id}
              director={director}
              onAdd={() => onAddUser({
                email: director.email,
                displayName: director.displayName,
                role: director.role,
                area: director.area || director.department
              })}
              theme={theme}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Tarjeta individual de director sugerido
const DirectorCard = ({ director, onAdd, theme }) => {
  const { isDark } = useTheme();
  
  const getAbbreviation = (name) => {
    const parts = name?.split(' ') || [];
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name?.substring(0, 2).toUpperCase() || '?';
  };

  return (
    <View style={[styles.operativeCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}>
      <View style={[styles.avatar, { backgroundColor: theme?.primary + '30' || '#9F224130' }]}>
        <Text style={[styles.avatarText, { color: theme?.primary || '#9F2241' }]}>
          {getAbbreviation(director.displayName)}
        </Text>
      </View>

      <Text style={[styles.operativeName, { color: theme?.text || '#333' }]} numberOfLines={2}>
        {director.displayName}
      </Text>

      <Text style={[styles.operativeRole, { color: theme?.primary || '#9F2241' }]}>
        {roleLabel[director.role] || director.role}
      </Text>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme?.primary || '#9F2241' }]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  operativesScroll: {
    paddingHorizontal: 16,
  },
  operativesContainer: {
    gap: 12,
  },
  operativeCard: {
    width: 120,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  operativeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  operativeRole: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
