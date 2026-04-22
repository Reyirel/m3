// components/SuggestedAreasPanel.js
// Panel que muestra áreas sugeridas basado en usuarios seleccionados
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
import { SECRETARIAS_DIRECCIONES, getDireccionesBySecretaria } from '../config/areas';

export default function SuggestedAreasPanel({
  selectedUsers = [],
  selectedAreas = [],
  onAddArea = () => {},
  theme = {}
}) {
  const [suggestedAreas, setSuggestedAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  // Cargar áreas sugeridas cuando cambien los usuarios seleccionados
  const loadSuggestedAreas = useCallback(async () => {
    try {
      setLoading(true);

      if (selectedUsers.length === 0) {
        setSuggestedAreas([]);
        return;
      }

      // Obtener todas las áreas reales de los usuarios seleccionados
      const areasDeUsuarios = new Set();

      for (const user of selectedUsers) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            
            // Para secretarios, usar el mapeo oficial de direcciones
            if (userData.role === 'secretario') {
              const areaSecretario = userData.area || '';
              
              // Obtener direcciones del mapeo oficial
              const direcciones = getDireccionesBySecretaria(areaSecretario);
              
              if (direcciones.length > 0) {
                direcciones.forEach(dir => areasDeUsuarios.add(dir));
              } else {
                // Búsqueda por coincidencia parcial
                for (const [secretaria, dirs] of Object.entries(SECRETARIAS_DIRECCIONES)) {
                  if (areaSecretario.includes('Desarrollo Económico') && secretaria.includes('Desarrollo Económico')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Obras Públicas') && secretaria.includes('Obras Públicas')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Bienestar') && secretaria.includes('Bienestar')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('General') && secretaria.includes('General')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Tesorería') && secretaria.includes('Tesorería')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Planeación') && secretaria.includes('Planeación')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Seguridad') && secretaria.includes('Seguridad')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  } else if (areaSecretario.includes('Pueblos') && secretaria.includes('Pueblos')) {
                    dirs.forEach(dir => areasDeUsuarios.add(dir));
                  }
                }
              }
            }
            
            // Para directores, agregar su dirección específica
            if (userData.role === 'director' && userData.area) {
              areasDeUsuarios.add(userData.area);
            }
          }
        } catch (error) {
          if (__DEV__) console.error(`Error cargando áreas del usuario ${user.email}:`, error);
        }
      }

      // Filtrar áreas que ya estén seleccionadas
      const selectedSet = new Set(selectedAreas.map(a => a.toLowerCase()));
      const unselectedAreas = Array.from(areasDeUsuarios)
        .filter(area => !selectedSet.has(area.toLowerCase()))
        .sort();
      
      setSuggestedAreas(unselectedAreas);
    } catch (error) {
      if (__DEV__) console.error('Error cargando áreas sugeridas:', error);
      setSuggestedAreas([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, selectedAreas]);

  useEffect(() => {
    loadSuggestedAreas();
  }, [loadSuggestedAreas]);

  // No mostrar si hay secretarios (para evitar duplicar con SuggestedDirectionsPanel)
  // O si no hay usuarios o si todas las áreas ya están seleccionadas
  const hasSecretarios = selectedUsers.some(u => u.role === 'secretario');
  
  if (hasSecretarios || selectedUsers.length === 0 || (suggestedAreas.length === 0 && !loading)) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
      <View style={styles.header}>
        <Ionicons name="bulb-outline" size={20} color={theme?.primary || '#9F2241'} />
        <Text style={[styles.headerText, { color: theme?.text || '#333' }]}>
          Áreas sugeridas
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
          style={styles.areasScroll}
          contentContainerStyle={styles.areasContainer}
        >
          {suggestedAreas.map((area, index) => (
            <AreaCard
              key={`${area}-${index}`}
              area={area}
              onAdd={() => onAddArea(area)}
              theme={theme}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Tarjeta individual de área sugerida
const AreaCard = ({ area, onAdd, theme }) => {
  const { isDark } = useTheme();
  
  const getAreaIcon = (areaName) => {
    const areaLower = areaName?.toLowerCase() || '';
    
    if (areaLower.includes('obras') || areaLower.includes('infraestructura')) return 'hammer';
    if (areaLower.includes('salud') || areaLower.includes('sanitario')) return 'medical';
    if (areaLower.includes('educación') || areaLower.includes('educacion')) return 'school';
    if (areaLower.includes('economía') || areaLower.includes('economia') || areaLower.includes('turismo')) return 'trending-up';
    if (areaLower.includes('administración') || areaLower.includes('administracion')) return 'briefcase';
    if (areaLower.includes('desarrollo')) return 'leaf';
    if (areaLower.includes('ambiente') || areaLower.includes('sostenibilidad')) return 'earth';
    if (areaLower.includes('seguridad') || areaLower.includes('policía') || areaLower.includes('policia')) return 'shield';
    if (areaLower.includes('cultura') || areaLower.includes('deporte')) return 'star';
    
    return 'folder';
  };

  return (
    <TouchableOpacity 
      style={[styles.areaCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}
      onPress={onAdd}
      activeOpacity={0.7}
    >
      <View style={[styles.areaIcon, { backgroundColor: theme?.primary + '20' || '#9F224120' }]}>
        <Ionicons 
          name={getAreaIcon(area)} 
          size={24} 
          color={theme?.primary || '#9F2241'} 
        />
      </View>

      <Text style={[styles.areaName, { color: theme?.text || '#333' }]} numberOfLines={3}>
        {area}
      </Text>

      <View 
        style={[
          styles.addButton, 
          { backgroundColor: theme?.primary || '#9F2241' }
        ]}
      >
        <Ionicons name="add" size={16} color="#FFF" />
      </View>
    </TouchableOpacity>
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
  areasScroll: {
    paddingHorizontal: 16,
  },
  areasContainer: {
    gap: 12,
  },
  areaCard: {
    width: 110,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  areaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
