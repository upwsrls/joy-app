import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, SHADOW } from '../lib/theme';
import { tapLight } from '../lib/haptic';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label?: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: string; // emoji prefix
  testID?: string;
  children?: React.ReactNode;
  haptic?: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export default function JoyButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  icon,
  testID,
  children,
  haptic = true,
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isDisabled = disabled || loading;
  const sizeStyle = SIZES[size];
  const variantStyle = VARIANTS[variant];
  const textColor =
    variant === 'primary' || variant === 'danger' ? COLORS.white : COLORS.primary;

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (isDisabled) return;
        if (haptic) tapLight();
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 14, stiffness: 220 });
        opacity.value = withTiming(0.85, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        opacity.value = withTiming(1, { duration: 120 });
      }}
      disabled={isDisabled}
      style={({ hovered }: any) => [
        styles.wrap,
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        Platform.OS === 'web' && hovered && !isDisabled && styles.hoverWeb,
      ]}
    >
      <AnimatedView
        style={[
          styles.base,
          sizeStyle.box,
          variantStyle.box,
          isDisabled && styles.disabled,
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : children ? (
          children
        ) : (
          <Text style={[styles.label, sizeStyle.text, { color: textColor }]} numberOfLines={1}>
            {icon ? `${icon} ` : ''}
            {label}
          </Text>
        )}
      </AnimatedView>
    </Pressable>
  );
}

const SIZES: Record<Size, { box: any; text: any }> = {
  sm: { box: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 }, text: { fontSize: 13 } },
  md: { box: { paddingVertical: 12, paddingHorizontal: 18, minHeight: 48 }, text: { fontSize: 15 } },
  lg: { box: { paddingVertical: 16, paddingHorizontal: 22, minHeight: 56 }, text: { fontSize: 17 } },
};

const VARIANTS: Record<Variant, { box: any }> = {
  primary: { box: { backgroundColor: COLORS.primary, ...SHADOW } },
  secondary: {
    box: {
      backgroundColor: COLORS.secondaryBg,
      borderWidth: 1.5,
      borderColor: COLORS.primary,
    },
  },
  danger: { box: { backgroundColor: COLORS.error } },
  ghost: { box: { backgroundColor: 'transparent' } },
};

const styles = StyleSheet.create({
  wrap: {
    marginVertical: SPACING.xs,
  },
  base: {
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  label: { fontWeight: '800' },
  hoverWeb: {
    transform: [{ translateY: -1 }],
  },
});
