import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { api, Dono } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';
import NativeMap from '../components/NativeMap';
import FiltersBar from '../components/FiltersBar';
import EmptyState from '../components/EmptyState';
import NewBadge from '../components/NewBadge';
import { applyFilters, EMPTY_FILTERS, Filters, distanceKm } from '../lib/filters';
import { isRecent } from '../lib/dates';

type ViewMode = 'mappa' | 'lista';

export default function MappaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ q?: string }>();

  const [doni, setDoni] = useState<Dono[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posizione, setPosizione] = useState<{ latitude: number; longitude: number } | null>(null);

  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    q: typeof params?.q === 'string' ? params.q : '',
  }));

  // Default: sempre mappa (web e mobile). Leaflet gestisce il web, react-native-maps il mobile.
  const [viewMode, setViewMode] = useState<ViewMode>('mappa');

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

  const apriDono = (dono: Dono) => {
    router.push(`/dono/${dono.id}`);
  };

  const filteredDoni = useMemo(
    () => applyFilters(doni, posizione, filters),
    [doni, posizione, filters]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loading}>Caricamento mappa...</Text>
      </SafeAreaView>
    );
  }

  const altrui = filteredDoni.filter((d) => d.user_id !== user?.id);
  const mieiCount = filteredDoni.length - altrui.length;
  const totalCount = doni.length;

  const initialRegion = posizione
    ? { latitude: posizione.latitude, longitude: posizione.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    : filteredDoni.length > 0
    ? { latitude: filteredDoni[0].lat, longitude: filteredDoni[0].lng, latitudeDelta: 1, longitudeDelta: 1 }
    : doni.length > 0
    ? { latitude: doni[0].lat, longitude: doni[0].lng, latitudeDelta: 1, longitudeDelta: 1 }
    : { latitude: 41.9028, longitude: 12.4964, latitudeDelta: 5, longitudeDelta: 5 };

  const renderLista = () => (
    <ScrollView
      testID="lista-doni"
      style={styles.list}
      contentContainerStyle={{ padding: SPACING.l, paddingTop: SPACING.s }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {filteredDoni.length === 0 ? (
        totalCount === 0 ? (
          <EmptyState
            testID="mappa-empty-noche"
            emoji="🌱"
            title="Nessuna gioia ancora"
            description="Sii il primo a regalare una gioia alla tua comunità! Bastano un titolo, una foto e dove si trova."
            ctaLabel="Dona una gioia 🎁"
            onCta={() => router.push('/dona')}
          />
        ) : (
          <EmptyState
            testID="mappa-empty-filtered"
            emoji="🔎"
            title="Nessuna gioia con questi filtri"
            description="Prova a cambiare ricerca, categoria o distanza."
            ctaLabel="Pulisci filtri 🧹"
            onCta={() => setFilters(EMPTY_FILTERS)}
          />
        )
      ) : (
        filteredDoni.map((d) => {
          const isMine = d.user_id === user?.id;
          const isNew = isRecent(d.created_at, 48);
          const dist =
            posizione && d.lat && d.lng
              ? distanceKm(posizione.latitude, posizione.longitude, d.lat, d.lng)
              : null;
          return (
            <TouchableOpacity
              key={d.id}
              testID={`dono-card-${d.id}`}
              style={[styles.donoCard, isMine && { borderColor: COLORS.error }]}
              onPress={() => apriDono(d)}
            >
              {d.foto_urls?.[0] ? (
                <Image source={{ uri: d.foto_urls[0] }} style={styles.donoImg} />
              ) : (
                <View style={[styles.donoImg, { backgroundColor: COLORS.lightGray }]} />
              )}
              <View style={{ flex: 1, padding: SPACING.m }}>
                <View style={styles.donoHeaderRow}>
                  <Text style={styles.donoTitle} numberOfLines={1}>{d.titolo}</Text>
                  {isNew && !isMine && <NewBadge />}
                </View>
                <Text style={styles.donoCategoria}>{d.categoria}</Text>
                {!!d.donatore_nome && (
                  <Text style={styles.donoDonatore}>
                    {isMine
                      ? '🔴 La tua gioia'
                      : `🙂 ${d.donatore_nome}${d.donatore_citta ? ` · ${d.donatore_citta}` : ''}`}
                  </Text>
                )}
                {dist !== null && (
                  <Text style={styles.donoDist}>📍 ~{dist.toFixed(1)} km</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} testID="mappa-screen">
      <View style={styles.header}>
        <TouchableOpacity testID="mappa-back-btn" onPress={() => router.back()}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cerca le gioie vicino a te 🔍</Text>
        <Text style={styles.subtitle}>
          {altrui.length > 0
            ? `Trovate ${altrui.length} gioie disponibili`
            : 'Nessuna gioia con questi filtri'}
          {mieiCount > 0 ? ` (e ${mieiCount} tue)` : ''}
        </Text>
      </View>

      <FiltersBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        hasUserPos={!!posizione}
      />

      {/* Mappa/Lista toggle - visibile su tutte le piattaforme */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          testID="toggle-mappa"
          style={[styles.toggleBtn, viewMode === 'mappa' && styles.toggleActive]}
          onPress={() => setViewMode('mappa')}
        >
          <Text style={[styles.toggleText, viewMode === 'mappa' && styles.toggleTextActive]}>
            📍 Mappa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="toggle-lista"
          style={[styles.toggleBtn, viewMode === 'lista' && styles.toggleActive]}
          onPress={() => setViewMode('lista')}
        >
          <Text style={[styles.toggleText, viewMode === 'lista' && styles.toggleTextActive]}>
            📋 Lista
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'lista' ? (
        renderLista()
      ) : (
        <NativeMap
          doni={filteredDoni}
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
  header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.l, paddingBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16, marginBottom: SPACING.s },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textMedium, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.s,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleText: { color: COLORS.textDark, fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: COLORS.white },
  list: { flex: 1 },
  empty: { textAlign: 'center', color: COLORS.textDark, marginTop: SPACING.s, fontSize: 16, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: SPACING.xl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.s },
  emptyHint: { textAlign: 'center', color: COLORS.textMedium, marginTop: 4, fontSize: 13 },
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
  donoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  donoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  donoCategoria: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  donoDonatore: { fontSize: 13, color: COLORS.textMedium, marginTop: 4 },
  donoDist: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
});
