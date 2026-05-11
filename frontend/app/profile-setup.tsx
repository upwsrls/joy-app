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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { signOut, refreshProfile } = useAuth();
  const [nome, setNome] = useState('');
  const [citta, setCitta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Servono i permessi per accedere alla galleria.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      try {
        setUploading(true);
        const dataUrl = `data:image/jpeg;base64,${res.assets[0].base64}`;
        const up = await api.post('/uploads/image', { base64: dataUrl });
        setFotoUrl(up.data.secure_url);
      } catch {
        Alert.alert('Errore', 'Upload foto fallito. Riprova.');
      } finally {
        setUploading(false);
      }
    }
  };

  const onSave = async () => {
    if (!nome.trim() || !citta.trim()) {
      return Alert.alert('Attenzione', 'Nome e città sono obbligatori');
    }
    try {
      setLoading(true);
      await api.put('/profile/me', {
        nome: nome.trim(),
        citta: citta.trim(),
        telefono: telefono.trim(),
        foto_url: fotoUrl,
      });
      await refreshProfile();
      Alert.alert('Perfetto! ✨', 'Il tuo profilo è pronto.');
      router.replace('/');
    } catch {
      Alert.alert('Errore', 'Qualcosa è andato storto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe} testID="profile-setup-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="profile-logout-btn" onPress={onLogout} style={styles.backBtn}>
            <Text style={styles.backText}>← Esci</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Completa il tuo profilo 💫</Text>
          <Text style={styles.subtitle}>
            Metti il tuo nome, dove vivi e (se vuoi) una foto: così tutti si fidano di più!
          </Text>

          <TouchableOpacity testID="profile-photo-picker" onPress={pickPhoto} style={styles.avatar} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarPlaceholder}>📸</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>
            {uploading ? 'Caricamento…' : fotoUrl ? 'Cambia foto' : 'Aggiungi foto profilo'}
          </Text>

          <View style={styles.card}>
            <TextInput
              testID="profile-nome-input"
              style={styles.input}
              placeholder="🙂 Nome"
              placeholderTextColor={COLORS.textMedium}
              value={nome}
              onChangeText={setNome}
            />
            <TextInput
              testID="profile-citta-input"
              style={styles.input}
              placeholder="🏡 Città"
              placeholderTextColor={COLORS.textMedium}
              value={citta}
              onChangeText={setCitta}
            />
            <TextInput
              testID="profile-telefono-input"
              style={styles.input}
              placeholder="📞 Telefono (opzionale)"
              placeholderTextColor={COLORS.textMedium}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            <TouchableOpacity
              testID="profile-save-btn"
              style={styles.primaryButton}
              onPress={onSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Salva e inizia la magia</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>La foto è opzionale, ma rende tutto più bello e sicuro! 📸</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark, textAlign: 'center', marginTop: SPACING.s },
  subtitle: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center', marginVertical: SPACING.m, paddingHorizontal: SPACING.m },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.cardBorder,
    marginTop: SPACING.s,
    overflow: 'hidden',
    ...SHADOW,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { fontSize: 48 },
  avatarLabel: { color: COLORS.primary, fontWeight: '600', marginVertical: SPACING.s },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    marginTop: SPACING.m,
    ...SHADOW,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: 14,
    marginVertical: 6,
    backgroundColor: COLORS.white,
    fontSize: 15,
    color: COLORS.textDark,
  },
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
  hint: { fontSize: 12, color: COLORS.textMedium, marginTop: SPACING.m, textAlign: 'center' },
});
