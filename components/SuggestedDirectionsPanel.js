// components/SuggestedDirectionsPanel.js
// Panel que muestra las direcciones (áreas a cargo) de secretarios seleccionados
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

export default function SuggestedDirectionsPanel({
  selectedUsers = [],
  selectedAreas = [],
  onAddArea = () => {},
  theme = {}
}) {
  const [suggestedDirections, setSuggestedDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  // Cargar direcciones cuando cambien los usuarios seleccionados
  const loadSuggestedDirections = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener solo secretarios seleccionados
      const secretariosSeleccionados = selectedUsers.filter(u => u.role === 'secretario');
      
      if (secretariosSeleccionados.length === 0) {
        setSuggestedDirections([]);
        return;
      }

      // Obtener todas las direcciones de los secretarios seleccionados
      const direccionesEncontradas = new Set();

      for (const secretario of secretariosSeleccionados) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', secretario.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const secretarioData = snapshot.docs[0].data();
            
            // Obtener el área principal del secretario (que debería ser una secretaría)
            const areaSecretario = secretarioData.area || '';
            
            // Primero: usar las direcciones del propio secretario en Firestore (fuente más confiable)
            const secretarioDirecciones = secretarioData.direcciones || [];
            if (secretarioDirecciones.length > 0) {
              secretarioDirecciones.forEach(dir => direccionesEncontradas.add(dir));
            }
            
            // También: usar las direcciones del mapeo oficial para completar
            const direccionesDeSecretaria = getDireccionesBySecretaria(areaSecretario);
            if (direccionesDeSecretaria.length > 0) {
              direccionesDeSecretaria.forEach(dir => direccionesEncontradas.add(dir));
            }
            
            // Si aún no encontramos nada, buscar por coincidencia parcial
            if (direccionesEncontradas.size === 0) {
              for (const [secretaria, direcciones] of Object.entries(SECRETARIAS_DIRECCIONES)) {
                // Coincidencia parcial (por si el nombre está abreviado)
                if (areaSecretario.includes('Desarrollo Económico') && secretaria.includes('Desarrollo Económico')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Obras Públicas') && secretaria.includes('Obras Públicas')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Bienestar') && secretaria.includes('Bienestar')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('General') && secretaria.includes('General')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Tesorería') && secretaria.includes('Tesorería')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Planeación') && secretaria.includes('Planeación')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Seguridad') && secretaria.includes('Seguridad')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                } else if (areaSecretario.includes('Pueblos') && secretaria.includes('Pueblos')) {
                  direcciones.forEach(dir => direccionesEncontradas.add(dir));
                }
              }
            }
          }
        } catch (error) {
          if (__DEV__) console.error(`Error cargando direcciones del secretario ${secretario.email}:`, error);
        }
      }

      // Filtrar direcciones que ya estén seleccionadas
      const selectedSet = new Set(selectedAreas.map(a => a.toLowerCase()));
      const unselectedDirections = Array.from(direccionesEncontradas)
        .filter(area => !selectedSet.has(area.toLowerCase()))
        .sort();
      
      setSuggestedDirections(unselectedDirections);
    } catch (error) {
      if (__DEV__) console.error('Error cargando direcciones sugeridas:', error);
      setSuggestedDirections([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, selectedAreas]);

  useEffect(() => {
    loadSuggestedDirections();
  }, [loadSuggestedDirections]);

  // No mostrar si no hay secretarios seleccionados o no hay direcciones
  if (!selectedUsers.some(u => u.role === 'secretario')) {
    return null;
  }

  if (suggestedDirections.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
      <View style={styles.header}>
        <Ionicons name="folder-outline" size={20} color={theme?.primary || '#9F2241'} />
        <Text style={[styles.headerText, { color: theme?.text || '#333' }]}>
          Direcciones del secretario
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
          style={styles.directionsScroll}
          contentContainerStyle={styles.directionsContainer}
        >
          {suggestedDirections.map((direction, index) => (
            <DirectionCard
              key={`${direction}-${index}`}
              direction={direction}
              onAdd={() => onAddArea(direction)}
              theme={theme}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Tarjeta individual de dirección sugerida
const DirectionCard = ({ direction, onAdd, theme }) => {
  const { isDark } = useTheme();
  
  const getDirectionIcon = (directionName) => {
    const dirLower = directionName?.toLowerCase() || '';
    
    if (dirLower.includes('obras') || dirLower.includes('infraestructura')) return 'hammer';
    if (dirLower.includes('salud') || dirLower.includes('sanitario')) return 'medical';
    if (dirLower.includes('educación') || dirLower.includes('educacion')) return 'school';
    if (dirLower.includes('economía') || dirLower.includes('economia') || dirLower.includes('turismo')) return 'trending-up';
    if (dirLower.includes('administración') || dirLower.includes('administracion')) return 'briefcase';
    if (dirLower.includes('desarrollo')) return 'leaf';
    if (dirLower.includes('ambiente') || dirLower.includes('sostenibilidad')) return 'earth';
    if (dirLower.includes('seguridad') || dirLower.includes('policía') || dirLower.includes('policia')) return 'shield';
    if (dirLower.includes('cultura') || dirLower.includes('deporte')) return 'star';
    if (dirLower.includes('rrhh') || dirLower.includes('recursos') || dirLower.includes('humanos')) return 'people';
    if (dirLower.includes('jurídica') || dirLower.includes('juridica') || dirLower.includes('legal')) return 'document-text';
    if (dirLower.includes('tesorería') || dirLower.includes('tesoreria') || dirLower.includes('finanzas')) return 'wallet';
    
    return 'folder';
  };

  return (
    <TouchableOpacity 
      style={[styles.directionCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFF' }]}
      onPress={onAdd}
      activeOpacity={0.7}
    >
      <View style={[styles.directionIcon, { backgroundColor: theme?.primary + '20' || '#9F224120' }]}>
        <Ionicons 
          name={getDirectionIcon(direction)} 
          size={28} 
          color={theme?.primary || '#9F2241'} 
        />
      </View>

      <Text style={[styles.directionName, { color: theme?.text || '#333' }]} numberOfLines={3}>
        {direction}
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
  directionsScroll: {
    paddingHorizontal: 16,
  },
  directionsContainer: {
    gap: 12,
  },
  directionCard: {
    width: 120,
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
  directionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  directionName: {
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
