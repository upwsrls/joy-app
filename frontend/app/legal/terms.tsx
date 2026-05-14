import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '../../lib/theme';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>Termini di Servizio</Text>
        <Text style={s.meta}>Ultimo aggiornamento: maggio 2026</Text>

        <Text style={s.h2}>1. Accettazione</Text>
        <Text style={s.p}>Creando un account su JOY accetti integralmente questi Termini e la nostra Privacy Policy.</Text>

        <Text style={s.h2}>2. Cos'è JOY</Text>
        <Text style={s.p}>JOY è una piattaforma gratuita che facilita la donazione di oggetti tra utenti privati. Non siamo parte degli scambi: agiamo come semplice intermediario tecnico.</Text>

        <Text style={s.h2}>3. Regole della community</Text>
        <Text style={s.p}>Pubblicando contenuti su JOY ti impegni a:
• Pubblicare solo gioie tue e in buone condizioni
• Non chiedere né accettare denaro per i passaggi
• Non pubblicare contenuti illegali, offensivi, discriminatori, sessualmente espliciti, violenti o che violino diritti altrui
• Non pubblicare animali vivi, armi, medicinali, alimenti deperibili o oggetti pericolosi
• Rispettare gli altri utenti nei messaggi e nelle recensioni</Text>

        <Text style={s.h2}>4. Contenuti vietati</Text>
        <Text style={s.p}>Ci riserviamo il diritto di rimuovere immediatamente e senza preavviso qualsiasi contenuto che violi questi Termini, e di sospendere/bannare gli utenti responsabili.</Text>

        <Text style={s.h2}>5. Segnalazioni</Text>
        <Text style={s.p}>Puoi segnalare contenuti o utenti inappropriati direttamente dall'app. Esaminiamo ogni segnalazione entro 24 ore.</Text>

        <Text style={s.h2}>6. Responsabilità degli utenti</Text>
        <Text style={s.p}>Ogni utente è personalmente responsabile dei contenuti pubblicati e delle interazioni con gli altri utenti. JOY non garantisce la qualità, sicurezza, legalità o accuratezza degli oggetti donati, né l'affidabilità degli utenti.</Text>

        <Text style={s.h2}>7. Limitazione di responsabilità</Text>
        <Text style={s.p}>JOY è fornito "così com'è". Non siamo responsabili per danni diretti o indiretti derivanti dall'uso dell'app, da incontri tra utenti, o da malfunzionamenti del servizio.</Text>

        <Text style={s.h2}>8. Cancellazione account</Text>
        <Text style={s.p}>Puoi cancellare il tuo account in qualsiasi momento dal Profilo → Cancella account. La cancellazione è immediata e definitiva.</Text>

        <Text style={s.h2}>9. Modifiche ai Termini</Text>
        <Text style={s.p}>Eventuali modifiche verranno notificate via email e in-app con almeno 15 giorni di preavviso.</Text>

        <Text style={s.h2}>10. Legge applicabile</Text>
        <Text style={s.p}>Questi Termini sono regolati dalla legge italiana. Foro competente: Milano.</Text>

        <Text style={s.h2}>11. Contatti</Text>
        <Text style={s.p}>hello@joyapp.it</Text>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.l },
  back: { marginBottom: SPACING.s },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.textDark, marginTop: SPACING.s },
  meta: { fontSize: 12, color: COLORS.textMedium, marginBottom: SPACING.l },
  h2: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginTop: SPACING.l, marginBottom: SPACING.xs },
  p: { fontSize: 14, color: COLORS.textDark, lineHeight: 22 },
});
