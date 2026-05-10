import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { api, Dono } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';
import NativeMap from '../components/NativeMap';

export default function MappaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [doni, setDoni] = useState<Dono[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posizione, setPosizione] = useState<{ latitude: number; longitude: number } | null>(null);

  const carica = useCallback(async () => {
    try {
      const res = await api.get<Dono[]>('/doni');
      setDoni((res.data || []).filter((d) => d.lat && d.lng));
    } catch {
      setDoni([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setPosizione({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {
        // ignore
      }
      await carica();
    })();
  }, [carica]);

  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica])
  );

  const onRefresh = () => {
    setRefreshing(true);
    carica();
  };

  const distanzaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const apriDono = (dono: Dono) => {
    router.push(`/dono/${dono.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loading}>Caricamento mappa...</Text>
      </SafeAreaView>
    );
  }

  const altrui = doni.filter((d) => d.user_id !== user?.id);
  const mieiCount = doni.length - altrui.length;

  const initialRegion = posizione
    ? { latitude: posizione.latitude, longitude: posizione.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : doni.length > 0
    ? { latitude: doni[0].lat, longitude: doni[0].lng, latitudeDelta: 1, longitudeDelta: 1 }
    : { latitude: 41.9028, longitude: 12.4964, latitudeDelta: 5, longitudeDelta: 5 };

  return (
    <SafeAreaView style={styles.safe} testID="mappa-screen">
      <View style={styles.header}>
        <TouchableOpacity testID="mappa-back-btn" onPress={() => router.back()}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cerca le gioie vicino a te 🔍</Text>
        <Text style={styles.subtitle}>
          {altrui.length > 0
            ? `Trovate ${altrui.length} gioie disponibili!`
            : 'Nessuna gioia disponibile al momento'}
          {mieiCount > 0 ? ` (e ${mieiCount} tue gioie)` : ''}
        </Text>
      </View>

      {Platform.OS === 'web' ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ padding: SPACING.l }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {doni.length === 0 ? (
            <Text style={styles.empty}>Nessuna gioia ancora 💙</Text>
          ) : (
            doni.map((d) => {
              const isMine = d.user_id === user?.id;
              const dist =
                posizione && d.lat && d.lng ? distanzaKm(posizione.latitude, posizione.longitude, d.lat, d.lng) : null;
              return (
                <TouchableOpacity
                  key={d.id}
                  testID={`dono-card-${d.id}`}
                  style={[styles.donoCard, isMine && { borderColor: COLORS.error }]}
                  onPress={() => apriDono(d)}
                >
                  {d.foto_base64_list?.[0] ? (
                    <Image source={{ uri: d.foto_base64_list[0] }} style={styles.donoImg} />
                  ) : (
                    <View style={[styles.donoImg, { backgroundColor: COLORS.lightGray }]} />
                  )}
                  <View style={{ flex: 1, padding: SPACING.m }}>
                    <Text style={styles.donoTitle}>{d.titolo}</Text>
                    <Text style={styles.donoCategoria}>{d.categoria}</Text>
                    {!!d.donatore_nome && (
                      <Text style={styles.donoDonatore}>
                        {isMine ? '🔴 La tua gioia' : `🙂 ${d.donatore_nome}${d.donatore_citta ? ` · ${d.donatore_citta}` : ''}`}
                      </Text>
                    )}
                    {dist && <Text style={styles.donoDist}>📍 ~{dist} km</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        <NativeMap
          doni={doni}
          myUserId={user?.id}
          initialRegion={initialRegion}
          onMarkerPress={apriDono}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loading: { marginTop: SPACING.s, color: COLORS.textMedium },
  header: { padding: SPACING.l, paddingBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16, marginBottom: SPACING.s },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textMedium, marginTop: 4 },
  list: { flex: 1 },
  empty: { textAlign: 'center', color: COLORS.textMedium, marginTop: SPACING.xl, fontSize: 16 },
  donoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    overflow: 'hidden',
    marginBottom: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  donoImg: { width: 100, height: 100 },
  donoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  donoCategoria: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  donoDonatore: { fontSize: 13, color: COLORS.textMedium, marginTop: 4 },
  donoDist: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
});
