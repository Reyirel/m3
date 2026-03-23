// components/AnimatedNumber.js
// Contador animado con setInterval — sin Animated API para evitar bloquear el hilo JS en web
import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';

export default function AnimatedNumber({
  value = 0,
  duration = 1000,
  style = {},
  prefix = '',
  suffix = '',
  decimals = 0,
  formatNumber = true,
  delay = 0,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const endValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const startValue = prevValue.current;
    prevValue.current = endValue;

    if (startValue === endValue) return;

    let timeoutId;
    let intervalId;

    timeoutId = setTimeout(() => {
      const steps = Math.max(1, Math.round(duration / 16)); // ~60fps
      const diff = endValue - startValue;
      let currentStep = 0;

      intervalId = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 2);
        setDisplayValue(startValue + diff * eased);
        if (currentStep >= steps) {
          setDisplayValue(endValue);
          clearInterval(intervalId);
        }
      }, duration / steps);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [value, duration, delay]);

  const format = (num) => {
    let str = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
    if (formatNumber) {
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      str = parts.join('.');
    }
    return `${prefix}${str}${suffix}`;
  };

  return <Text style={[styles.defaultText, style]}>{format(displayValue)}</Text>;
}

const styles = StyleSheet.create({
  defaultText: { fontSize: 24, fontWeight: '700', color: '#333' },
});
