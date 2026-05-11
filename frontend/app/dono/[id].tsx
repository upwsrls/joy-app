import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Dono } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../lib/theme';

export default function DettaglioDonoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [dono, setDono] = useState<Dono | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Dono>(`/doni/${params.id}`);
        setDono(res.data);
      } catch {
        setDono(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const elimina = () => {
    Alert.alert(
      'Elimina gioia',
      'Sei sicuro di voler eliminare questa gioia?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              tapMedium();
              await api.delete(`/doni/${params.id}`);
              hapticSuccess();
              Alert.alert('Eliminata ✨', 'La gioia è stata rimossa dalla mappa.');
              router.back();
            } catch {
              hapticError();
              Alert.alert('Errore', 'Impossibile eliminare la gioia.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const contattaDonatore = async () => {
    if (!dono) return;
    try {
      setBusy(true);
      tapMedium();
      const res = await api.post(`/conversazioni/start/${dono.user_id}`);
      router.push({
        pathname: '/chat/[id]',
        params: { id: res.data.id, nome: dono.donatore_nome || 'Donatore' },
      });
    } catch (e: any) {
      hapticError();
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile avviare la chat');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!dono) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFound}>Gioia non trovata 💙</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: SPACING.m }}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isMine = dono.user_id === user?.id;

  return (
    <SafeAreaView style={styles.safe} testID="dettaglio-dono-screen">
      <ScrollView contentContainerStyle={{ padding: SPACING.l, paddingBottom: SPACING.xl }}>
        <TouchableOpacity testID="dono-back-btn" onPress={() => router.back()} style={{ marginBottom: SPACING.m }}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{dono.titolo}</Text>
        <Text style={styles.categoria}>Categoria: {dono.categoria}</Text>

        {dono.foto_urls && dono.foto_urls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: SPACING.m }}>
            {dono.foto_urls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.foto} />
            ))}
          </ScrollView>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descrizione</Text>
          <Text style={styles.descrizione}>
            {dono.descrizione || 'Nessuna descrizione fornita'}
          </Text>
        </View>

        {!isMine && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Donatore</Text>
            <Text style={styles.donatoreNome}>{dono.donatore_nome || 'Utente JOY'}</Text>
            {!!dono.donatore_citta && (
              <Text style={styles.donatoreCitta}>📍 {dono.donatore_citta}</Text>
            )}
          </View>
        )}

        {isMine ? (
          <TouchableOpacity
            testID="dono-elimina-btn"
            style={[styles.primaryButton, { backgroundColor: COLORS.error }]}
            onPress={elimina}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>🗑️ Elimina questa gioia</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="dono-contatta-btn"
            style={styles.primaryButton}
            onPress={contattaDonatore}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>💬 Contatta il donatore</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  notFound: { fontSize: 16, color: COLORS.textMedium },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textDark },
  categoria: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  foto: {
    width: 240,
    height: 240,
    borderRadius: RADIUS.large,
    marginRight: SPACING.m,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    marginVertical: SPACING.s,
    ...SHADOW,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMedium, marginBottom: SPACING.s },
  descrizione: { fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
  donatoreNome: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  donatoreCitta: { fontSize: 14, color: COLORS.textMedium, marginTop: 4 },
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
});
