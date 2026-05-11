import React, { useState, useCallback, useEffect } from 'react';
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
import EmptyState from '../components/EmptyState';

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

  // Polling automatico ogni 30s per badge unread aggiornati live
  useEffect(() => {
    const id = setInterval(carica, 30000);
    return () => clearInterval(id);
  }, [carica]);

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
        <EmptyState
          testID="chat-list-empty"
          emoji="💬"
          title="Le tue chat sono vuote"
          description="Inizia una conversazione toccando una gioia sulla mappa e contattando il donatore."
          ctaLabel="Vai alla mappa 🗺️"
          onCta={() => router.push('/mappa')}
        />
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
          renderItem={({ item }) => {
            const hasUnread = (item.unread || 0) > 0;
            return (
              <TouchableOpacity
                testID={`chat-row-${item.id}`}
                style={[styles.row, hasUnread && styles.rowUnread]}
                onPress={() =>
                  router.push({ pathname: '/chat/[id]', params: { id: item.id, nome: item.altro_nome } })
                }
              >
                <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
                  <Text style={styles.avatarText}>🙂</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, hasUnread && styles.rowNameUnread]}>
                    {item.altro_nome}
                  </Text>
                  <Text
                    style={[styles.rowMessage, hasUnread && styles.rowMessageUnread]}
                    numberOfLines={1}
                  >
                    {item.ultimo_messaggio}
                  </Text>
                </View>
                <View style={styles.rightCol}>
                  <Text style={[styles.rowDate, hasUnread && styles.rowDateUnread]}>
                    {formatDate(item.ultimo_at)}
                  </Text>
                  {hasUnread && (
                    <View style={styles.unreadBadge} testID={`chat-unread-${item.id}`}>
                      <Text style={styles.unreadBadgeText}>
                        {item.unread! > 99 ? '99+' : item.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
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
  avatarUnread: {
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  rowUnread: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F5',
  },
  rowName: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  rowNameUnread: { color: COLORS.primary, fontWeight: '900' },
  rowMessage: { fontSize: 13, color: COLORS.textMedium, marginTop: 2 },
  rowMessageUnread: { color: COLORS.textDark, fontWeight: '700' },
  rightCol: { alignItems: 'flex-end', marginLeft: SPACING.s, minWidth: 44 },
  rowDate: { fontSize: 11, color: COLORS.textMedium },
  rowDateUnread: { color: COLORS.primary, fontWeight: '700' },
  unreadBadge: {
    marginTop: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
});
