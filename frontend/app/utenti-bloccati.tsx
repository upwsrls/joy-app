import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

type Blocked = { user_id: string; nome?: string; citta?: string; blocked_at: string };

export default function UtentiBloccatiScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Blocked[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Blocked[]>('/blocks');
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sblocca = (b: Blocked) => {
    Alert.alert(
      'Sbloccare?',
      `Sbloccare ${b.nome || 'questo utente'}? Tornerai a vedere le sue gioie.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Sblocca',
          onPress: async () => {
            try {
              await api.delete(`/blocks/${b.user_id}`);
              setItems((prev) => prev.filter((x) => x.user_id !== b.user_id));
            } catch {
              Alert.alert('Errore', 'Riprova più tardi');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>Utenti bloccati</Text>
        <View style={{ width: 70 }} />
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>🌈 Nessun utente bloccato</Text>
          <Text style={s.emptyHint}>Quando blocchi qualcuno, apparirà qui.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.user_id}
          contentContainerStyle={{ padding: SPACING.l }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.nome || 'Utente'}</Text>
                {!!item.citta && <Text style={s.citta}>{item.citta}</Text>}
              </View>
              <TouchableOpacity style={s.unblockBtn} onPress={() => sblocca(item)}>
                <Text style={s.unblockText}>Sblocca</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.l, paddingVertical: SPACING.m,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.l },
  empty: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  emptyHint: { fontSize: 14, color: COLORS.textMedium, marginTop: SPACING.s, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m,
    backgroundColor: COLORS.white, borderRadius: RADIUS.medium,
    borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOW,
  },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  citta: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: SPACING.m, paddingVertical: 8,
    backgroundColor: COLORS.secondaryBg, borderRadius: RADIUS.medium,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  unblockText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
