import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { COLORS } from '../lib/theme';
import { onNotificationTap } from '../lib/notifications';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep the native splash visible until our animated splash takes over.
// Wrapped in try/catch because on web (and a 2nd init) it may already be hidden.
try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // already hidden / unavailable on web — safe to ignore
}

function NotificationRouter() {
  const router = useRouter();
  useEffect(() => {
    const unsub = onNotificationTap((data) => {
      const t = data?.type;
      if (t === 'chat' && data?.conv_id) {
        router.push({ pathname: '/chat/[id]', params: { id: String(data.conv_id) } });
      } else if ((t === 'ritiro' || t === 'recensione' || t === 'nuova_gioia') && data?.dono_id) {
        router.push({ pathname: '/dono/[id]', params: { id: String(data.dono_id) } });
      }
    });
    return unsub;
  }, [router]);
  return null;
}

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  // Hide native splash as soon as JS is up — our React Native splash takes over.
  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 30);
    return () => clearTimeout(t);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NotificationRouter />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right',
            animationDuration: 220,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        />
        {!splashDone && <AnimatedSplash onFinish={handleSplashFinish} />}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
