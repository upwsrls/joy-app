import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../lib/theme';

type CityRes = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function CercaCittaScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<CityRes[]>([]);
  const [loading, setLoading] = useState(false);

  const cerca = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setRisultati([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=8`
      );
      const data = await res.json();
      setRisultati(data || []);
    } catch {
      setRisultati([]);
    } finally {
      setLoading(false);
    }
  };

  const scegli = (item: CityRes) => {
    router.replace({
      pathname: '/dona',
      params: {
        lat: item.lat,
        lng: item.lon,
        cityName: item.display_name.split(',')[0],
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} testID="cerca-citta-screen">
      <View style={styles.content}>
        <TouchableOpacity testID="cerca-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dove sei nel mondo? 🗺️</Text>
        <Text style={styles.subtitle}>
          Scrivi il nome della città per far sapere alle altre famiglie dove si trova la tua gioia.
        </Text>
        <TextInput
          testID="cerca-input"
          style={styles.input}
          placeholder="🔍 Scrivi una città..."
          placeholderTextColor={COLORS.textMedium}
          value={query}
          onChangeText={cerca}
          autoFocus
        />
        {loading && <Text style={styles.loadingText}>Cercando...</Text>}
        <FlatList
          data={risultati}
          keyExtractor={(item) => item.place_id.toString()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`cerca-result-${item.place_id}`}
              style={styles.resultItem}
              onPress={() => scegli(item)}
            >
              <Text style={styles.resultTitle}>{item.display_name.split(',')[0]}</Text>
              <Text style={styles.resultDescription}>{item.display_name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: SPACING.l },
  backBtn: { marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textMedium, marginVertical: SPACING.s },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.medium,
    padding: 14,
    backgroundColor: COLORS.white,
    fontSize: 15,
    color: COLORS.textDark,
    marginVertical: SPACING.s,
  },
  loadingText: { color: COLORS.textMedium, textAlign: 'center', marginVertical: SPACING.s },
  separator: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 4 },
  resultItem: { paddingVertical: 12 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  resultDescription: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
});
