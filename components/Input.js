// components/Input.js
// Input moderno con animaciones y validación visual
import { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function Input({ 
  label = '',
  placeholder = '',
  value = '',
  onChangeText = () => {},
  icon = null,
  error = '',
  success = false,
  disabled = false,
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? theme.error : isFocused ? theme.inputBorderFocused : theme.inputBorder;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: error ? theme.error : isFocused ? theme.primary : theme.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBackground,
            borderColor,
            borderWidth: 2,
          },
          disabled && styles.inputDisabled,
          multiline && { height: 100, alignItems: 'flex-start' },
        ]}
      >
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons 
              name={icon} 
              size={20} 
              color={error ? theme.error : isFocused ? theme.primary : theme.textSecondary} 
            />
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            { color: theme.inputText },
            multiline && { height: 80, textAlignVertical: 'top' },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          accessible={true}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint || (error ? `Error: ${error}` : undefined)}
          accessibilityState={{ disabled }}
          testID={testID}
        />

        {(error || success) && (
          <View style={styles.statusIcon}>
            <Ionicons 
              name={error ? "alert-circle" : "checkmark-circle"} 
              size={20} 
              color={error ? theme.error : theme.success} 
            />
          </View>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
  },
  statusIcon: {
    marginLeft: 10,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});
