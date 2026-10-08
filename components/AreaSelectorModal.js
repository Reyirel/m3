import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SECRETARIAS, DIRECCIONES } from '../config/areas';
import { createStyles } from './AreaSelectorModalStyles';

/**
 * AreaSelectorModal - Componente premium para seleccionar múltiples áreas
 * Diseño UX/UI profesional con:
 * - Búsqueda y filtrado en tiempo real
 * - Visualización clara de áreas seleccionadas
 * - Categorización por tipo (Secretaría/Dirección)
 * - Animaciones suaves
 * - Mejor uso del espacio
 * - Háptica feedback
 */
export default function AreaSelectorModal({
  visible = false,
  onClose = () => {},
  selectedAreas = [],
  onAreasChange = () => {},
  allAreas = [],
  theme = {},
  isDark = false
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Mapeo de áreas a tipo — generado dinámicamente desde config/areas.js
  const areaTypeMap = useMemo(() => {
    const map = {};
    SECRETARIAS.forEach(s => { map[s] = 'secretaria'; });
    DIRECCIONES.forEach(d => { map[d] = 'direccion'; });
    return map;
  }, []);

  // Colores por tipo de área
  const getAreaColor = useCallback((areaType) => {
    if (areaType === 'secretaria') return theme.primary;
    return '#0EA5E9';
  }, [theme.primary]);

  // Filtrar y agrupar áreas
  const groupedAreas = useMemo(() => {
    let filtered = allAreas;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allAreas.filter(area => 
        area.toLowerCase().includes(query)
      );
    }

    // Agrupar por tipo
    const grouped = {
      secretaria: filtered.filter(a => areaTypeMap[a] === 'secretaria'),
      direccion: filtered.filter(a => areaTypeMap[a] === 'direccion')
    };

    return grouped;
  }, [allAreas, searchQuery, areaTypeMap]);

  const toggleArea = useCallback((area) => {
    const newAreas = selectedAreas.includes(area)
      ? selectedAreas.filter(a => a !== area)
      : [...selectedAreas, area];
    onAreasChange(newAreas);
  }, [selectedAreas, onAreasChange]);

  const totalFiltered = (groupedAreas.secretaria?.length || 0) + (groupedAreas.direccion?.length || 0);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Renderizar sección de áreas
  const renderAreaSection = (title, areaList, type) => {
    if (!areaList || areaList.length === 0) return null;

    const color = getAreaColor(type);
    const badgeColor = type === 'secretaria' ? theme.primary : '#0EA5E9';

    return (
      <View key={type} style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          activeOpacity={0.7}
        >
          <View style={[styles.sectionBadge, { backgroundColor: `${badgeColor}15` }]}>
            <View style={[styles.sectionIconWrap, { backgroundColor: badgeColor }]}>
              <Ionicons 
                name={type === 'secretaria' ? 'briefcase' : 'folder'} 
                size={14} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {title}
            </Text>
            <View style={[styles.sectionCount, { backgroundColor: `${badgeColor}20` }]}>
              <Text style={[styles.sectionCountText, { color: badgeColor }]}>{areaList.length}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.areaItemsContainer}>
          {areaList.map((area) => {
            const isSelected = selectedAreas.includes(area);
            return (
              <TouchableOpacity
                key={area}
                onPress={() => toggleArea(area)}
                style={[
                  styles.areaItemBox,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA' },
                  isSelected && [styles.areaItemBoxActive, { backgroundColor: `${color}08`, borderColor: color }]
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.areaItemContent}>
                  <View style={[
                    styles.areaItemRadio, 
                    { borderColor: isSelected ? color : theme.border },
                    isSelected && { backgroundColor: color, borderColor: color }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text 
                    style={[
                      styles.areaItemText, 
                      { color: isSelected ? color : theme.text },
                      isSelected && { fontWeight: '700' }
                    ]}
                    numberOfLines={2}
                  >
                    {area.replace(/^Secretaría (de |del )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          {/* Handle indicador */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }]} />
          </View>
          
          {/* Header Premium */}
          <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  ¿A quién asignar?
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  Selecciona las áreas responsables
                </Text>
              </View>
            </View>
            {selectedAreas.length > 0 && (
              <View style={styles.headerStats}>
                <View style={[styles.statBadge, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.statBadgeText, { color: '#FFFFFF' }]}>
                    {selectedAreas.length}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Search Box Mejorado */}
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.searchBox, { 
              backgroundColor: theme.surfaceL2,
              borderColor: theme.border 
            }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder="Buscar área..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                selectionColor={theme.primary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                >
                  <Ionicons name="close-circle-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Info de resultados */}
            {searchQuery.length > 0 && (
              <Text style={[styles.resultsInfo, { color: theme.textSecondary }]}>
                {totalFiltered} {totalFiltered === 1 ? 'resultado' : 'resultados'}
              </Text>
            )}
          </View>

          {/* Áreas Seleccionadas Preview */}
          {selectedAreas.length > 0 && (
            <View style={styles.selectedPreview}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedList}>
                {selectedAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[styles.selectedPill, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.selectedPillText} numberOfLines={1}>
                      {area.replace(/^Secretaría (de |del )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                    </Text>
                    <Ionicons name="close" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content - Áreas disponibles */}
          <ScrollView 
            style={styles.listContainer}
            showsVerticalScrollIndicator={true}
            indicatorStyle={isDark ? 'white' : 'black'}
          >
            {totalFiltered > 0 ? (
              <View style={styles.areasWrapper}>
                {renderAreaSection('Secretarías', groupedAreas.secretaria, 'secretaria')}
                {renderAreaSection('Direcciones', groupedAreas.direccion, 'direccion')}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                  Sin resultados
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                  No encontramos áreas que coincidan con "{searchQuery}"
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer con botones */}
          <View style={[styles.footer, { 
            borderTopColor: theme.border,
            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FAFAFA'
          }]}>
            <TouchableOpacity 
              style={[
                styles.buttonSecondary, 
                { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' }
              ]}
              onPress={() => {
                setSearchQuery('');
                onAreasChange([]);
              }}
              disabled={selectedAreas.length === 0}
            >
              <Ionicons name="refresh-outline" size={18} color={selectedAreas.length === 0 ? theme.textSecondary + '50' : theme.textSecondary} />
              <Text style={[styles.buttonText, { color: selectedAreas.length === 0 ? theme.textSecondary + '50' : theme.text }]}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.buttonPrimary, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonTextPrimary}>
                {selectedAreas.length > 0 ? `Confirmar (${selectedAreas.length})` : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
