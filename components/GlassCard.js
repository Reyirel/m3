// components/GlassCard.js
// Compatibilidad: usa la tarjeta sólida de la app (components/ui/Card.js).
import React from 'react';
import Card from './ui/Card';

export default function GlassCard({ children, style, borderColor, padding = 16, borderRadius = 16 }) {
  return (
    <Card style={style} padding={padding} borderRadius={borderRadius} borderColor={borderColor}>
      {children}
    </Card>
  );
}
