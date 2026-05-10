import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, Conversazione } from '../lib/api';
import { COLORS, SPACING, RADIUS, SHADOW } from '../lib/theme';

export default function ChatListScreen() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conversazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carica = useCallback(async () => {
    try {
      const res = await api.get<Conversazione[]>('/conversazioni');
      setConvs(res.data || []);
    } catch {
      setConvs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carica();
    }, [carica])
  );

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loading}>Caricamento chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="chat-list-screen">
      <View style={styles.header}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()}>
          <Text style={styles.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Le tue chat 💬</Text>
      </View>

      {convs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Le tue chat sono vuote</Text>
          <Text style={styles.emptyText}>
            Inizia una conversazione toccando una gioia sulla mappa!
          </Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.l }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                carica();
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`chat-row-${item.id}`}
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/chat/[id]', params: { id: item.id, nome: item.altro_nome } })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>🙂</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.altro_nome}</Text>
                <Text style={styles.rowMessage} numberOfLines={1}>
                  {item.ultimo_messaggio}
                </Text>
              </View>
              <Text style={styles.rowDate}>{formatDate(item.ultimo_at)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loading: { marginTop: SPACING.s, color: COLORS.textMedium },
  header: { padding: SPACING.l, paddingBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16, marginBottom: SPACING.s },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.l },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.m },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: SPACING.s },
  emptyText: { fontSize: 14, color: COLORS.textMedium, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.large,
    padding: SPACING.m,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    ...SHADOW,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  avatarText: { fontSize: 24 },
  rowName: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  rowMessage: { fontSize: 13, color: COLORS.textMedium, marginTop: 2 },
  rowDate: { fontSize: 11, color: COLORS.textMedium, marginLeft: SPACING.s },
});
