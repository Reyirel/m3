import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * AreaSelector - Componente profesional para seleccionar áreas
 * Características:
 * - Visualización clara de áreas con iconos
 * - Grid layout organizado
 * - Indicador visual claro de selección
 * - Escalable para agregar más áreas
 * - Soporte para restricciones de rol
 */
export default function AreaSelector({
  areas = [],
  selectedArea = null,
  onSelectArea = () => {},
  areaIcons = {},
  userRole = 'admin',
  _userDepartment = null,
  disabled = false,
  theme = {},
  isDark = false
}) {
  // Mapeo de áreas a departamentos (mismo del TaskDetailScreen)
  const _areaToDepMap = useMemo(() => ({
    'Jurídica': 'juridica',
    'Obras': 'obras',
    'Tesorería': 'tesoreria',
    'Administración': 'administracion',
    'Recursos Humanos': 'rrhh'
  }), []);

  // Iconos por defecto si no se proporcionan
  const defaultIcons = {
    'Jurídica': 'scale',
    'Obras': 'construct',
    'Tesorería': 'cash',
    'Administración': 'briefcase',
    'Recursos Humanos': 'people'
  };

  const icons = { ...defaultIcons, ...areaIcons };

  // Colores asociados a cada área
  const areaColors = {
    'Jurídica': '#9F2241',      // Vino (ya existe)
    'Obras': '#FF8C42',         // Naranja
    'Tesorería': '#2ECC7A',     // Verde
    'Administración': '#3498DB', // Azul
    'Recursos Humanos': '#E74C3C' // Rojo
  };

  // Verificar si un usuario puede seleccionar un área
  const canSelectArea = (_area) => {
    if (disabled) return false;
    if (userRole === 'admin') return true;
    return false;
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={areas.length > 3}
      style={styles.container}
    >
      <View style={styles.scrollContent}>
        {areas.map((area, _index) => {
          const isSelectable = canSelectArea(area);
          const isSelected = selectedArea === area;
          const color = areaColors[area] || theme.primary || '#9F2241';

          return (
            <TouchableOpacity
              key={area}
              style={[
                styles.areaCard,
                isSelected && [styles.areaCardActive, { backgroundColor: color }],
                !isSelectable && styles.areaCardDisabled
              ]}
              onPress={() => isSelectable && onSelectArea(area)}
              disabled={!isSelectable}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected ? styles.iconContainerActive : styles.iconContainerInactive,
                  isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }
                ]}
              >
                <Ionicons
                  name={icons[area] || 'layers'}
                  size={24}
                  color={isSelected ? '#FFFFFF' : color}
                />
              </View>
              <Text
                style={[
                  styles.areaLabel,
                  isSelected && styles.areaLabelActive
                ]}
                numberOfLines={2}
              >
                {area}
              </Text>
              {isSelected && (
                <View style={[styles.badge, { backgroundColor: color }]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    marginVertical: 8
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 4,
    minWidth: '100%'
  },
  areaCard: {
    width: 100,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#2C2C2E' : '#FFF7ED',
    borderWidth: 2,
    borderColor: isDark ? '#444444' : '#FFD4A3',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative'
  },
  areaCardActive: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8
  },
  areaCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#E5E5EA'
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  iconContainerInactive: {
    backgroundColor: '#FFC9D8'
  },
  iconContainerActive: {
    backgroundColor: '#FFFFFF'
  },
  areaLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.text || '#1A1A1A',
    letterSpacing: -0.2,
    lineHeight: 15
  },
  areaLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  }
});
