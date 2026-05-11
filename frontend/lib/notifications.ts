/**
 * Push notifications setup for the JOY app.
 * - Works in dev builds (EAS). In Expo Go SDK 53+ remote push is disabled, but
 *   local notifications + the foreground handler still function partially.
 * - All helpers are platform-safe (no-op on web).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

// Show alerts even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

export async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'JOY',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
      sound: 'default',
    });
  } catch {
    // ignore
  }
}

/** Requests permission and returns the Expo push token, or null. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    // Push needs a real device
    return null;
  }
  await configureAndroidChannels();
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data || null;
  } catch {
    return null;
  }
}

/** Tries to register the token with the backend. Silent on failure. */
export async function registerTokenWithBackend(token: string | null) {
  try {
    await api.post('/users/me/push-token', { token });
  } catch {
    // ignore – best-effort
  }
}

/** Clear server-side token (on logout). */
export async function clearServerToken() {
  try {
    await api.delete('/users/me/push-token');
  } catch {
    // ignore
  }
}

/** Subscribe to notification taps. Returns an unsubscribe function. */
export function onNotificationTap(
  handler: (data: Record<string, any>) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = (resp?.notification?.request?.content?.data || {}) as Record<string, any>;
    handler(data);
  });
  return () => sub.remove();
}
