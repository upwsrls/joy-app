import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';
import { tapLight } from '../lib/haptic';

type Props = {
  value: number; // 0-5; 0 = nessuna stella selezionata
  onChange?: (v: number) => void; // se presente -> tappabile
  size?: number;
  showLabel?: boolean;
  count?: number; // numero recensioni, mostrato dopo il numero (es. "4.8 (12)")
  testID?: string;
};

const FULL = '⭐';
const EMPTY = '☆';

export default function RatingStars({
  value,
  onChange,
  size = 22,
  showLabel = false,
  count,
  testID,
}: Props) {
  const interactive = !!onChange;
  return (
    <View style={styles.row} testID={testID || 'rating-stars'}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const ch = filled ? FULL : EMPTY;
        if (!interactive) {
          return (
            <Text key={i} style={[styles.star, { fontSize: size, opacity: filled ? 1 : 0.4 }]}>
              {ch}
            </Text>
          );
        }
        return (
          <Pressable
            key={i}
            testID={`star-${i}`}
            onPress={() => {
              tapLight();
              onChange!(i);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.star, { fontSize: size }]}>{ch}</Text>
          </Pressable>
        );
      })}
      {showLabel && value > 0 && (
        <Text style={styles.label}>
          {value.toFixed(1)}
          {typeof count === 'number' ? ` (${count})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  star: { marginRight: 2 },
  label: { marginLeft: 6, color: COLORS.textMedium, fontSize: 13, fontWeight: '700' },
});
