import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Messaggio } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { tapLight } from '../../lib/haptic';

export default function ChatPrivataScreen() {
  const params = useLocalSearchParams<{ id: string; nome?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const convId = params.id as string;
  const altroNome = (params.nome as string) || 'Chat';

  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [testo, setTesto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const carica = useCallback(async () => {
    try {
      const res = await api.get<Messaggio[]>(`/conversazioni/${convId}/messaggi`);
      setMessaggi(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [convId]);

  useEffect(() => {
    carica();
    const interval = setInterval(carica, 4000);
    return () => clearInterval(interval);
  }, [carica]);

  const invia = async () => {
    if (!testo.trim()) return;
    const t = testo.trim();
    setTesto('');
    tapLight();
    try {
      setSending(true);
      const res = await api.post<Messaggio>(`/conversazioni/${convId}/messaggi`, { testo: t });
      setMessaggi((prev) => [...prev, res.data]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Errore', 'Impossibile inviare il messaggio');
      setTesto(t);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} testID="chat-privata-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity testID="chat-priv-back" onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{altroNome}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={{ padding: SPACING.m }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messaggi.length === 0 ? (
            <Text style={styles.empty}>Inizia la conversazione 💬</Text>
          ) : (
            messaggi.map((m) => {
              const isMine = m.mittente_id === user?.id;
              return (
                <View key={m.id} style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, isMine && { color: COLORS.white }]}>{m.testo}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            testID="chat-msg-input"
            style={styles.input}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={COLORS.textMedium}
            value={testo}
            onChangeText={setTesto}
            multiline
            onSubmitEditing={invia}
          />
          <TouchableOpacity
            testID="chat-send-btn"
            style={styles.sendBtn}
            onPress={invia}
            disabled={sending || !testo.trim()}
          >
            <Text style={styles.sendText}>Invia</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backText: { color: COLORS.primary, fontSize: 24, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  messagesArea: { flex: 1 },
  empty: { textAlign: 'center', color: COLORS.textMedium, marginTop: SPACING.xl },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: '80%',
  },
  mine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  bubbleText: { color: COLORS.textDark, fontSize: 15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.secondaryBg,
    borderRadius: 24,
    paddingHorizontal: SPACING.m,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    maxHeight: 100,
    color: COLORS.textDark,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: 12,
    borderRadius: RADIUS.medium,
    marginLeft: SPACING.s,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendText: { color: COLORS.white, fontWeight: '800' },
});
