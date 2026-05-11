import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../lib/theme';
import JoyButton from './JoyButton';

type Props = {
  emoji: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  variant?: 'centered' | 'card';
  testID?: string;
};

export default function EmptyState({
  emoji,
  title,
  description,
  ctaLabel,
  onCta,
  variant = 'centered',
  testID,
}: Props) {
  return (
    <View
      testID={testID || 'empty-state'}
      style={[styles.wrap, variant === 'card' && styles.card]}
    >
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!ctaLabel && onCta && (
        <View style={{ marginTop: SPACING.l, minWidth: 220 }}>
          <JoyButton label={ctaLabel} onPress={onCta} size="md" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    flex: 0,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    marginHorizontal: SPACING.l,
  },
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.secondaryBg,
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
  },
  emoji: { fontSize: 52 },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.m,
  },
});
