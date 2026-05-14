import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native';
import { api } from '../lib/api';
import { COLORS, SPACING, RADIUS } from '../lib/theme';

type TargetType = 'dono' | 'utente' | 'recensione' | 'messaggio';

type Props = {
  visible: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  onReported?: () => void;
};

const REASONS: { code: string; label: string }[] = [
  { code: 'spam', label: '📢 Spam o pubblicità' },
  { code: 'contenuto_offensivo', label: '🚫 Contenuto offensivo o discriminatorio' },
  { code: 'truffa', label: '⚠️ Truffa o richiesta di denaro' },
  { code: 'inappropriato', label: '🔞 Contenuto inappropriato' },
  { code: 'minorenne', label: '👶 Mette in pericolo un minore' },
  { code: 'altro', label: '✏️ Altro motivo' },
];

export default function ReportSheet({ visible, onClose, targetType, targetId, onReported }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return Alert.alert('Scegli un motivo');
    try {
      setSubmitting(true);
      await api.post('/segnalazioni', { target_type: targetType, target_id: targetId, reason, note });
      Alert.alert(
        '✅ Segnalazione inviata',
        'Grazie. La esamineremo entro 24 ore e prenderemo provvedimenti se necessario.',
        [{ text: 'OK', onPress: () => { setReason(null); setNote(''); onReported?.(); onClose(); } }],
      );
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile inviare la segnalazione');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: SPACING.l }}>
            <Text style={s.title}>Segnala contenuto</Text>
            <Text style={s.subtitle}>Aiutaci a mantenere JOY una community sicura.</Text>

            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.code}
                style={[s.option, reason === r.code && s.optionActive]}
                onPress={() => setReason(r.code)}
              >
                <Text style={[s.optionText, reason === r.code && s.optionTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.label}>Note (opzionali)</Text>
            <TextInput
              style={s.input}
              placeholder="Aggiungi dettagli..."
              placeholderTextColor={COLORS.textMedium}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
            />

            <TouchableOpacity style={s.submit} onPress={submit} disabled={submitting || !reason}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitText}>Invia segnalazione</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ marginTop: SPACING.s }}>
              <Text style={s.cancel}>Annulla</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textMedium, textAlign: 'center', marginTop: 4, marginBottom: SPACING.l },
  option: {
    padding: 14, borderRadius: RADIUS.medium, borderWidth: 1.5, borderColor: COLORS.cardBorder,
    marginBottom: SPACING.s, backgroundColor: COLORS.background,
  },
  optionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.secondaryBg },
  optionText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  optionTextActive: { color: COLORS.primary, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginTop: SPACING.m, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.inputBorder, borderRadius: RADIUS.medium,
    padding: 12, minHeight: 80, textAlignVertical: 'top', backgroundColor: COLORS.white,
    fontSize: 14, color: COLORS.textDark,
  },
  submit: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.medium,
    alignItems: 'center', marginTop: SPACING.l, minHeight: 48, justifyContent: 'center',
  },
  submitText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  cancel: { textAlign: 'center', color: COLORS.textMedium, fontWeight: '600', padding: SPACING.s },
});
