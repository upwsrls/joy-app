import React, { useState, useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, TOKEN_KEY } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validateEmail = (text: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text.trim());

  const inviaCodice = async () => {
    if (!validateEmail(email)) {
      return Alert.alert('Email non valida', 'Controlla il formato (es. nome@esempio.com)');
    }
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep('otp');
      setResendIn(30);
      Alert.alert(
        'Codice inviato 📬',
        'Se l\'email è registrata, riceverai un codice a 6 cifre.\n\n(In sviluppo: il codice è stampato nei log del backend.)'
      );
    } catch {
      Alert.alert('Errore', 'Impossibile inviare il codice. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const verificaCodice = async () => {
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return Alert.alert('Codice non valido', 'Il codice deve essere di 6 cifre.');
    }
    try {
      setLoading(true);
      await api.post('/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp,
      });
      setStep('password');
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Codice non corretto');
    } finally {
      setLoading(false);
    }
  };

  const cambiaPassword = async () => {
    if (newPwd.length < 6) {
      return Alert.alert('Password troppo corta', 'Minimo 6 caratteri');
    }
    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        otp,
        new_password: newPwd,
      });
      await AsyncStorage.setItem(TOKEN_KEY, res.data.access_token);
      Alert.alert('🎉 Password aggiornata!', 'Sei già dentro JOY.');
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile aggiornare la password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="forgot-password-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="forgot-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Recupera la password</Text>

          <View style={styles.stepsRow}>
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  step === s && styles.stepDotActive,
                  (step === 'otp' && i === 0) || (step === 'password' && i < 2)
                    ? styles.stepDotDone
                    : null,
                ]}
              >
                <Text style={styles.stepDotText}>{i + 1}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            {step === 'email' && (
              <>
                <Text style={styles.cardTitle}>Inserisci la tua email</Text>
                <Text style={styles.cardSubtitle}>Ti invieremo un codice a 6 cifre.</Text>
                <TextInput
                  testID="forgot-email-input"
                  style={styles.input}
                  placeholder="📧 Email"
                  placeholderTextColor={COLORS.textMedium}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity
                  testID="forgot-send-btn"
                  style={styles.primaryButton}
                  onPress={inviaCodice}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Invia codice</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 'otp' && (
              <>
                <Text style={styles.cardTitle}>Inserisci il codice</Text>
                <Text style={styles.cardSubtitle}>Codice inviato a {email}</Text>
                <TextInput
                  testID="forgot-otp-input"
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={COLORS.textMedium}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <TouchableOpacity
                  testID="forgot-verify-btn"
                  style={styles.primaryButton}
                  onPress={verificaCodice}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verifica codice</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  testID="forgot-resend-btn"
                  onPress={inviaCodice}
                  disabled={resendIn > 0 || loading}
                  style={{ marginTop: SPACING.m }}
                >
                  <Text style={[styles.linkText, resendIn > 0 && { opacity: 0.5 }]}>
                    {resendIn > 0 ? `Reinvia tra ${resendIn}s` : 'Reinvia il codice'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'password' && (
              <>
                <Text style={styles.cardTitle}>Nuova password</Text>
                <Text style={styles.cardSubtitle}>Almeno 6 caratteri.</Text>
                <View style={styles.pwdRow}>
                  <TextInput
                    testID="forgot-newpwd-input"
                    style={[styles.input, { flex: 1, paddingRight: 44 }]}
                    placeholder="🔑 Nuova password"
                    placeholderTextColor={COLORS.textMedium}
                    value={newPwd}
                    onChangeText={setNewPwd}
                    secureTextEntry={!showPwd}
                    autoFocus
                  />
                  <TouchableOpacity
                    testID="forgot-toggle-pwd"
                    onPress={() => setShowPwd(!showPwd)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  testID="forgot-reset-btn"
                  style={styles.primaryButton}
                  onPress={cambiaPassword}
                  disabled={loading || newPwd.length < 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Aggiorna password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  emoji: { fontSize: 56, marginTop: SPACING.s },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginVertical: SPACING.m },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.l },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotDone: { backgroundColor: COLORS.success },
  stepDotText: { color: COLORS.white, fontWeight: '900' },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, textAlign: 'center' },
  cardSubtitle: { fontSize: 13, color: COLORS.textMedium, textAlign: 'center', marginTop: 4, marginBottom: SPACING.m },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: 14,
    marginTop: 6,
    backgroundColor: COLORS.white,
    fontSize: 15,
    color: COLORS.textDark,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    color: COLORS.primary,
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  eyeBtn: { position: 'absolute', right: 8, padding: 8, top: 12 },
  eyeText: { fontSize: 22 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    marginTop: SPACING.m,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  linkText: { color: COLORS.primary, fontWeight: '700', textAlign: 'center' },
});
