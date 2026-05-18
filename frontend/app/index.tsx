import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../lib/theme';

export default function Index() {
  const router = useRouter();
  const { loading, user, profile, onboardingDone } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!profile) {
      router.replace('/profile-setup');
    } else if (!onboardingDone) {
      router.replace('/onboarding');
    } else {
      router.replace('/home');
    }
  }, [loading, user, profile, onboardingDone, router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <Text style={styles.logo}>✨ JOY ✨</Text>
      <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 16 }} />
      <Text style={styles.subtitle}>Caricamento del mondo JOY Share...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  subtitle: {
    marginTop: 16,
    color: COLORS.textMedium,
    fontSize: 14,
  },
});
