// components/SafeAreaView.js
// Wrapper de SafeArea compatible con web, iOS y Android
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SafeAreaWrapper({
  children,
  style = {},
  edges = ['bottom'],
  backgroundColor,
}) {
  const nativeInsets = useSafeAreaInsets();
  const insets = Platform.OS !== 'web' ? nativeInsets : { top: 0, bottom: 0, left: 0, right: 0 };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: edges.includes('top') ? insets.top : 0,
      paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      paddingLeft: edges.includes('left') ? insets.left : 0,
      paddingRight: edges.includes('right') ? insets.right : 0,
      backgroundColor: backgroundColor || 'transparent',
      ...style,
    },
  });

  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}
