import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

const PAGES = [
  {
    title: 'Benvenuto nel mondo JOY Share 💙',
    subtitle:
      'Dona o ricevi cibo, giochi, libri, vestiti o qualsiasi altra cosa per chi ne ha bisogno...\ntutto gratis e vicino a casa!',
    emoji: '✨🎁🧸',
    image: 'https://static.prod-images.emergentagent.com/jobs/c007779d-eef2-4c61-8337-0e20e51529de/images/e17c5752d80c0ce9b8cd552e0822d67f41a83df9dc4ec8c5cd7d8bdceb412d02.png',
  },
  {
    title: 'Dona una gioia 🎁',
    subtitle:
      'Hai qualcosa che non usi più?\nFai una foto, descrivilo e indica dove si trova.\nUna altra famiglia lo ritirerà con un sorriso!',
    emoji: '📸🏡',
    image: 'https://static.prod-images.emergentagent.com/jobs/c007779d-eef2-4c61-8337-0e20e51529de/images/e17c5752d80c0ce9b8cd552e0822d67f41a83df9dc4ec8c5cd7d8bdceb412d02.png',
  },
  {
    title: 'Trova gioie vicino a te 🗺️',
    subtitle:
      'Guarda la mappa, tocca un pin blu,\nscrivi al donatore nella chat e concordate il ritiro.\nÈ semplice e sicuro.',
    emoji: '🔍💬',
    image: 'https://static.prod-images.emergentagent.com/jobs/c007779d-eef2-4c61-8337-0e20e51529de/images/9053154726c0959e2bab2ab77934e8768874dc68318e75646e105326c58a3e69.png',
  },
  {
    title: 'Pronto a diffondere sorrisi? 😊',
    subtitle: 'Ricorda: il segreto della felicità è DONARE.\nIniziamo questa magia insieme!',
    emoji: '💙🌟',
    image: 'https://static.prod-images.emergentagent.com/jobs/c007779d-eef2-4c61-8337-0e20e51529de/images/3d477de5983a970cc0f9bf111ec662da8ea3ab3c3c31b474dfc9036663b407a8.png',
    isLast: true,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingDone } = useAuth();
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const page = PAGES[index];

  const next = async () => {
    if (index < PAGES.length - 1) {
      setIndex(index + 1);
    } else {
      await setOnboardingDone(dontShow);
      router.replace('/home');
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="onboarding-screen">
      <View style={styles.content}>
        <Image source={{ uri: page.image }} style={styles.image} resizeMode="contain" />
        <Text style={styles.emoji}>{page.emoji}</Text>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.subtitle}>{page.subtitle}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && { backgroundColor: COLORS.primary, width: 24 }]}
            />
          ))}
        </View>

        {page.isLast && (
          <TouchableOpacity
            testID="onboarding-dont-show"
            style={styles.checkboxRow}
            onPress={() => setDontShow(!dontShow)}
          >
            <View style={[styles.checkbox, dontShow && styles.checkboxOn]}>
              {dontShow && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Non visualizzare più</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity testID="onboarding-next-btn" style={styles.primaryButton} onPress={next}>
          <Text style={styles.primaryButtonText}>{page.isLast ? 'Inizia! ✨' : 'Avanti →'}</Text>
        </TouchableOpacity>

        {index > 0 && !page.isLast && (
          <TouchableOpacity
            testID="onboarding-back-btn"
            onPress={() => setIndex(index - 1)}
            style={{ marginTop: SPACING.m }}
          >
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.l },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: 220, height: 220, marginBottom: SPACING.l },
  emoji: { fontSize: 36, marginBottom: SPACING.m },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.m,
  },
  bottom: { paddingBottom: SPACING.l },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.m },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    ...SHADOW,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  backText: { textAlign: 'center', color: COLORS.textMedium, fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxOn: { backgroundColor: COLORS.primary },
  checkboxMark: { color: COLORS.white, fontWeight: '900' },
  checkboxLabel: { color: COLORS.textDark, fontSize: 14 },
});
