import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW, CATEGORIE } from '../lib/theme';
import { success as hapticSuccess, tapMedium, error as hapticError } from '../lib/haptic';
import UploadOverlay from '../components/UploadOverlay';

type CityRes = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function DonaScreen() {
  const router = useRouter();

  // Form state — preserved across modal openings
  const [foto, setFoto] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [titolo, setTitolo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [categoria, setCategoria] = useState<string>('');
  const [posizione, setPosizione] = useState<{ latitude: number; longitude: number } | null>(null);
  const [posizioneLabel, setPosizioneLabel] = useState<string>('');

  // UI state
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // City search state
  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<CityRes[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!cityModalVisible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setRisultati([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=0`,
          { signal: ctrl.signal, headers: { 'Accept-Language': 'it' } }
        );
        const data = (await res.json()) as CityRes[];
        setRisultati(data || []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setRisultati([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, cityModalVisible]);

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
    // Multi-selection: user can pick up to `remaining` photos at once.
    // Note: `allowsEditing` is incompatible with multi-selection, so we skip it.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
      quality: 0.6,
      base64: true,
    });
    if (res.canceled || !res.assets || res.assets.length === 0) return;

    // Defensive trim — iOS/Android occasionally return more than selectionLimit.
    const assets = res.assets.slice(0, remaining);

    setUploadingPhoto(true);
    setUploadProgress({ current: 0, total: assets.length });
    const newUrls: string[] = [];

    for (let i = 0; i < assets.length; i++) {
      setUploadProgress({ current: i + 1, total: assets.length });
      const asset = assets[i];
      if (!asset.base64) continue;
      try {
        const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
        const up = await api.post('/uploads/image', { base64: dataUrl });
        newUrls.push(up.data.secure_url);
      } catch (e) {
        console.warn('Photo upload failed:', e);
      }
    }

    setUploadingPhoto(false);
    setUploadProgress(null);

    if (newUrls.length === 0) {
      hapticError();
      Alert.alert('Errore', 'Caricamento foto fallito. Riprova.');
      return;
    }

    setFoto((prev) => [...prev, ...newUrls].slice(0, 3));
    hapticSuccess();

    if (newUrls.length < assets.length) {
      // Partial failure — let the user know quietly
      Alert.alert(
        'Alcune foto non caricate',
        `${newUrls.length} di ${assets.length} foto caricate correttamente. Riprova per le altre.`,
      );
    }
  };

  const rimuoviFoto = (i: number) => setFoto(foto.filter((_, idx) => idx !== i));

  const usaGPS = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso negato', 'Servono i permessi per la posizione.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setPosizione({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      // Try reverse-geocode for a friendly label
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const p = places?.[0];
        const label = p?.city || p?.subregion || p?.region || 'Posizione attuale';
        setPosizioneLabel(label);
      } catch {
        setPosizioneLabel('Posizione attuale');
      }
    } catch {
      Alert.alert('Errore', 'Impossibile ottenere la posizione.');
    } finally {
      setGpsLoading(false);
    }
  };

  const scegliCitta = (item: CityRes) => {
    setPosizione({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
    setPosizioneLabel(item.display_name.split(',')[0]);
    setCityModalVisible(false);
    setQuery('');
    setRisultati([]);
  };

  const pubblica = async () => {
    if (!titolo.trim()) return Alert.alert('Dai un nome alla tua gioia');
    if (!categoria) return Alert.alert('Scegli una categoria magica');
    if (!posizione) return Alert.alert('Scegli dove si trova la gioia');
    if (foto.length === 0) return Alert.alert('Aggiungi almeno una foto colorata');

    try {
      setLoading(true);
      tapMedium();
      const created = await api.post('/doni', {
        titolo: titolo.trim(),
        descrizione: descrizione.trim(),
        categoria,
        lat: posizione.latitude,
        lng: posizione.longitude,
        foto_urls: foto,
      });
      hapticSuccess();
      router.replace({
        pathname: '/dono/created',
        params: {
          id: created.data?.id || '',
          titolo: titolo.trim(),
          categoria,
          foto: foto[0] || '',
        },
      });
    } catch (e: any) {
      hapticError();
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
            <TouchableOpacity testID="dona-add-photo" style={styles.secondaryButton} onPress={aggiungiFoto} disabled={uploadingPhoto || foto.length >= 3}>
              {uploadingPhoto ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {foto.length === 0
                    ? '📷 Scegli foto (puoi selezionarne fino a 3)'
                    : foto.length >= 3
                      ? '✅ Hai aggiunto 3 foto'
                      : `📷 Aggiungi altre foto (${foto.length}/3)`}
                </Text>
              )}
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

            {/* Big primary GPS button */}
            <TouchableOpacity
              testID="dona-gps-btn"
              style={styles.gpsButton}
              onPress={usaGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.gpsButtonText}>📍 Usa la mia posizione attuale</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orSeparator}>oppure</Text>

            <TouchableOpacity
              testID="dona-citta-btn"
              style={styles.secondaryButton}
              onPress={() => setCityModalVisible(true)}
            >
              <Text style={styles.secondaryButtonText}>🌆 Cerca una città</Text>
            </TouchableOpacity>

            {posizione && !!posizioneLabel && (
              <View style={styles.successPill} testID="dona-pos-confirm">
                <Text style={styles.successPillText}>✅ {posizioneLabel}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Categoria magica 🌟</Text>
            <TouchableOpacity testID="dona-categoria-btn" style={styles.secondaryButton} onPress={() => setCatModalVisible(true)}>
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

      {/* Categoria modal */}
      <Modal visible={catModalVisible} transparent animationType="fade" onRequestClose={() => setCatModalVisible(false)}>
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
                  setCatModalVisible(false);
                }}
              >
                <Text style={styles.modalEmoji}>{c.icon}</Text>
                <Text style={styles.modalItemText}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setCatModalVisible(false)}>
              <Text style={styles.modalClose}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <UploadOverlay
        visible={uploadingPhoto}
        message={
          uploadProgress
            ? `Caricamento foto ${uploadProgress.current}/${uploadProgress.total}…`
            : 'Caricamento foto…'
        }
        emoji="☁️"
      />

      {/* City search modal */}
      <Modal visible={cityModalVisible} animationType="slide" onRequestClose={() => setCityModalVisible(false)}>        <SafeAreaView style={styles.cityModalSafe}>
          <View style={styles.cityModalHeader}>
            <TouchableOpacity testID="city-modal-close" onPress={() => setCityModalVisible(false)}>
              <Text style={styles.backText}>✕ Chiudi</Text>
            </TouchableOpacity>
            <Text style={styles.cityModalTitle}>Cerca città 🗺️</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={{ padding: SPACING.l }}>
            <TextInput
              testID="city-search-input"
              style={styles.input}
              placeholder="🔍 Scrivi una città (es. Milano)"
              placeholderTextColor={COLORS.textMedium}
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
            />
            {searchLoading && (
              <View style={styles.searchLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.searchLoadingText}>Cercando...</Text>
              </View>
            )}
          </View>

          <FlatList
            data={risultati}
            keyExtractor={(item) => item.place_id.toString()}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: SPACING.l, paddingBottom: SPACING.xl }}
            ListEmptyComponent={
              !searchLoading && query.length >= 2 ? (
                <Text style={styles.emptySearch}>Nessuna città trovata</Text>
              ) : query.length < 2 ? (
                <Text style={styles.emptySearch}>Scrivi almeno 2 lettere per cercare</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`city-result-${item.place_id}`}
                style={styles.resultItem}
                onPress={() => scegliCitta(item)}
              >
                <Text style={styles.resultTitle}>{item.display_name.split(',')[0]}</Text>
                <Text style={styles.resultDescription} numberOfLines={1}>{item.display_name}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
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
  gpsButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    marginTop: SPACING.s,
    minHeight: 48,
    justifyContent: 'center',
    ...SHADOW,
  },
  gpsButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  orSeparator: {
    textAlign: 'center',
    color: COLORS.textMedium,
    marginVertical: SPACING.s,
    fontWeight: '600',
  },
  successPill: {
    marginTop: SPACING.s,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.medium,
    paddingVertical: 10,
    paddingHorizontal: SPACING.m,
    alignSelf: 'flex-start',
  },
  successPillText: { color: COLORS.success, fontWeight: '700' },
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
  cityModalSafe: { flex: 1, backgroundColor: COLORS.background },
  cityModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  cityModalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  searchLoading: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.s, justifyContent: 'center' },
  searchLoadingText: { marginLeft: SPACING.s, color: COLORS.textMedium },
  separator: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 4 },
  resultItem: { paddingVertical: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  resultDescription: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
  emptySearch: { textAlign: 'center', color: COLORS.textMedium, paddingVertical: SPACING.l },
});
