import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { COLORS } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
            animationDuration: 220,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
