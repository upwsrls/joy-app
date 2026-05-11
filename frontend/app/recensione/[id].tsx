import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../lib/theme';
import { success as hapticSuccess, error as hapticError } from '../../lib/haptic';
import RatingStars from '../../components/RatingStars';
import JoyButton from '../../components/JoyButton';

export default function RecensioneScreen() {
  const { id, donatore } = useLocalSearchParams<{ id: string; donatore?: string }>();
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [commento, setCommento] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels = ['', 'Pessima', 'Scarsa', 'Buona', 'Ottima', 'Fantastica!'];

  const submit = async () => {
    if (stars < 1) {
      Alert.alert('Tocca una stella', 'Aggiungi almeno una stella per inviare la recensione.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/recensioni', {
        dono_id: id,
        stars,
        commento: commento.trim(),
      });
      hapticSuccess();
      Alert.alert('Grazie! 💛', 'La tua recensione è stata inviata.');
      router.replace('/home');
    } catch (e: any) {
      hapticError();
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile inviare la recensione.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="recensione-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: SPACING.l }}>
          <Text style={styles.eyebrow}>Hai ritirato la gioia ✨</Text>
          <Text style={styles.title}>Com'è andata?</Text>
          <Text style={styles.subtitle}>
            Lascia una recensione{donatore ? ` a ${donatore}` : ''}. Il tuo feedback aiuta la
            comunità a fidarsi.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Valutazione</Text>
            <View style={styles.starsRow}>
              <RatingStars value={stars} onChange={setStars} size={42} testID="recensione-stars" />
            </View>
            {stars > 0 && (
              <Text style={styles.starsLabel}>{labels[stars]}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Commento (facoltativo)</Text>
            <TextInput
              testID="recensione-commento"
              style={styles.textarea}
              placeholder="Racconta come è andato lo scambio…"
              placeholderTextColor={COLORS.textMedium}
              value={commento}
              onChangeText={setCommento}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{commento.length}/500</Text>
          </View>

          <JoyButton
            testID="recensione-submit"
            label="Invia recensione"
            onPress={submit}
            loading={submitting}
            disabled={stars < 1}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  eyebrow: { color: COLORS.primary, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMedium, marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    marginTop: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMedium, marginBottom: SPACING.s },
  starsRow: { alignItems: 'center', marginVertical: SPACING.s },
  starsLabel: {
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 4,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    color: COLORS.textDark,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: SPACING.m,
    backgroundColor: COLORS.background,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.textMedium,
    marginTop: 4,
  },
});
