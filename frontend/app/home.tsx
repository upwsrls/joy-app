import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut, setOnboardingDone } = useAuth();

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const seeOnboarding = async () => {
    await setOnboardingDone(false);
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={styles.safe} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {profile?.foto_base64 ? (
              <Image source={{ uri: profile.foto_base64 }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarPlaceholder}>🙂</Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.m }}>
            <Text style={styles.greeting}>Ciao {profile?.nome || 'amico'} 👋</Text>
            {!!profile?.citta && <Text style={styles.greetingSub}>📍 {profile.citta}</Text>}
          </View>
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
        </View>

        <View style={styles.bottom}>
          <Text style={styles.tagline}>Il segreto di vivere felici, è DONARE.</Text>
          <TouchableOpacity testID="home-onboarding-btn" onPress={seeOnboarding}>
            <Text style={styles.linkText}>Scopri lo scopo dell'app</Text>
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
  bottom: { alignItems: 'center', marginTop: SPACING.xl },
  tagline: { fontSize: 14, color: COLORS.textDark, fontWeight: '600', textAlign: 'center' },
  linkText: { color: COLORS.primary, fontWeight: '600', marginTop: SPACING.s },
  logoutText: { color: COLORS.textMedium, fontSize: 13 },
});
