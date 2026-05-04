/**
 * GlassmorphismShowcase.js
 * 🎨 Galería Interactiva de Glassmorphism
 * 
 * Demuestra todos los efectos, intensidades y variantes
 * disponibles en PremiumGlassCard
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import PremiumGlassCard from './PremiumGlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { GLASS_PRESETS } from '../../hooks/useGlassmorphism';

const INTENSITIES = ['soft', 'medium', 'strong', 'ultra'];
const VARIANTS = ['base', 'strong', 'light'];

export default function GlassmorphismShowcase() {
  const { theme, isDark } = useTheme();
  const [selectedIntensity, setSelectedIntensity] = useState('medium');
  const [selectedVariant, setSelectedVariant] = useState('base');
  const [showAllEffects, setShowAllEffects] = useState(false);

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1a1a1d' : '#f5f5f5' },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          🎨 Glassmorphism Showcase
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
          Explora todos los efectos y variantes disponibles
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsSection}>
        {/* Intensity Selector */}
        <View style={styles.selectorGroup}>
          <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
            Blur Intensity
          </Text>
          <View style={styles.buttonGroup}>
            {INTENSITIES.map((intensity) => (
              <TouchableOpacity
                key={intensity}
                style={[
                  styles.selectorButton,
                  selectedIntensity === intensity && styles.selectorButtonActive,
                  selectedIntensity === intensity && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setSelectedIntensity(intensity)}
              >
                <Text
                  style={[
                    styles.selectorButtonText,
                    selectedIntensity === intensity && { color: '#fff' },
                    selectedIntensity !== intensity && {
                      color: isDark ? '#aaa' : '#666',
                    },
                  ]}
                >
                  {intensity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Variant Selector */}
        <View style={styles.selectorGroup}>
          <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
            Variant
          </Text>
          <View style={styles.buttonGroup}>
            {VARIANTS.map((variant) => (
              <TouchableOpacity
                key={variant}
                style={[
                  styles.selectorButton,
                  selectedVariant === variant && styles.selectorButtonActive,
                  selectedVariant === variant && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setSelectedVariant(variant)}
              >
                <Text
                  style={[
                    styles.selectorButtonText,
                    selectedVariant === variant && { color: '#fff' },
                    selectedVariant !== variant && {
                      color: isDark ? '#aaa' : '#666',
                    },
                  ]}
                >
                  {variant}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Toggle All Effects */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            showAllEffects && { backgroundColor: theme.primary },
          ]}
          onPress={() => setShowAllEffects(!showAllEffects)}
        >
          <Text
            style={[
              styles.toggleButtonText,
              showAllEffects && { color: '#fff' },
            ]}
          >
            {showAllEffects ? '✓ All Effects Enabled' : 'Toggle All Effects'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Basic Preview */}
      <Section title="Basic Preview" isDark={isDark}>
        <PremiumGlassCard
          intensity={selectedIntensity}
          variant={selectedVariant}
          padding={20}
          borderRadius={16}
          style={{ minHeight: 120 }}
        >
          <Text
            style={[
              styles.previewText,
              { color: isDark ? '#fff' : '#000' },
            ]}
          >
            Intensity: {selectedIntensity}
          </Text>
          <Text
            style={[
              styles.previewSubtext,
              { color: isDark ? '#aaa' : '#666' },
            ]}
          >
            Variant: {selectedVariant}
          </Text>
        </PremiumGlassCard>
      </Section>

      {/* All Intensities Grid */}
      <Section title="All Intensities" isDark={isDark}>
        <View style={styles.grid}>
          {INTENSITIES.map((intensity) => (
            <View key={intensity} style={styles.gridItem}>
              <PremiumGlassCard
                intensity={intensity}
                padding={12}
                borderRadius={12}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  {intensity}
                </Text>
              </PremiumGlassCard>
            </View>
          ))}
        </View>
      </Section>

      {/* Glow Effects */}
      {showAllEffects && (
        <Section title="Glow Effects" isDark={isDark}>
          <View style={styles.grid}>
            {[theme.primary, theme.success, theme.warning, theme.danger].map(
              (color, idx) => (
                <View key={idx} style={styles.gridItem}>
                  <PremiumGlassCard
                    intensity="strong"
                    glowEffect
                    glowColor={color}
                    glowIntensity={0.25}
                    padding={16}
                    borderRadius={12}
                    style={{ minHeight: 100 }}
                  >
                    <Text
                      style={[
                        styles.gridLabel,
                        { color: isDark ? '#fff' : '#000' },
                      ]}
                    >
                      Glow
                    </Text>
                  </PremiumGlassCard>
                </View>
              )
            )}
          </View>
        </Section>
      )}

      {/* Highlighted State */}
      {showAllEffects && (
        <Section title="Highlighted State" isDark={isDark}>
          <View style={styles.comparisonRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.comparisonLabel,
                  { color: isDark ? '#fff' : '#000' },
                ]}
              >
                Normal
              </Text>
              <PremiumGlassCard
                intensity="medium"
                padding={16}
                borderRadius={12}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  Standard
                </Text>
              </PremiumGlassCard>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  styles.comparisonLabel,
                  { color: isDark ? '#fff' : '#000' },
                ]}
              >
                Highlighted
              </Text>
              <PremiumGlassCard
                intensity="medium"
                padding={16}
                borderRadius={12}
                highlighted={true}
                glowEffect
                glowColor={theme.primary}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  Featured
                </Text>
              </PremiumGlassCard>
            </View>
          </View>
        </Section>
      )}

      {/* Rim Glow Toggle */}
      {showAllEffects && (
        <Section title="Rim Glow Control" isDark={isDark}>
          <View style={styles.comparisonRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.comparisonLabel,
                  { color: isDark ? '#fff' : '#000' },
                ]}
              >
                No Rim
              </Text>
              <PremiumGlassCard
                intensity="medium"
                showRimGlow={false}
                padding={16}
                borderRadius={12}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  Flat
                </Text>
              </PremiumGlassCard>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  styles.comparisonLabel,
                  { color: isDark ? '#fff' : '#000' },
                ]}
              >
                With Rim
              </Text>
              <PremiumGlassCard
                intensity="medium"
                showRimGlow={true}
                padding={16}
                borderRadius={12}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  Depth
                </Text>
              </PremiumGlassCard>
            </View>
          </View>
        </Section>
      )}

      {/* Border Radius Samples */}
      {showAllEffects && (
        <Section title="Border Radius Samples" isDark={isDark}>
          <View style={styles.grid}>
            {[8, 12, 16, 20].map((radius) => (
              <View key={radius} style={styles.gridItem}>
                <PremiumGlassCard
                  intensity="medium"
                  padding={12}
                  borderRadius={radius}
                  style={{ minHeight: 100 }}
                >
                  <Text
                    style={[
                      styles.gridLabel,
                      { color: isDark ? '#fff' : '#000' },
                    ]}
                  >
                    {radius}px
                  </Text>
                </PremiumGlassCard>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Presets */}
      <Section title="Presets" isDark={isDark}>
        <View style={styles.grid}>
          {Object.keys(GLASS_PRESETS).map((presetName) => (
            <View key={presetName} style={styles.gridItem}>
              <PremiumGlassCard
                intensity={GLASS_PRESETS[presetName].intensity}
                padding={12}
                borderRadius={GLASS_PRESETS[presetName].borderRadius}
                style={{ minHeight: 100 }}
              >
                <Text
                  style={[
                    styles.gridLabel,
                    { color: isDark ? '#fff' : '#000' },
                  ]}
                >
                  {presetName}
                </Text>
              </PremiumGlassCard>
            </View>
          ))}
        </View>
      </Section>

      {/* Documentation */}
      <Section title="Quick Tips" isDark={isDark}>
        <View
          style={[
            styles.tipsBox,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <TipItem text="💡 Use 'medium' intensity for most cards" isDark={isDark} />
          <TipItem text="⚡ Use 'soft' for buttons and small elements" isDark={isDark} />
          <TipItem text="🔥 Use 'strong' or 'ultra' for featured content" isDark={isDark} />
          <TipItem text="✨ Enable glow only for high-priority items" isDark={isDark} />
          <TipItem text="🎯 Highlighted state for focused elements" isDark={isDark} />
        </View>
      </Section>

      {/* Space at bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/**
 * Section Component
 */
function Section({ title, isDark, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * Tip Item Component
 */
function TipItem({ text, isDark }) {
  return (
    <Text
      style={[
        styles.tipText,
        { color: isDark ? '#ccc' : '#333' },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  controlsSection: {
    marginBottom: 32,
  },
  selectorGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  selectorButtonActive: {
    borderColor: 'transparent',
  },
  selectorButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewSubtext: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    minHeight: 120,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsBox: {
    padding: 12,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    marginVertical: 6,
    lineHeight: 18,
  },
});
