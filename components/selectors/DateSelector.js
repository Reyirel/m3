/**
 * DateSelector.js
 * Dos filas compactas (Fecha + Hora) que abren el selector del dispositivo:
 *   - iOS / Android: DateTimePicker nativo
 *   - Web: el selector de fecha y hora del propio navegador
 */

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';

const fmt = (date, mode) => {
  if (!date) return '—';
  if (mode === 'date') return new Date(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const pad = (n) => String(n).padStart(2, '0');
// Valores en hora local con el formato que usan <input type="date"> y <input type="time">
const toDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toTimeInput = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

// El input del navegador queda encima de la fila, invisible: el clic lo recibe él
// y el navegador abre su propio selector.
const webInputStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  border: 0,
  padding: 0,
  margin: 0,
};

export default function DateSelector({
  value = new Date(),
  onChange = () => {},
  disabled = false,
  label = 'Vencimiento',
  showTime = true,
  minimumDate = null,
}) {
  const { theme, isDark } = useTheme();
  const [pickerMode, setPickerMode] = useState(null); // 'date' | 'time' | null
  const [temp, setTemp]             = useState(new Date(value || Date.now()));
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);

  const isWeb = Platform.OS === 'web';
  const current = new Date(value || Date.now());

  const openPicker = (mode) => {
    if (disabled) return;
    if (isWeb) {
      // Abrir el selector del navegador (showPicker); en navegadores antiguos basta el foco
      const input = mode === 'date' ? dateInputRef.current : timeInputRef.current;
      try {
        if (input?.showPicker) input.showPicker();
        else input?.focus();
      } catch (_e) {
        input?.focus();
      }
      return;
    }
    setTemp(new Date(value || Date.now()));
    setPickerMode(mode);
  };

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (!selected) return;
    const next = new Date(temp);
    if (pickerMode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes());
    }
    setTemp(next);
    if (Platform.OS === 'android') onChange(next);
  };

  // Web: el input entrega "AAAA-MM-DD" o "HH:MM"; se conserva la otra mitad de la fecha
  const handleWebChange = (mode, text) => {
    if (!text) return;
    const next = new Date(value || Date.now());
    if (mode === 'date') {
      const [year, month, day] = text.split('-').map(Number);
      if (!year || !month || !day) return;
      next.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = text.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
      next.setHours(hours, minutes, 0, 0);
    }
    onChange(next);
  };

  const renderWebInput = (mode) => {
    if (!isWeb || disabled) return null;
    return React.createElement('input', {
      ref: mode === 'date' ? dateInputRef : timeInputRef,
      type: mode,
      value: mode === 'date' ? toDateInput(current) : toTimeInput(current),
      min: mode === 'date' && minimumDate ? toDateInput(new Date(minimumDate)) : undefined,
      onChange: (e) => handleWebChange(mode, e.target.value),
      onClick: () => openPicker(mode),
      'aria-label': mode === 'date' ? 'Fecha de vencimiento' : 'Hora de vencimiento',
      style: webInputStyle,
    });
  };

  const confirm = () => { onChange(temp); setPickerMode(null); };
  const cancel  = () => { setTemp(new Date(value || Date.now())); setPickerMode(null); };

  const rowStyle = (active) => [
    styles.row,
    {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
      borderColor: active
        ? theme.primary + '60'
        : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'),
      opacity: disabled ? 0.5 : 1,
    },
  ];

  return (
    <View style={styles.wrapper}>
      {/* Etiqueta */}
      <View style={styles.labelRow}>
        <Ionicons name="calendar" size={13} color={theme.warning} />
        <Text style={[styles.label, { color: isDark ? 'rgba(235,235,245,0.50)' : 'rgba(60,60,67,0.50)' }]}>
          {label}
        </Text>
      </View>

      <View style={styles.rows}>
        {/* Fecha */}
        <TouchableOpacity onPress={() => openPicker('date')} activeOpacity={0.75} style={rowStyle(pickerMode === 'date')}>
          <View style={[styles.iconWrap, { backgroundColor: '#FF950018' }]}>
            <Ionicons name="calendar-outline" size={17} color={theme.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: isDark ? 'rgba(235,235,245,0.45)' : 'rgba(60,60,67,0.45)' }]}>Fecha</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>{fmt(value, 'date')}</Text>
          </View>
          {!disabled && <Ionicons name="chevron-forward" size={16} color={isDark ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.30)'} />}
          {renderWebInput('date')}
        </TouchableOpacity>

        {/* Hora */}
        {showTime && (
          <TouchableOpacity onPress={() => openPicker('time')} activeOpacity={0.75} style={rowStyle(pickerMode === 'time')}>
            <View style={[styles.iconWrap, { backgroundColor: '#007AFF18' }]}>
              <Ionicons name="time-outline" size={17} color={theme.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: isDark ? 'rgba(235,235,245,0.45)' : 'rgba(60,60,67,0.45)' }]}>Hora</Text>
              <Text style={[styles.rowValue, { color: theme.text }]}>{fmt(value, 'time')}</Text>
            </View>
            {!disabled && <Ionicons name="chevron-forward" size={16} color={isDark ? 'rgba(235,235,245,0.30)' : 'rgba(60,60,67,0.30)'} />}
            {renderWebInput('time')}
          </TouchableOpacity>
        )}

        {/* Atajo hoy */}
        {!disabled && (
          <TouchableOpacity
            onPress={() => onChange(new Date())}
            activeOpacity={0.75}
            style={[styles.todayBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)' }]}
          >
            <Ionicons name="today-outline" size={14} color={theme.primary} />
            <Text style={[styles.todayText, { color: theme.primary }]}>Usar hoy</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* iOS: picker en modal */}
      {Platform.OS === 'ios' && pickerMode !== null && (
        <Modal visible transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={[styles.iosSheet, { backgroundColor: theme.background }]}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={cancel}>
                  <Text style={[styles.iosBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, { color: theme.text }]}>
                  {pickerMode === 'date' ? 'Seleccionar fecha' : 'Seleccionar hora'}
                </Text>
                <TouchableOpacity onPress={confirm}>
                  <Text style={[styles.iosBtnText, { color: theme.primary, fontWeight: '700' }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode={pickerMode}
                display="spinner"
                onChange={handleChange}
                minimumDate={pickerMode === 'date' ? minimumDate : undefined}
                locale="es-MX"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android: picker nativo directo */}
      {Platform.OS === 'android' && pickerMode !== null && (
        <DateTimePicker
          value={temp}
          mode={pickerMode}
          display="default"
          onChange={handleChange}
          minimumDate={pickerMode === 'date' ? minimumDate : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  rows: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5,
    // Necesario para que el input del navegador (web) quede contenido en la fila
    position: 'relative',
  },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  rowValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 16, borderWidth: 1,
  },
  todayText: { fontSize: 14, fontWeight: '600' },

  // iOS modal
  iosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  iosSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  iosHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  iosTitle: { fontSize: 16, fontWeight: '700' },
  iosBtnText: { fontSize: 16, fontWeight: '500' },
});
