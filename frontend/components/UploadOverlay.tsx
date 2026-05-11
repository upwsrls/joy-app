import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../lib/theme';

type Props = {
  visible: boolean;
  message?: string;
  emoji?: string;
};

export default function UploadOverlay({
  visible,
  message = 'Caricamento foto…',
  emoji = '☁️',
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    if (visible) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.95, { duration: 700, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.6, { duration: 700 })
        ),
        -1,
        true
      );
    }
  }, [visible, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Animated.Text style={[styles.emoji, animatedStyle]}>{emoji}</Animated.Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.progressTrack}>
            <ProgressBar />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProgressBar() {
  const x = useSharedValue(-60);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(220, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [x]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return <Animated.View style={[styles.progressBar, style]} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.l,
  },
  card: {
    width: 260,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.l,
    alignItems: 'center',
  },
  emoji: { fontSize: 60, marginBottom: SPACING.m },
  message: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: SPACING.m,
  },
  progressTrack: {
    width: 200,
    height: 6,
    backgroundColor: COLORS.secondaryBg,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
});
