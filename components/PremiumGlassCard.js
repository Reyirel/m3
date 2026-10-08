// components/PremiumGlassCard.js
// Compatibilidad: las pantallas y componentes que aún piden esta tarjeta reciben la
// tarjeta sólida de la app (components/ui/Card.js). El desenfoque, los brillos y los
// degradados del diseño anterior ya no se dibujan; el código nuevo usa Card directamente.
import React from 'react';
import Card from './ui/Card';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumGlassCard({
  children,
  style,
  padding = 16,
  borderRadius = 16,
  glowEffect = false,
  glowColor = null,
  highlighted = false,
  pressable = false,
  onPress = null,
  accessible = true,
  accessibilityRole,
  accessibilityLabel = null,
  accessibilityHint = null,
  testID = null,
  customBorderColor = null,
  customBackgroundColor = null,
}) {
  const { theme } = useTheme();
  return (
    <Card
      style={style}
      padding={padding}
      borderRadius={borderRadius}
      highlighted={highlighted}
      // El antiguo "glow" marcaba foco, error o énfasis: ahora es el color del borde
      accentColor={glowEffect ? (glowColor || theme.primary) : null}
      backgroundColor={customBackgroundColor}
      borderColor={customBorderColor}
      onPress={pressable ? onPress : null}
      accessible={accessible}
      accessibilityRole={accessibilityRole === 'none' ? undefined : accessibilityRole}
      accessibilityLabel={accessibilityLabel || undefined}
      accessibilityHint={accessibilityHint || undefined}
      testID={testID || undefined}
    >
      {children}
    </Card>
  );
}
