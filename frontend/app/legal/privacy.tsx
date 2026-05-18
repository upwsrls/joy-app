import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>Privacy Policy</Text>
        <Text style={s.meta}>Ultimo aggiornamento: maggio 2026</Text>

        <Text style={s.h2}>1. Chi siamo</Text>
        <Text style={s.p}>JOY Share è un'applicazione mobile gratuita che permette agli utenti di donare e ricevere oggetti tra vicini, all'interno di una community basata su recensioni.</Text>

        <Text style={s.h2}>2. Dati che raccogliamo</Text>
        <Text style={s.p}>• Email e password (cifrata) per la creazione dell'account.
• Nome, città, foto profilo e telefono (opzionale) inseriti nel profilo.
• Foto, titolo, descrizione e categoria delle gioie pubblicate.
• Posizione GPS quando pubblichi una gioia o cerchi sulla mappa.
• Messaggi inviati e ricevuti in chat.
• Recensioni date e ricevute.
• Token push notifications (anonimo) per inviarti notifiche.</Text>

        <Text style={s.h2}>3. Come usiamo i dati</Text>
        <Text style={s.p}>Usiamo i tuoi dati esclusivamente per far funzionare JOY Share: mostrare gioie nelle vicinanze, far comunicare donatori e riceventi, inviare notifiche pertinenti. Non vendiamo né condividiamo i tuoi dati con terze parti per scopi commerciali.</Text>

        <Text style={s.h2}>4. Servizi terzi</Text>
        <Text style={s.p}>• Cloudinary (USA, GDPR-compliant) — hosting delle foto caricate.
• Expo Push Notifications — invio notifiche push.
• OpenStreetMap Nominatim — geocoding indirizzi.</Text>

        <Text style={s.h2}>5. I tuoi diritti</Text>
        <Text style={s.p}>Hai sempre il diritto di:
• Accedere ai tuoi dati (dal Profilo)
• Modificare i tuoi dati (dal Profilo)
• Cancellare il tuo account (dal Profilo → Cancella account) — operazione definitiva
• Esportare i tuoi dati (scrivici a hello@joyapp.it)
• Opporti al trattamento (scrivici a hello@joyapp.it)</Text>

        <Text style={s.h2}>6. Conservazione dati</Text>
        <Text style={s.p}>Conserviamo i tuoi dati per tutto il tempo in cui l'account è attivo. Alla cancellazione dell'account, profilo e dati personali vengono rimossi immediatamente; le tue gioie attive vengono rimosse; recensioni date/ricevute vengono mantenute in forma anonima per preservare la coerenza della community.</Text>

        <Text style={s.h2}>7. Sicurezza</Text>
        <Text style={s.p}>Le password sono memorizzate con hashing bcrypt. La comunicazione client-server avviene via HTTPS. I dati MongoDB sono in cloud protetto.</Text>

        <Text style={s.h2}>8. Età minima</Text>
        <Text style={s.p}>JOY Share è destinata a utenti di 14 anni o più. Se sei minorenne, è richiesto il consenso di un genitore.</Text>

        <Text style={s.h2}>9. Modifiche</Text>
        <Text style={s.p}>Eventuali modifiche a questa Privacy verranno notificate via email e in-app.</Text>

        <Text style={s.h2}>10. Contatti</Text>
        <Text style={s.p}>Per qualsiasi richiesta sulla privacy: hello@joyapp.it</Text>

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
