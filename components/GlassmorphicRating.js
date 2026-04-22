/**
 * GlassmorphicRating.js
 * Glassmorphic star rating component with interactive feedback
 * 
 * Usage:
 * <GlassmorphicRating
 *   value={3.5}
 *   onValueChange={setRating}
 *   maxStars={5}
 *   label="Rate this task"
 *   readOnly={false}
 * />
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicRating = ({
  value = 0,
  onValueChange,
  maxStars = 5,
  label,
  icon = 'star',
  readOnly = false,
  size = 'medium', // 'small', 'medium', 'large'
  color,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const [hoverRating, setHoverRating] = useState(null);

  const sizeConfig = {
    small: { iconSize: 18, gap: 4, fontSize: 11 },
    medium: { iconSize: 24, gap: 6, fontSize: 12 },
    large: { iconSize: 32, gap: 8, fontSize: 14 },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const ratingColor = color || theme.primary;
  const displayRating = hoverRating ?? value;

  const handleStarPress = (index) => {
    if (!readOnly && onValueChange) {
      onValueChange(index + 1);
    }
  };

  const handleStarHover = (index) => {
    if (!readOnly) {
      setHoverRating(index + 1);
    }
  };

  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.labelText, { color: theme.text }]}>
            {label}
          </Text>
          <Text style={[styles.valueText, { color: ratingColor, fontSize: config.fontSize + 1 }]}>
            {displayRating.toFixed(1)}
          </Text>
        </View>
      )}

      {/* Stars */}
      <View
        style={[
          styles.starsContainer,
          { gap: config.gap },
        ]}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxStars }).map((_, index) => {
          const isFullStar = index < Math.floor(displayRating);
          const isHalfStar =
            index === Math.floor(displayRating) &&
            displayRating % 1 !== 0;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleStarPress(index)}
              onMouseEnter={() => handleStarHover(index)}
              activeOpacity={0.7}
              disabled={readOnly}
              style={styles.starButton}
            >
              <View
                style={[
                  styles.starWrapper,
                  {
                    opacity: readOnly ? 0.7 : 1,
                  },
                ]}
              >
                {/* Background star */}
                <Ionicons
                  name={icon}
                  size={config.iconSize}
                  color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  style={styles.starBase}
                />

                {/* Filled star */}
                {(isFullStar || isHalfStar) && (
                  <View
                    style={[
                      styles.starFill,
                      {
                        width: isHalfStar ? '50%' : '100%',
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={config.iconSize}
                      color={ratingColor}
                    />
                  </View>
                )}

                {/* Glow effect for hovered stars */}
                {hoverRating !== null && index < hoverRating && (
                  <View
                    style={[
                      styles.hoverGlow,
                      {
                        width: config.iconSize + 8,
                        height: config.iconSize + 8,
                        shadowColor: ratingColor,
                      },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rating text */}
      {value > 0 && (
        <Text style={[styles.ratingDescriptionText, { color: theme.textSecondary }]}>
          {getRatingDescription(displayRating, maxStars)}
        </Text>
      )}
    </View>
  );
};

const getRatingDescription = (rating, maxStars) => {
  const percentage = (rating / maxStars) * 100;
  if (percentage === 0) return '';
  if (percentage <= 20) return 'Poor';
  if (percentage <= 40) return 'Fair';
  if (percentage <= 60) return 'Good';
  if (percentage <= 80) return 'Very Good';
  return 'Excellent';
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  valueText: {
    fontWeight: '700',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 4,
  },
  starWrapper: {
    position: 'relative',
  },
  starBase: {
    position: 'absolute',
  },
  starFill: {
    overflow: 'hidden',
  },
  hoverGlow: {
    position: 'absolute',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingDescriptionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default GlassmorphicRating;
