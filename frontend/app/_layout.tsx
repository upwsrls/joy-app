import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { COLORS } from '../lib/theme';
import { onNotificationTap } from '../lib/notifications';

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
      </AuthProvider>
    </SafeAreaProvider>
  );
}
