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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW, CATEGORIE } from '../lib/theme';

export default function DonaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; cityName?: string }>();

  const [foto, setFoto] = useState<string[]>([]);
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [posizione, setPosizione] = useState<{ latitude: number; longitude: number } | null>(
    params.lat && params.lng
      ? { latitude: parseFloat(params.lat as string), longitude: parseFloat(params.lng as string) }
      : null
  );
  const [posizioneLabel, setPosizioneLabel] = useState<string>(
    (params.cityName as string) || ''
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const aggiungiFoto = async () => {
    const remaining = 3 - foto.length;
    if (remaining <= 0) {
      Alert.alert('Max 3 foto', 'Hai già aggiunto 3 foto per questa gioia.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Servono i permessi per la galleria.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setFoto((prev) => [...prev, `data:image/jpeg;base64,${res.assets[0].base64}`].slice(0, 3));
    }
  };

  const rimuoviFoto = (i: number) => setFoto(foto.filter((_, idx) => idx !== i));

  const usaGPS = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Servono i permessi per la posizione.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setPosizione({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setPosizioneLabel('Posizione attuale 🧭');
    } catch {
      Alert.alert('Errore', 'Impossibile ottenere la posizione.');
    }
  };

  const apriCercaCitta = () => router.push('/cerca-citta');

  const pubblica = async () => {
    if (!titolo.trim()) return Alert.alert('Dai un nome alla tua gioia');
    if (!categoria) return Alert.alert('Scegli una categoria magica');
    if (!posizione) return Alert.alert('Scegli dove si trova la gioia');
    if (foto.length === 0) return Alert.alert('Aggiungi almeno una foto colorata');

    try {
      setLoading(true);
      await api.post('/doni', {
        titolo: titolo.trim(),
        descrizione: descrizione.trim(),
        categoria,
        lat: posizione.latitude,
        lng: posizione.longitude,
        foto_base64_list: foto,
      });
      Alert.alert('Grazie! 🌟', 'Una nuova gioia è pronta a volare verso qualcuno.');
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile pubblicare la gioia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="dona-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="dona-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Indietro</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Dona una gioia 🎁</Text>
          <Text style={styles.subtitle}>Scegli cosa regalare, fai una foto e indica dove si trova.</Text>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Foto colorate 📸</Text>
              <Text style={styles.sectionHint}>Max 3 immagini</Text>
            </View>
            <TouchableOpacity testID="dona-add-photo" style={styles.secondaryButton} onPress={aggiungiFoto}>
              <Text style={styles.secondaryButtonText}>📷 Aggiungi foto ({foto.length}/3)</Text>
            </TouchableOpacity>
            <View style={styles.fotoRow}>
              {foto.map((uri, i) => (
                <View key={i} style={styles.fotoWrapper}>
                  <Image source={{ uri }} style={styles.fotoThumb} />
                  <TouchableOpacity onPress={() => rimuoviFoto(i)} style={styles.fotoRemove}>
                    <Text style={styles.fotoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Titolo</Text>
            <TextInput
              testID="dona-titolo-input"
              style={styles.input}
              placeholder="Es. Coperta morbida per bimbi"
              placeholderTextColor={COLORS.textMedium}
              value={titolo}
              onChangeText={setTitolo}
            />

            <Text style={styles.sectionTitle}>Descrizione (opzionale)</Text>
            <TextInput
              testID="dona-descrizione-input"
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Racconta qualcosa..."
              placeholderTextColor={COLORS.textMedium}
              value={descrizione}
              onChangeText={setDescrizione}
              multiline
            />

            <Text style={styles.sectionTitle}>Dove si trova? 🏡</Text>
            <View style={styles.row}>
              <TouchableOpacity testID="dona-gps-btn" style={[styles.secondaryButton, { flex: 1, marginRight: 4 }]} onPress={usaGPS}>
                <Text style={styles.secondaryButtonText}>📍 Posizione attuale</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="dona-citta-btn" style={[styles.secondaryButton, { flex: 1, marginLeft: 4 }]} onPress={apriCercaCitta}>
                <Text style={styles.secondaryButtonText}>🌆 Scegli città</Text>
              </TouchableOpacity>
            </View>
            {posizione && (
              <Text style={styles.successText}>
                ✅ {posizioneLabel || 'Posizione impostata'}
              </Text>
            )}

            <Text style={styles.sectionTitle}>Categoria magica 🌟</Text>
            <TouchableOpacity testID="dona-categoria-btn" style={styles.secondaryButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.secondaryButtonText}>
                {categoria ? `Categoria: ${categoria}` : 'Scegli categoria'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="dona-pubblica-btn"
              style={styles.primaryButton}
              onPress={pubblica}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>✨ Pubblica la gioia</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Scegli la categoria</Text>
            {CATEGORIE.map((c) => (
              <TouchableOpacity
                key={c.nome}
                testID={`dona-cat-${c.nome}`}
                style={styles.modalItem}
                onPress={() => {
                  setCategoria(c.nome);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalEmoji}>{c.icon}</Text>
                <Text style={styles.modalItemText}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textMedium, marginBottom: SPACING.m },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.s,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginTop: SPACING.m },
  sectionHint: { fontSize: 12, color: COLORS.textMedium },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    marginTop: SPACING.s,
    backgroundColor: COLORS.secondaryBg,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '700' },
  fotoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.s },
  fotoWrapper: { marginRight: 8, marginBottom: 8, position: 'relative' },
  fotoThumb: { width: 90, height: 90, borderRadius: RADIUS.medium },
  fotoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fotoRemoveText: { color: COLORS.white, fontSize: 11 },
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
  row: { flexDirection: 'row' },
  successText: { color: COLORS.success, marginTop: 6, fontWeight: '600' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,58,138,0.4)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.l,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.m,
    color: COLORS.textDark,
  },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  modalEmoji: { fontSize: 28, marginRight: SPACING.m },
  modalItemText: { fontSize: 16, color: COLORS.textDark, fontWeight: '600' },
  modalClose: { textAlign: 'center', marginTop: SPACING.m, color: COLORS.textMedium },
});
