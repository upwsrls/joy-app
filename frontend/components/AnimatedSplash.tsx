import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Heart visual size (in dp)
const HEART_SIZE = Math.min(SCREEN_W, SCREEN_H) * 0.48;
const SPARKLE_ORBIT_R = HEART_SIZE * 0.55;

type SparkleProps = {
  progress: Animated.SharedValue<number>;
  angleOffset: number; // radians
  size: number;
  color: string;
};

function Sparkle({ progress, angleOffset, size, color }: SparkleProps) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const angle = angleOffset + t * Math.PI * 2;
    const x = Math.cos(angle) * SPARKLE_ORBIT_R;
    const y = Math.sin(angle) * SPARKLE_ORBIT_R * 0.45; // ellipse orbit
    // Fade in/out across cycle so they "twinkle"
    const op = interpolate(t, [0, 0.15, 0.5, 0.85, 1], [0, 1, 0.5, 1, 0]);
    const scale = interpolate(t, [0, 0.5, 1], [0.6, 1.1, 0.6]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity: op,
    };
  });

  return (
    <Animated.View
      style={[
        styles.sparkle,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.8,
          shadowRadius: size,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </Animated.View>
  );
}

export type AnimatedSplashProps = {
  onFinish: () => void;
  /** Optional total duration override (ms). Default ~2600ms. */
  duration?: number;
};

export default function AnimatedSplash({
  onFinish,
  duration = 2600,
}: AnimatedSplashProps) {
  // Heart entrance + idle pulse
  const heartScaleIn = useSharedValue(0.35);
  const heartOpacity = useSharedValue(0);
  const heartPulse = useSharedValue(1);

  // Wordmark
  const joyOpacity = useSharedValue(0);
  const joyY = useSharedValue(30);
  const joyScale = useSharedValue(0.85);

  // Tagline
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(14);

  // Overall container fade
  const containerOpacity = useSharedValue(1);

  // Sparkle progress (looping 0→1)
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);
  const sparkle4 = useSharedValue(0);

  useEffect(() => {
    // 1) Heart entrance (0 → 600ms)
    heartOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    heartScaleIn.value = withSpring(1, {
      damping: 9,
      stiffness: 90,
      mass: 0.9,
    });

    // 2) Heart idle pulse (starts at 750ms, repeats)
    heartPulse.value = withDelay(
      750,
      withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 700,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1.0, {
            duration: 700,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );

    // 3) JOY wordmark (450ms)
    joyOpacity.value = withDelay(
      450,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    joyY.value = withDelay(
      450,
      withSpring(0, { damping: 11, stiffness: 120 }),
    );
    joyScale.value = withDelay(
      450,
      withSpring(1, { damping: 9, stiffness: 110 }),
    );

    // 4) Tagline (950ms)
    taglineOpacity.value = withDelay(
      950,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    taglineY.value = withDelay(
      950,
      withSpring(0, { damping: 12, stiffness: 110 }),
    );

    // 5) Sparkles orbit loop
    sparkle1.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
    sparkle2.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 3600, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    sparkle3.value = withDelay(
      900,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    sparkle4.value = withDelay(
      1300,
      withRepeat(
        withTiming(1, { duration: 3400, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    // 6) Fade out the whole overlay before finishing
    const fadeStart = Math.max(800, duration - 500);
    containerOpacity.value = withDelay(
      fadeStart,
      withTiming(
        0,
        { duration: 500, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(onFinish)();
          }
        },
      ),
    );
  }, []);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScaleIn.value * heartPulse.value }],
  }));

  const joyStyle = useAnimatedStyle(() => ({
    opacity: joyOpacity.value,
    transform: [
      { translateY: joyY.value },
      { scale: joyScale.value },
    ],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.container, containerStyle]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#FF8A80', '#FFB199', '#FFE5D9', '#FFF8F0']}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        {/* Heart + orbiting sparkles */}
        <View style={styles.heartArea}>
          <Animated.View style={[styles.heartWrapper, heartStyle]}>
            <Image
              source={require('../assets/images/heart-only.png')}
              style={{ width: HEART_SIZE, height: HEART_SIZE }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Orbiting sparkle dots, positioned at center of heartArea */}
          <View pointerEvents="none" style={styles.sparkleAnchor}>
            <Sparkle progress={sparkle1} angleOffset={0} size={10} color="#FFE7A3" />
            <Sparkle progress={sparkle2} angleOffset={Math.PI * 0.7} size={7} color="#FFFFFF" />
            <Sparkle progress={sparkle3} angleOffset={Math.PI * 1.3} size={9} color="#FFD93D" />
            <Sparkle progress={sparkle4} angleOffset={Math.PI * 1.85} size={6} color="#FFFFFF" />
          </View>
        </View>

        <Animated.Text style={[styles.joy, joyStyle]}>JOY</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Risvegliamo il bene
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  heartArea: {
    width: HEART_SIZE * 1.7,
    height: HEART_SIZE * 1.7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    // No View-level shadow here: RN renders it as a square halo behind
    // transparent PNGs. The heart PNG already has its own baked-in shadow.
  },
  sparkleAnchor: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
  },
  sparkle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  joy: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(120, 30, 50, 0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC4650',
    letterSpacing: 0.6,
    marginTop: 14,
  },
});
