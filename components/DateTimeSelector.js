import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * DateTimeSelector - Selector de fecha y hora con diseño premium
 * Características:
 * - Vista principal destacada con fecha y hora
 * - Modal con calendario y reloj intuitivos
 * - Fácil selección de fecha y hora
 * - Diseño moderno y profesional
 * - Soporte para tema claro/oscuro
 */
export default function DateTimeSelector({
  selectedDate = new Date(),
  onDateSelect = () => {},
  disabled = false,
  theme = {},
  isDark = false,
  _minimumDate = new Date()
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [currentHour, setCurrentHour] = useState(selectedDate.getHours());
  const [currentMinute, setCurrentMinute] = useState(selectedDate.getMinutes());
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const _scaleAnim = useRef(new Animated.Value(1)).current;

  // Números de horas (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Números de minutos (0-59 de 5 en 5)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Obtener días del mes actual
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Obtener primer día del mes
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];
  
  // Agregar espacios vacíos para los días anteriores
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Agregar días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Cambiar mes
  const changeMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Seleccionar día
  const selectDay = (day) => {
    if (day) {
      const newDate = new Date(currentDate);
      newDate.setDate(day);
      newDate.setHours(currentHour, currentMinute, 0, 0);
      setCurrentDate(newDate);
      setShowTimeSelector(true);
    }
  };

  // Confirmar selección
  const confirmSelection = () => {
    const finalDate = new Date(currentDate);
    finalDate.setHours(currentHour, currentMinute, 0, 0);
    onDateSelect(finalDate);
    setModalVisible(false);
  };

  // Cancelar
  const cancelSelection = () => {
    setCurrentDate(new Date(selectedDate));
    setCurrentHour(selectedDate.getHours());
    setCurrentMinute(selectedDate.getMinutes());
    setShowTimeSelector(false);
    setModalVisible(false);
  };

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const monthInitial = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <>
      {/* Selected Date Display */}
      <TouchableOpacity
        style={[styles.dateDisplayContainer, disabled && styles.disabledContainer]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={[styles.dateCardGradient, { backgroundColor: theme.primary || '#9F2241' }]}>
          {/* Lado Izquierdo - Icono */}
          <View style={styles.dateCardLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={28} color="#FFFFFF" />
            </View>
          </View>

          {/* Lado Derecho - Texto */}
          <View style={styles.dateCardRight}>
            <Text style={styles.dateCardLabel}>Fecha Compromiso</Text>
            
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateCardDate}>
                {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </Text>
              <View style={styles.dateSeparator} />
              <Text style={styles.dateCardTime}>
                {selectedDate.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>

            <Text style={styles.dateCardFullDate}>
              {selectedDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cancelSelection}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={cancelSelection} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: theme.primary }]}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Seleccionar Fecha y Hora</Text>
              <TouchableOpacity onPress={confirmSelection} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: theme.primary, fontWeight: '700' }]}>Listo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {!showTimeSelector ? (
                <View>
                  {/* Month Selector */}
                  <View style={styles.monthSelector}>
                    <TouchableOpacity
                      onPress={() => changeMonth(-1)}
                      style={styles.monthButton}
                    >
                      <Ionicons name="chevron-back" size={24} color={theme.primary || '#9F2241'} />
                    </TouchableOpacity>

                    <View style={styles.monthDisplay}>
                      <Text style={[styles.monthText, { color: theme.text }]}>
                        {monthInitial}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => changeMonth(1)}
                      style={styles.monthButton}
                    >
                      <Ionicons name="chevron-forward" size={24} color={theme.primary || '#9F2241'} />
                    </TouchableOpacity>
                  </View>

                  {/* Calendar Grid */}
                  <View style={styles.calendarContainer}>
                    {/* Day Headers */}
                    <View style={styles.dayHeadersRow}>
                      {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day) => (
                        <View key={day} style={styles.dayHeaderCell}>
                          <Text style={[styles.dayHeaderText, { color: theme.textSecondary }]}>
                            {day}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Calendar Days */}
                    <View style={styles.calendarGrid}>
                      {days.map((day, index) => {
                        const isSelected = day && 
                          day === currentDate.getDate() &&
                          currentDate.getMonth() === new Date().getMonth();
                        const isToday = day === new Date().getDate();

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dayCell,
                              isSelected && [styles.dayCellSelected, { backgroundColor: theme.primary || '#9F2241' }],
                              isToday && !isSelected && styles.dayCellToday
                            ]}
                            onPress={() => selectDay(day)}
                            disabled={!day}
                          >
                            {day && (
                              <Text
                                style={[
                                  styles.dayCellText,
                                  isSelected && styles.dayCellTextSelected,
                                  !day && { color: 'transparent' }
                                ]}
                              >
                                {day}
                              </Text>
                            )}
                            {isToday && !isSelected && (
                              <View style={[styles.todayIndicator, { backgroundColor: theme.primary || '#9F2241' }]} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Quick Select Buttons */}
                  <View style={styles.quickSelectContainer}>
                    <Text style={[styles.quickSelectLabel, { color: theme.textSecondary }]}>
                      Selección Rápida
                    </Text>
                    <View style={styles.quickSelectButtons}>
                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: theme.primary || '#9F2241' }]}
                        onPress={() => {
                          const today = new Date();
                          setCurrentDate(today);
                          setShowTimeSelector(true);
                        }}
                      >
                        <Ionicons name="today" size={20} color={theme.primary || '#9F2241'} />
                        <Text style={[styles.quickBtnText, { color: theme.text }]}>Hoy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: theme.primary || '#9F2241' }]}
                        onPress={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setCurrentDate(tomorrow);
                          setShowTimeSelector(true);
                        }}
                      >
                        <Ionicons name="arrow-forward" size={20} color={theme.primary || '#9F2241'} />
                        <Text style={[styles.quickBtnText, { color: theme.text }]}>Mañana</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickBtn, { borderColor: theme.primary || '#9F2241' }]}
                        onPress={() => {
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          setCurrentDate(nextWeek);
                          setShowTimeSelector(true);
                        }}
                      >
                        <Ionicons name="calendar" size={20} color={theme.primary || '#9F2241'} />
                        <Text style={[styles.quickBtnText, { color: theme.text }]}>Próx. Sem.</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  {/* Time Selector */}
                  <View style={styles.timePickerContainer}>
                    <Text style={[styles.timeSelectorTitle, { color: theme.text }]}>
                      Selecciona la hora
                    </Text>

                    <View style={styles.timeInputRow}>
                      {/* Hour Selector */}
                      <View style={styles.timeInputGroup}>
                        <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>HORA</Text>
                        <ScrollView
                          style={[styles.timeScroll, { backgroundColor: isDark ? '#2C2C2E' : '#F9F9F9' }]}
                          scrollEnabled={true}
                          contentContainerStyle={{ paddingVertical: 100 }}
                          showsVerticalScrollIndicator={false}
                        >
                          {hours.map((hour) => (
                            <TouchableOpacity
                              key={hour}
                              onPress={() => setCurrentHour(hour)}
                              style={[
                                styles.timeOption,
                                currentHour === hour && [styles.timeOptionSelected, { backgroundColor: theme.primary || '#9F2241' }]
                              ]}
                            >
                              <Text
                                style={[
                                  styles.timeOptionText,
                                  currentHour === hour && styles.timeOptionTextSelected
                                ]}
                              >
                                {String(hour).padStart(2, '0')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <View style={styles.timeSeparator}>
                        <Text style={[styles.timeSeparatorText, { color: theme.text }]}>:</Text>
                      </View>

                      {/* Minute Selector */}
                      <View style={styles.timeInputGroup}>
                        <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>MIN</Text>
                        <ScrollView
                          style={[styles.timeScroll, { backgroundColor: isDark ? '#2C2C2E' : '#F9F9F9' }]}
                          scrollEnabled={true}
                          contentContainerStyle={{ paddingVertical: 100 }}
                          showsVerticalScrollIndicator={false}
                        >
                          {minutes.map((minute) => (
                            <TouchableOpacity
                              key={minute}
                              onPress={() => setCurrentMinute(minute)}
                              style={[
                                styles.timeOption,
                                currentMinute === minute && [styles.timeOptionSelected, { backgroundColor: theme.primary || '#9F2241' }]
                              ]}
                            >
                              <Text
                                style={[
                                  styles.timeOptionText,
                                  currentMinute === minute && styles.timeOptionTextSelected
                                ]}
                              >
                                {String(minute).padStart(2, '0')}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>

                    {/* Time Preview */}
                    <View style={[styles.timePreview, { backgroundColor: (theme.primary || '#9F2241') + '22' }]}>
                      <Text style={[styles.timePreviewLabel, { color: theme.textSecondary }]}>Hora seleccionada</Text>
                      <Text style={[styles.timePreviewTime, { color: theme.text }]}>
                        {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')}
                      </Text>
                    </View>

                    {/* Back Button */}
                    <TouchableOpacity
                      style={[styles.backButton, { borderColor: theme.primary || '#9F2241' }]}
                      onPress={() => setShowTimeSelector(false)}
                    >
                      <Ionicons name="arrow-back" size={20} color={theme.primary || '#9F2241'} />
                      <Text style={[styles.backButtonText, { color: theme.primary || '#9F2241' }]}>
                        Volver a Calendario
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (theme, isDark) => StyleSheet.create({
  dateDisplayContainer: {
    marginVertical: 12,
    overflow: 'hidden'
  },
  disabledContainer: {
    opacity: 0.6
  },
  dateCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  dateCardLeft: {
    marginRight: 12
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dateCardRight: {
    flex: 1,
    gap: 6
  },
  dateCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  dateCardDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3
  },
  dateSeparator: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  dateCardTime: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)'
  },
  dateCardFullDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500'
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    maxHeight: '75%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#E5E5EA'
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  modalBody: {
    flexGrow: 0,
    maxHeight: 500
  },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  monthDisplay: {
    flex: 1
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
    letterSpacing: -0.2
  },

  // Calendar Grid
  calendarContainer: {
    paddingHorizontal: 10
  },
  dayHeadersRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4
  },
  dayHeaderCell: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12
  },
  dayCell: {
    width: '13.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    position: 'relative'
  },
  dayCellSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#9F2241'
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  todayIndicator: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    bottom: 3
  },

  // Quick Select
  quickSelectContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10
  },
  quickSelectLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 6
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#F9F9F9'
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1
  },

  // Time Picker
  timePickerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  timeSelectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2
  },
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
    height: 200
  },
  timeInputGroup: {
    flex: 1,
    gap: 4
  },
  timeInputLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center'
  },
  timeScroll: {
    height: 160,
    borderRadius: 10,
    overflow: 'hidden'
  },
  timeOption: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8
  },
  timeOptionSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  timeSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    marginHorizontal: 4
  },
  timeSeparatorText: {
    fontSize: 28,
    fontWeight: '700'
  },
  timePreview: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    marginBottom: 16
  },
  timePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  timePreviewTime: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2
  }
});
