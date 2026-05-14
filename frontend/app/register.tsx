import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const validateEmail = (text: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text.trim());

  const onRegister = async () => {
    if (!email.trim() || !emailValid || !password || password.length < 6) {
      return Alert.alert('Ops..', 'Controlla email e password (minimo 6 caratteri)');
    }
    if (!acceptedTerms) {
      return Alert.alert(
        'Termini richiesti',
        'Per creare l\u2019account devi accettare i Termini di Servizio e la Privacy Policy.',
      );
    }
    try {
      setLoading(true);
      await signUp(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Errore durante la registrazione';
      Alert.alert('Errore', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="register-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="register-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>

          <View style={styles.logoCloud}>
            <Text style={styles.logoText}>JOY</Text>
            <Text style={styles.logoEmoji}>✨</Text>
          </View>

          <Text style={styles.tagline}>Il mondo dove le cose belle non finiscono</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Crea il tuo profilo</Text>

            <View style={styles.inputContainer}>
              <TextInput
                testID="register-email-input"
                style={styles.input}
                placeholder="📧 Email"
                placeholderTextColor={COLORS.textMedium}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailValid(t.trim() === '' ? null : validateEmail(t));
                }}
              />
              {emailValid !== null && (
                <Text style={[styles.validationIcon, emailValid ? styles.valid : styles.invalid]}>
                  {emailValid ? '✅' : '❌'}
                </Text>
              )}
            </View>

            <View style={{ position: 'relative' }}>
              <TextInput
                testID="register-password-input"
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="🔑 Password (min 6 caratteri)"
                placeholderTextColor={COLORS.textMedium}
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                testID="register-toggle-pwd"
                onPress={() => setShowPwd(!showPwd)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="register-accept-terms"
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                {acceptedTerms && <Text style={styles.checkmark}>{'\u2713'}</Text>}
              </View>
              <Text style={styles.termsText}>
                Accetto i{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/legal/terms')}
                >
                  Termini
                </Text>
                {' '}e la{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/legal/privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="register-submit-button"
              style={[styles.primaryButton, !acceptedTerms && styles.primaryButtonDisabled]}
              onPress={onRegister}
              disabled={loading || !acceptedTerms}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{'\u2728'} Crea l\'account {'\u2728'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="register-go-login"
              onPress={() => router.replace('/login')}
              style={{ marginTop: SPACING.m }}
            >
              <Text style={styles.linkText}>
                Hai già un account? <Text style={styles.linkBold}>Accedi</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l, paddingTop: SPACING.l, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  logoCloud: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.s,
    ...SHADOW,
  },
  logoText: { fontSize: 38, fontWeight: '900', color: COLORS.primary, letterSpacing: 3 },
  logoEmoji: { fontSize: 32, marginLeft: 8 },
  tagline: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginVertical: SPACING.m,
    textAlign: 'center',
    paddingHorizontal: SPACING.m,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: SPACING.m,
    textAlign: 'center',
  },
  inputContainer: { position: 'relative' },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: 14,
    paddingRight: 44,
    marginVertical: 6,
    backgroundColor: COLORS.white,
    fontSize: 15,
    color: COLORS.textDark,
  },
  validationIcon: { position: 'absolute', right: 14, top: 18, fontSize: 18 },
  valid: { color: COLORS.success },
  invalid: { color: COLORS.error },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    marginTop: SPACING.m,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  linkText: { fontSize: 14, color: COLORS.textDark, textAlign: 'center' },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
  eyeBtn: { position: 'absolute', right: 8, top: 18, padding: 6 },
  eyeText: { fontSize: 20 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.m,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: COLORS.white,
  },
  checkboxOn: { backgroundColor: COLORS.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    marginLeft: 10,
    lineHeight: 19,
  },
  termsLink: { color: COLORS.primary, fontWeight: '800', textDecorationLine: 'underline' },
  primaryButtonDisabled: { opacity: 0.5 },
});
