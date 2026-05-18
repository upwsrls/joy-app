import React, { useState, useRef } from 'react';
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const validateEmail = (text: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text.trim());

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailValid(text.trim() === '' ? null : validateEmail(text));
  };

  const onLogin = async () => {
    if (!email.trim()) return Alert.alert('Email mancante', 'Inserisci la tua email');
    if (!emailValid) return Alert.alert('Email non valida', 'Controlla il formato (es. nome@esempio.com)');
    if (!password) return Alert.alert('Password mancante', 'Inserisci la tua password');

    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Email o password non corretti';
      Alert.alert('Accesso fallito', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoCloud}>
            <Text style={styles.logoText}>JOY</Text>
            <Text style={styles.logoEmoji}>✨</Text>
          </View>

          <Text style={styles.welcome}>Benvenuti</Text>
          <Text style={styles.subtitle}>Accedi per donare o ricevere</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accedi al tuo profilo</Text>

            <View style={styles.inputContainer}>
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="📧 Email"
                placeholderTextColor={COLORS.textMedium}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                value={email}
                onChangeText={handleEmailChange}
              />
              {emailValid !== null && (
                <Text style={[styles.validationIcon, emailValid ? styles.valid : styles.invalid]}>
                  {emailValid ? '✅' : '❌'}
                </Text>
              )}
            </View>
            {emailValid === false && (
              <Text style={styles.errorText}>Email non valida. Esempio: nome@esempio.com</Text>
            )}

            <View style={{ position: 'relative' }}>
              <TextInput
                testID="login-password-input"
                ref={passwordRef}
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="🔑 Password"
                placeholderTextColor={COLORS.textMedium}
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={onLogin}
              />
              <TouchableOpacity
                testID="login-toggle-pwd"
                onPress={() => setShowPwd(!showPwd)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPwd ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="login-forgot-btn"
              onPress={() => router.push('/forgot-password')}
              style={{ marginTop: 6, alignSelf: 'flex-end' }}
            >
              <Text style={styles.forgotText}>Hai dimenticato la password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="login-submit-button"
              style={styles.primaryButton}
              onPress={onLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Entra nel mondo JOY Share</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="login-go-register"
              onPress={() => router.push('/register')}
              style={{ marginTop: SPACING.m }}
            >
              <Text style={styles.linkText}>
                Prima volta? <Text style={styles.linkBold}>Crea un profilo</Text>
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
  scroll: { padding: SPACING.l, paddingTop: SPACING.xl, alignItems: 'center' },
  logoCloud: {
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    ...SHADOW,
  },
  logoText: { fontSize: 38, fontWeight: '900', color: COLORS.primary, letterSpacing: 3 },
  logoEmoji: { fontSize: 32, marginLeft: 8 },
  welcome: { fontSize: 22, fontWeight: '700', color: COLORS.textDark, marginTop: SPACING.s },
  subtitle: { fontSize: 14, color: COLORS.textMedium, marginBottom: SPACING.l },
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
  errorText: { color: COLORS.error, fontSize: 12, marginLeft: 4, marginTop: 2 },
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
  forgotText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  eyeBtn: { position: 'absolute', right: 8, top: 18, padding: 6 },
  eyeText: { fontSize: 20 },
});
