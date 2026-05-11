import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';

type Props = { label?: string; testID?: string };

export default function NewBadge({ label = 'NUOVO', testID }: Props) {
  return (
    <View style={styles.wrap} testID={testID || 'new-badge'}>
      <Text style={styles.text}>✨ {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: 0.5,
  },
});
