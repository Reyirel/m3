import React, { useState, useEffect, useCallback, memo, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticLight } from '../utils/haptics';

/**
 * SearchBar component with debounce functionality
 * ⚡ Optimizado con React.memo
 * 
 * @param {function} onSearch - Callback when search text changes (debounced)
 * @param {string} placeholder - Placeholder text
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 100)
 */
const SearchBar = memo(forwardRef(function SearchBar({ onSearch, placeholder = 'Buscar tareas...', debounceMs = 100 }, ref) {
  const { theme, isDark } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { setSearchText(''); onSearch(''); },
  }));

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(searchText);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [searchText, debounceMs, onSearch]);

  const handleClear = useCallback(() => {
    hapticLight();
    setSearchText('');
    onSearch('');
  }, [onSearch]);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDark ? theme.glass : theme.glassStrong,
        borderColor: isFocused
          ? theme.primary
          : (isDark ? theme.glassBorder : theme.glassBorderSubtle),
        borderWidth: isFocused ? 2 : 1,
        shadowColor: isFocused ? theme.primary : theme.glassShadow,
      },
    ]}>
      {/* Blur layer */}
      {Platform.OS !== 'web' && (
        <View style={[StyleSheet.absoluteFillObject, styles.blurLayer]}>
          <BlurView
            intensity={isDark ? 50 : 45}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.blurLayer,
            {
              backdropFilter: `blur(${isDark ? 14 : 10}px)`,
              WebkitBackdropFilter: `blur(${isDark ? 14 : 10}px)`,
            },
          ]}
        />
      )}
      {/* Top highlight stripe */}
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.72)' },
        ]}
      />
      {/* Rim glow */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.rim,
          { borderColor: theme.glassBorderSubtle },
        ]}
      />
      <Ionicons name="search" size={20} color={isFocused ? theme.primary : theme.textSecondary} style={styles.icon} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={searchText}
        onChangeText={setSearchText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Buscar"
        accessibilityRole="search"
      />
      {searchText.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.7}
          accessibilityLabel="Limpiar búsqueda"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}));

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginVertical: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  blurLayer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
    zIndex: 2,
  },
  rim: {
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 2,
  },
  icon: {
    marginRight: 12,
    zIndex: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    zIndex: 3,
  },
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
