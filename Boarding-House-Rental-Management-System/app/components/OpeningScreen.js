import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Logo from './Logo';
import { useTheme } from '../utils/ThemeContext';

export default function OpeningScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Logo
        variant="full"
        width={260}
        accessibilityLabel="Nads and Gracy Boarding House Management System"
      />
      <ActivityIndicator color={colors.primary} style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    marginTop: 24,
  },
});
