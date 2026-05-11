import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../lib/theme';
import { success as hapticSuccess } from '../../lib/haptic';
import JoyButton from '../../components/JoyButton';

export default function DonoCreatedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    titolo?: string;
    categoria?: string;
    foto?: string;
  }>();

  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const sparkScale = useSharedValue(0.8);

  useEffect(() => {
    hapticSuccess();
    // Confetti emoji: spring-in then gentle wobble
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });
    rotation.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    // Surrounding sparkles pulse
    sparkScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 900 }),
        withTiming(0.85, { duration: 900 })
      ),
      -1,
      true
    );
  }, [scale, rotation, sparkScale]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));
  const sparkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkScale.value }],
  }));

  const vediSullaMappa = () => {
    router.replace({
      pathname: '/mappa',
      params: params?.id ? { focus: String(params.id) } : {},
    });
  };

  const tornaHome = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.safe} testID="dono-created-screen">
      <View style={styles.center}>
        <Animated.Text style={[styles.sparkLeft, sparkStyle]}>✨</Animated.Text>
        <Animated.Text style={[styles.sparkRight, sparkStyle]}>✨</Animated.Text>
        <Animated.Text style={[styles.confetti, emojiStyle]}>🎉</Animated.Text>

        <Text style={styles.title}>Una nuova gioia è in viaggio!</Text>
        <Text style={styles.subtitle}>
          Grazie per aver condiviso. Qualcuno la troverà presto. 💛
        </Text>

        {/* Card riepilogo dono pubblicato */}
        {(params?.titolo || params?.foto) && (
          <View style={styles.card}>
            {!!params?.foto && (
              <Image source={{ uri: String(params.foto) }} style={styles.cardImg} />
            )}
            <View style={{ flex: 1, padding: SPACING.m }}>
              <Text style={styles.cardLabel}>Pubblicata</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {params?.titolo || 'La tua gioia'}
              </Text>
              {!!params?.categoria && (
                <Text style={styles.cardCat}>{String(params.categoria)}</Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <JoyButton
          testID="created-vedi-mappa"
          label="Vedi sulla mappa 📍"
          onPress={vediSullaMappa}
          variant="primary"
          size="lg"
        />
        <JoyButton
          testID="created-home"
          label="Torna alla home"
          onPress={tornaHome}
          variant="ghost"
          size="md"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.l },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confetti: {
    fontSize: 96,
    marginBottom: SPACING.l,
    ...(Platform.OS === 'web' ? { lineHeight: 110 } : null),
  },
  sparkLeft: { position: 'absolute', top: '20%', left: '15%', fontSize: 32 },
  sparkRight: { position: 'absolute', top: '28%', right: '15%', fontSize: 28 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SPACING.s,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.xl,
  },
  card: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    marginTop: SPACING.m,
    ...SHADOW,
  },
  cardImg: { width: 100, height: 100 },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  cardCat: { fontSize: 12, color: COLORS.textMedium, marginTop: 4 },
  bottom: { paddingBottom: SPACING.m },
});
