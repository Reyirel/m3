import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SECRETARIAS, DIRECCIONES } from '../config/areas';

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
    if (areaType === 'secretaria') return '#9F2241';
    return '#0EA5E9';
  }, []);

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
    const badgeColor = type === 'secretaria' ? '#9F2241' : '#0EA5E9';

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
                activeOpacity={0.6}
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
                    {area.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
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
              backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5',
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
                      {area.replace(/^Secretaría (de |del |General )?/i, '').replace(/^Dirección (de |del )?/i, '')}
                    </Text>
                    <Ionicons name="close-small" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
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

const createStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    height: Dimensions.get('window').height * 0.88,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 16,
  },
  
  // Handle
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 14,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerStats: {
    marginLeft: 12,
    marginTop: 4,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  statBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  resultsInfo: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginLeft: 4,
  },

  // Selected Preview
  selectedPreview: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.05)' : 'rgba(159, 34, 65, 0.03)',
  },
  selectedList: {
    maxHeight: 56,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 110,
    justifyContent: 'center',
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },

  // List Container
  listContainer: {
    flex: 1,
  },
  areasWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 10,
    alignSelf: 'flex-start',
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Area Items
  areaItemsContainer: {
    gap: 8,
  },
  areaItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'space-between',
  },
  areaItemBoxActive: {
    borderWidth: 2,
  },
  areaItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  areaItemRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 240,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  buttonSecondary: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  buttonPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
