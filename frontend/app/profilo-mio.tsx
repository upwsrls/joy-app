import React, { useState, useEffect } from 'react';
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

export default function MyProfileScreen() {
  const router = useRouter();
  const { profile, refreshProfile, signOut, user } = useAuth();
  const [nome, setNome] = useState('');
  const [citta, setCitta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setCitta(profile.citta || '');
      setTelefono(profile.telefono || '');
      setFotoUrl(profile.foto_url || null);
    }
  }, [profile]);

  const cambiaFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Servono i permessi per la galleria.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('✨ Salvato!', 'Il tuo profilo è stato aggiornato.');
      router.back();
    } catch {
      Alert.alert('Errore', 'Qualcosa è andato storto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Esci', 'Vuoi davvero uscire da JOY?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const onDeleteAccount = () => {
    // Doppia conferma per evitare cancellazioni accidentali (Apple Guideline 5.1.1.v)
    Alert.alert(
      '\u26a0\ufe0f Cancellare l\u2019account?',
      'Questa azione \u00e8 irreversibile.\n\nCosa verr\u00e0 cancellato:\n\u2022 Il tuo profilo (nome, foto, citt\u00e0)\n\u2022 Le tue gioie attive\n\u2022 La tua email e password\n\nCosa resta (anonimizzato):\n\u2022 Le recensioni date e ricevute\n\u2022 Le chat con altri utenti\n\nVuoi davvero procedere?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Ultima conferma',
              'Sei davvero sicuro? Non potrai recuperare l\u2019account.',
              [
                { text: 'No, annulla', style: 'cancel' },
                {
                  text: 'S\u00ec, cancella definitivamente',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
                      await api.delete('/auth/me');
                      await signOut();
                      router.replace('/login');
                      setTimeout(() => {
                        Alert.alert('Account cancellato', 'Grazie per aver usato JOY. \ud83d\udc99');
                      }, 400);
                    } catch (e: any) {
                      Alert.alert('Errore', e?.response?.data?.detail || 'Riprova pi\u00f9 tardi');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} testID="my-profile-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity testID="myprofile-back-btn" onPress={() => router.back()}>
              <Text style={styles.backText}>← Indietro</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Il mio profilo 💫</Text>
          <Text style={styles.subtitle}>Modifica nome, città, telefono o foto.</Text>

          <TouchableOpacity
            testID="myprofile-photo-picker"
            onPress={cambiaFoto}
            style={styles.avatar}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarPlaceholder}>📸</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>{uploading ? 'Caricamento…' : 'Tocca per cambiare foto'}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.emailReadonly}>{user?.email}</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              testID="myprofile-nome-input"
              style={styles.input}
              placeholder="Il tuo nome"
              placeholderTextColor={COLORS.textMedium}
              value={nome}
              onChangeText={setNome}
            />

            <Text style={styles.label}>Città</Text>
            <TextInput
              testID="myprofile-citta-input"
              style={styles.input}
              placeholder="La tua città"
              placeholderTextColor={COLORS.textMedium}
              value={citta}
              onChangeText={setCitta}
            />

            <Text style={styles.label}>Telefono (opzionale)</Text>
            <TextInput
              testID="myprofile-telefono-input"
              style={styles.input}
              placeholder="Numero di telefono"
              placeholderTextColor={COLORS.textMedium}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            <TouchableOpacity
              testID="myprofile-save-btn"
              style={styles.primaryButton}
              onPress={onSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>💾 Salva modifiche</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity testID="myprofile-logout-btn" onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Esci da JOY</Text>
          </TouchableOpacity>

          {/* Sezione legale + moderazione (richiesti Apple) */}
          <View style={styles.legalSection}>
            <TouchableOpacity
              testID="myprofile-blocked-users"
              style={styles.legalRow}
              onPress={() => router.push('/utenti-bloccati')}
            >
              <Text style={styles.legalRowText}>{'\ud83d\udeab'}  Utenti bloccati</Text>
              <Text style={styles.legalRowArrow}>{'\u203a'}</Text>
            </TouchableOpacity>
            <View style={styles.legalDivider} />
            <TouchableOpacity
              testID="myprofile-privacy-link"
              style={styles.legalRow}
              onPress={() => router.push('/legal/privacy')}
            >
              <Text style={styles.legalRowText}>{'\ud83d\udd12'}  Privacy Policy</Text>
              <Text style={styles.legalRowArrow}>{'\u203a'}</Text>
            </TouchableOpacity>
            <View style={styles.legalDivider} />
            <TouchableOpacity
              testID="myprofile-terms-link"
              style={styles.legalRow}
              onPress={() => router.push('/legal/terms')}
            >
              <Text style={styles.legalRowText}>{'\ud83d\udcdc'}  Termini di Servizio</Text>
              <Text style={styles.legalRowArrow}>{'\u203a'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="myprofile-delete-account-btn"
            onPress={onDeleteAccount}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>{'\ud83d\uddd1\ufe0f'}  Cancella account</Text>
          </TouchableOpacity>
          <Text style={styles.deleteHint}>
            Azione irreversibile. I tuoi dati personali verranno rimossi definitivamente.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l, paddingBottom: SPACING.xl, alignItems: 'center' },
  header: { width: '100%', alignItems: 'flex-start', marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginTop: SPACING.s },
  subtitle: { fontSize: 13, color: COLORS.textMedium, textAlign: 'center', marginVertical: SPACING.m },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
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
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginTop: SPACING.s, marginLeft: 4 },
  emailReadonly: {
    fontSize: 15,
    color: COLORS.textMedium,
    backgroundColor: COLORS.lightGray,
    padding: 14,
    borderRadius: RADIUS.medium,
    marginTop: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: 14,
    marginTop: 4,
    backgroundColor: COLORS.white,
    fontSize: 15,
    color: COLORS.textDark,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    marginTop: SPACING.l,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  logoutBtn: { marginTop: SPACING.l, paddingVertical: 12 },
  logoutText: { color: COLORS.error, fontWeight: '700', textAlign: 'center', fontSize: 15 },
  legalSection: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginTop: SPACING.l,
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: 14,
  },
  legalRowText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  legalRowArrow: { fontSize: 22, color: COLORS.textMedium },
  legalDivider: { height: 1, backgroundColor: COLORS.cardBorder, marginHorizontal: SPACING.m },
  deleteBtn: {
    marginTop: SPACING.l,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: RADIUS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    alignSelf: 'center',
  },
  deleteText: { color: COLORS.error, fontWeight: '800', fontSize: 14 },
  deleteHint: {
    fontSize: 11,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginTop: SPACING.s,
    marginBottom: SPACING.l,
    paddingHorizontal: SPACING.m,
  },
});
