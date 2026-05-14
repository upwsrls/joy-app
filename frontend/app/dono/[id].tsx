import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  Linking,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api, Dono } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOW } from '../../lib/theme';
import {
  tapMedium,
  success as hapticSuccess,
  error as hapticError,
} from '../../lib/haptic';
import JoyButton from '../../components/JoyButton';
import RatingStars from '../../components/RatingStars';
import ReportSheet from '../../components/ReportSheet';

export default function DettaglioDonoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [dono, setDono] = useState<Dono | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const blocca = () => {
    if (!dono) return;
    Alert.alert(
      'Bloccare questo utente?',
      `Bloccando ${dono.donatore_nome || 'questo utente'} non vedrai pi\u00f9 le sue gioie n\u00e9 i suoi messaggi. Puoi sbloccarlo dal Profilo.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Blocca',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/blocks/${dono.user_id}`);
              hapticSuccess();
              Alert.alert('Bloccato', 'Non vedrai pi\u00f9 contenuti da questo utente.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              hapticError();
              Alert.alert('Errore', e?.response?.data?.detail || 'Riprova pi\u00f9 tardi');
            }
          },
        },
      ],
    );
  };

  const load = React.useCallback(async () => {
    try {
      const res = await api.get<Dono>(`/doni/${params.id}`);
      setDono(res.data);
    } catch {
      setDono(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const elimina = () => {
    Alert.alert('Elimina gioia', 'Sei sicuro di voler eliminare questa gioia?', [
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
    ]);
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

  const chiamaDonatore = () => {
    if (!dono?.donatore_telefono) return;
    tapMedium();
    const cleaned = dono.donatore_telefono.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Errore', 'Impossibile avviare la chiamata');
    });
  };

  const ritira = () => {
    if (!dono) return;
    Alert.alert(
      'Hai ricevuto questa gioia?',
      "Conferma solo dopo aver effettivamente ricevuto la gioia. Dovrai poi lasciare una recensione al donatore.",
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Sì, ho ricevuto',
          onPress: async () => {
            try {
              setBusy(true);
              tapMedium();
              await api.post(`/doni/${dono.id}/ritira`);
              hapticSuccess();
              router.replace({
                pathname: '/recensione/[id]',
                params: { id: dono.id, donatore: dono.donatore_nome || '' },
              });
            } catch (e: any) {
              hapticError();
              Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile registrare il ritiro.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
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
  const isRitirata = !!dono.ritirato;
  const ritirataDaMe = dono.ritirato_da === user?.id;
  const ratingAvg = dono.donatore_rating_avg ?? 0;
  const ratingCount = dono.donatore_rating_count || 0;

  return (
    <SafeAreaView style={styles.safe} testID="dettaglio-dono-screen">
      <ScrollView contentContainerStyle={{ padding: SPACING.l, paddingBottom: SPACING.xl }}>
        <TouchableOpacity
          testID="dono-back-btn"
          onPress={() => router.back()}
          style={{ marginBottom: SPACING.m }}
        >
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>

        {/* Ritirata badge */}
        {isRitirata && (
          <View style={styles.ritirataBadge}>
            <Text style={styles.ritirataText}>
              ✅ Gioia ritirata{ritirataDaMe ? ' da te' : ''}
            </Text>
          </View>
        )}

        <Text style={styles.title}>{dono.titolo}</Text>
        <Text style={styles.categoria}>{dono.categoria}</Text>

        {/* Foto carousel */}
        {dono.foto_urls && dono.foto_urls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: SPACING.m }}
            contentContainerStyle={{ paddingRight: SPACING.m }}
          >
            {dono.foto_urls.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={styles.foto}
                testID={`dono-foto-${i}`}
              />
            ))}
          </ScrollView>
        )}

        {/* Descrizione */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descrizione</Text>
          <Text style={styles.descrizione}>
            {dono.descrizione || 'Nessuna descrizione fornita'}
          </Text>
        </View>

        {/* Donatore card (solo se non è una mia gioia) */}
        {!isMine && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Donatore</Text>
            <Text style={styles.donatoreNome}>{dono.donatore_nome || 'Utente JOY'}</Text>

            {ratingCount > 0 ? (
              <View style={{ marginTop: 6 }}>
                <RatingStars
                  value={Math.round(ratingAvg)}
                  size={18}
                  showLabel
                  count={ratingCount}
                />
              </View>
            ) : (
              <Text style={styles.noRating}>Ancora nessuna recensione</Text>
            )}

            {!!dono.donatore_citta && (
              <Text style={styles.donatoreInfo}>📍 {dono.donatore_citta}</Text>
            )}
            {!!dono.donatore_telefono && (
              <TouchableOpacity
                testID="dono-chiama-btn"
                onPress={chiamaDonatore}
                style={styles.phoneRow}
              >
                <Text style={styles.donatoreInfo}>📞 {dono.donatore_telefono}</Text>
                {Platform.OS !== 'web' && <Text style={styles.phoneAction}>Chiama →</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Azioni */}
        {isMine ? (
          <JoyButton
            testID="dono-elimina-btn"
            label="🗑️ Elimina questa gioia"
            onPress={elimina}
            loading={busy}
            variant="danger"
            size="lg"
          />
        ) : isRitirata ? (
          <View style={styles.ritirataCard}>
            <Text style={styles.ritirataCardText}>
              Questa gioia è già stata ritirata da qualcuno. Grazie per la tua attenzione! 💛
            </Text>
          </View>
        ) : (
          <>
            <JoyButton
              testID="dono-contatta-btn"
              label="💬 Contatta il donatore"
              onPress={contattaDonatore}
              loading={busy}
              variant="primary"
              size="lg"
            />
            <JoyButton
              testID="dono-ritira-btn"
              label="🎁 Ho ricevuto la gioia"
              onPress={ritira}
              loading={busy}
              variant="secondary"
              size="md"
            />
          </>
        )}

        {/* Moderation actions: report + block (Apple compliance) */}
        {!isMine && (
          <View style={styles.modActions}>
            <TouchableOpacity
              testID="dono-report-btn"
              style={styles.modBtn}
              onPress={() => setReportOpen(true)}
            >
              <Text style={styles.modBtnText}>{'\ud83d\udea9'} Segnala</Text>
            </TouchableOpacity>
            <View style={styles.modSep} />
            <TouchableOpacity
              testID="dono-block-btn"
              style={styles.modBtn}
              onPress={blocca}
            >
              <Text style={styles.modBtnText}>{'\ud83d\udeab'} Blocca utente</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="dono"
        targetId={dono.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
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
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMedium,
    marginBottom: SPACING.s,
    letterSpacing: 0.5,
  },
  descrizione: { fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
  donatoreNome: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  donatoreInfo: { fontSize: 14, color: COLORS.textMedium, marginTop: 6 },
  noRating: { fontSize: 12, color: COLORS.textMedium, marginTop: 6, fontStyle: 'italic' },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  phoneAction: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  ritirataBadge: {
    backgroundColor: COLORS.secondaryBg,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: SPACING.m,
    borderRadius: RADIUS.medium,
    alignSelf: 'flex-start',
    marginBottom: SPACING.m,
  },
  ritirataText: { color: COLORS.textDark, fontWeight: '800', fontSize: 13 },
  ritirataCard: {
    marginTop: SPACING.l,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    alignItems: 'center',
  },
  ritirataCardText: {
    color: COLORS.textDark,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  modActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.l,
    paddingTop: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  modBtn: { paddingHorizontal: SPACING.m, paddingVertical: 8 },
  modBtnText: { color: COLORS.textMedium, fontWeight: '700', fontSize: 13 },
  modSep: { width: 1, height: 16, backgroundColor: COLORS.cardBorder },
});
