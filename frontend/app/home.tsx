import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut, setOnboardingDone } = useAuth();
  const [searchQ, setSearchQ] = useState('');
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await api.get<{ messages: number }>('/notifiche/unread-count');
      setUnread(r.data?.messages || 0);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
    }, [fetchUnread])
  );

  useEffect(() => {
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const seeOnboarding = async () => {
    await setOnboardingDone(false);
    router.push('/onboarding');
  };

  const cercaGioie = () => {
    Keyboard.dismiss();
    const q = searchQ.trim();
    if (q) {
      router.push({ pathname: '/mappa', params: { q } });
    } else {
      router.push('/mappa');
    }
  };

  const apriMieGioie = () => {
    router.push({ pathname: '/mappa', params: { mine: '1' } });
  };

  return (
    <SafeAreaView style={styles.safe} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity
            testID="home-profile-btn"
            style={styles.avatar}
            onPress={() => router.push('/profilo-mio')}
          >
            {profile?.foto_url ? (
              <Image source={{ uri: profile.foto_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarPlaceholder}>🙂</Text>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={styles.greeting}>Ciao {profile?.nome || 'amico'} 👋</Text>
            {!!profile?.citta && <Text style={styles.greetingSub}>📍 {profile.citta}</Text>}
          </View>
          <TouchableOpacity
            testID="home-profile-icon"
            onPress={() => router.push('/profilo-mio')}
            style={styles.gearBtn}
          >
            <Text style={styles.gearText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeBox}>
          <Text style={styles.welcomeLine1}>Benvenuto nel</Text>
          <Text style={styles.welcomeLine2}>Mondo JOY</Text>
          <Text style={styles.welcomeLine3}>Risvegliamo il bene che è in</Text>
          <Text style={styles.welcomeLine4}>NOI</Text>
          <Text style={styles.welcomeLine3}>donando un</Text>
          <Text style={styles.welcomeLine4}>SORRISO</Text>
        </View>

        <View style={styles.actionsContainer}>
          {/* Unread banner: shown only if there are unread chat messages */}
          {unread > 0 && (
            <TouchableOpacity
              testID="home-unread-banner"
              style={styles.unreadBanner}
              onPress={() => router.push('/chat-list')}
            >
              <Text style={styles.unreadEmoji}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.unreadTitle}>
                  Hai {unread} {unread === 1 ? 'nuovo messaggio' : 'nuovi messaggi'}
                </Text>
                <Text style={styles.unreadSub}>Tocca per aprire le chat</Text>
              </View>
              <Text style={styles.unreadArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* Quick search bar -> apre la Mappa con il filtro applicato */}
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              testID="home-search-input"
              style={styles.searchInput}
              placeholder="Cerca una gioia (es. libri, giochi…)"
              placeholderTextColor={COLORS.textMedium}
              value={searchQ}
              onChangeText={setSearchQ}
              onSubmitEditing={cercaGioie}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              testID="home-search-go"
              onPress={cercaGioie}
              style={styles.searchGoBtn}
            >
              <Text style={styles.searchGoText}>Cerca</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="home-dona-btn"
            style={[styles.bigCard, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/dona')}
          >
            <Text style={[styles.cardEmoji, { fontSize: 44 }]}>🎁</Text>
            <Text style={[styles.bigCardTitle, { color: COLORS.white }]}>Dona</Text>
            <Text style={[styles.bigCardText, { color: '#E0F2FE' }]}>
              Regala una gioia a qualcuno
            </Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity
              testID="home-mappa-btn"
              style={[styles.smallCard, { marginRight: SPACING.s }]}
              onPress={() => router.push('/mappa')}
            >
              <Text style={styles.cardEmoji}>🧺</Text>
              <Text style={styles.cardTitle}>Ricevi</Text>
              <Text style={styles.cardText}>Esplora la mappa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="home-chat-btn"
              style={[styles.smallCard, { marginLeft: SPACING.s }]}
              onPress={() => router.push('/chat-list')}
            >
              <Text style={styles.cardEmoji}>💬</Text>
              <Text style={styles.cardTitle}>Chat</Text>
              <Text style={styles.cardText}>Le tue conversazioni</Text>
            </TouchableOpacity>
          </View>

          {/* Le mie gioie pubblicate → mappa filtrata sui propri doni */}
          <TouchableOpacity
            testID="home-mie-gioie-btn"
            style={styles.mineCard}
            onPress={apriMieGioie}
          >
            <Text style={styles.mineEmoji}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.mineTitle}>Le mie gioie pubblicate</Text>
              <Text style={styles.mineText}>Vedi solo i tuoi doni sulla mappa</Text>
            </View>
            <Text style={styles.mineArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.tagline}>Il segreto di vivere felici, è DONARE.</Text>
          <TouchableOpacity testID="home-onboarding-btn" onPress={seeOnboarding}>
            <Text style={styles.linkText}>Scopri lo scopo dell&apos;app</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="home-logout-btn" onPress={onLogout} style={{ marginTop: SPACING.m }}>
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l, paddingBottom: SPACING.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gearBtn: { padding: 8 },
  gearText: { fontSize: 24 },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 28 },
  greeting: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  greetingSub: { fontSize: 13, color: COLORS.textMedium, marginTop: 2 },
  welcomeBox: { alignItems: 'center', marginVertical: SPACING.m },
  welcomeLine1: { fontSize: 16, color: COLORS.textMedium, textAlign: 'center' },
  welcomeLine2: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: SPACING.s,
  },
  welcomeLine3: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center' },
  welcomeLine4: { fontSize: 24, fontWeight: '900', color: COLORS.primary, lineHeight: 28 },
  actionsContainer: { marginTop: SPACING.m },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.large,
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  unreadEmoji: { fontSize: 28, marginRight: SPACING.m },
  unreadTitle: { fontSize: 15, fontWeight: '900', color: COLORS.textDark },
  unreadSub: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
  unreadArrow: { fontSize: 26, fontWeight: '700', color: COLORS.primary, marginLeft: SPACING.s },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 12,
    minHeight: 48,
    marginBottom: SPACING.m,
    ...SHADOW,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    paddingVertical: 10,
  },
  searchGoBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.medium,
    minHeight: 36,
    justifyContent: 'center',
  },
  searchGoText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  bigCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    ...SHADOW,
  },
  bigCardTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, marginTop: SPACING.s },
  bigCardText: { fontSize: 14, color: COLORS.textMedium, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: SPACING.m },
  smallCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
    ...SHADOW,
  },
  cardEmoji: { fontSize: 32, marginBottom: 6 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  cardText: { fontSize: 12, color: COLORS.textMedium, marginTop: 2, textAlign: 'center' },
  mineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.m,
    marginTop: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.error,
    ...SHADOW,
  },
  mineEmoji: { fontSize: 32, marginRight: SPACING.m },
  mineTitle: { fontSize: 16, fontWeight: '800', color: COLORS.error },
  mineText: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
  mineArrow: { fontSize: 28, color: COLORS.error, fontWeight: '700', marginLeft: SPACING.s },
  bottom: { alignItems: 'center', marginTop: SPACING.xl },
  tagline: { fontSize: 14, color: COLORS.textDark, fontWeight: '600', textAlign: 'center' },
  linkText: { color: COLORS.primary, fontWeight: '600', marginTop: SPACING.s },
  logoutText: { color: COLORS.textMedium, fontSize: 13 },
});
