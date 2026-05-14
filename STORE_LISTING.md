# 🎯 STORE LISTING — App Store + Google Play

Versione corrente: **1.1.0** (buildNumber iOS: 2, versionCode Android: 2)

---

## 🇮🇹 ITALIANO (lingua primaria)

### Nome app (max 30 char)
```
JOY — Dona, ricevi gioia
```
*(24 caratteri)*

### Sottotitolo (max 30 char)
```
Regali gratuiti tra vicini
```
*(26 caratteri)*

### Promotional text (max 170 char) — modificabile senza review
```
Trasforma quello che non usi più nella gioia di qualcun altro. Dona vestiti, libri, giochi e ricevi grazie sincere ⭐
```
*(135 caratteri)*

### Descrizione lunga (max 4000 char)
```
✨ JOY — Risvegliamo il bene

JOY è la community italiana per donare e ricevere gratuitamente. Vestiti per bimbi, libri, giochi, coperte… tutto quello che non usi più può diventare la gioia di qualcun altro vicino a te.

🎁 COME FUNZIONA
1. Pubblica una “gioia” con fino a 3 foto in 30 secondi
2. Chi è vicino la vede sulla mappa o nella lista
3. Vi accordate in chat e vi incontrate per il passaggio
4. Lasciate una recensione reciproca

🗺️ TROVA GIOIE VICINO A TE
Mappa interattiva con pin colorati: blu per le gioie altrui, corallo per le tue. Filtra per categoria, distanza e città. Ricerca rapida con autocompletamento.

💬 CHAT INTEGRATA
Conversazioni dirette con donatori e riceventi. Badge non lette in stile WhatsApp. Notifiche push istantanee per ogni messaggio.

⭐ COMUNITÀ AFFIDABILE
Sistema di recensioni a 5 stelle: scegli con chi scambiare basandoti sulle valutazioni della community. Profili pubblici con foto, nome, città e media voti.

📤 PUBBLICA IN 30 SECONDI
Seleziona fino a 3 foto direttamente dalla galleria, scegli una categoria, scrivi 2 righe e via. La tua gioia è online.

🔒 PRIVACY E SICUREZZA
• I tuoi dati restano tuoi: non li vendiamo né condividiamo
• Puoi bloccare e segnalare utenti inappropriati
• Puoi cancellare account e dati in qualsiasi momento
• GDPR compliant

🌈 CATEGORIE
🍎 Cibo • 🧦 Vestiti bimbo • 🧸 Giochi • 📚 Libri • 🛏️ Coperte • 🎨 Disegni • 🌈 Altro

JOY è 100% gratuita, senza pubblicità e senza commissioni. La gioia non si compra: si condivide.

Hai feedback? Scrivici a hello@joyapp.it
Privacy: https://joyapp.it/privacy
Termini: https://joyapp.it/terms
```

### Keywords (max 100 char, separate da virgola, NO spazi)
```
dono,regalo,gratis,community,riuso,baratto,vestiti,giochi,libri,bambini,famiglia,sostenibile
```
*(95 caratteri)*

### URL di supporto
```
https://joyapp.it/support
```
*(o crea un Google Form: forms.gle/xxxxx)*

### URL marketing
```
https://joyapp.it
```
*(landing page — anche un semplice Notion pubblico va bene per iniziare)*

### URL Privacy Policy
```
https://joyapp.it/privacy
```
*(deve essere accessibile pubblicamente, vedi sotto sezione "Hosting Privacy")*

---

## 🇬🇧 ENGLISH (lingua secondaria — consigliata)

### Name
```
JOY — Give & Receive Joy
```

### Subtitle
```
Free gifts between neighbors
```

### Promotional text
```
Turn what you no longer use into joy for someone else. Donate clothes, books, toys and receive heartfelt thanks ⭐
```

### Description (lunga)
```
✨ JOY — Awakening kindness

JOY is the Italian community to give and receive for free. Kids' clothes, books, toys, blankets… everything you no longer use can become someone else's joy.

[… stessa struttura dell'italiano …]
```
*(traduci se vuoi entrare nell'App Store internazionale, opzionale al lancio)*

---

## 🎯 METADATA APP STORE CONNECT

| Campo | Valore |
|---|---|
| **Categoria primaria** | Stile di vita (Lifestyle) |
| **Categoria secondaria** | Social Network |
| **Età** | 4+ (no contenuti espliciti, ma c'è UGC → obbligatorio segnalazione/blocco ✅ implementato) |
| **Copyright** | © 2026 JOY App |
| **Price** | Gratis |
| **In-App Purchases** | Nessuno |
| **Trade Representative Contact Info** | (per UE, richiesto da DSA): nome reale + indirizzo |
| **Encryption** | No (ITSAppUsesNonExemptEncryption: false in app.json) ✅ |

---

## 📸 SCREENSHOT REQUIREMENTS

### iOS App Store (obbligatori)
Sono stati generati 5 mockup 1290×2796 in `frontend/store-assets/ios/`:
1. `01-mappa.png` — "Trova gioie vicino a te"
2. `02-home.png` — "Doni, libri, giochi… a portata di mano"
3. `03-dona.png` — "Pubblica una gioia in 30 secondi"
4. `04-chat.png` — "Conversa direttamente con chi dona"
5. `05-recensioni.png` — "Comunità affidabile basata su recensioni"

### Google Play (opzionali ma consigliati)
- Feature graphic 1024×500
- 2-8 screenshot telefono (min 320px lato corto)
- Usa gli stessi 5 mockup, Google li ridimensiona

---

## 🌐 HOSTING PRIVACY POLICY (3 opzioni veloci)

### Opzione 1: Notion pubblico (GRATIS, 5 min)
1. Apri [Notion.so](https://notion.so), crea pagina "JOY Privacy Policy"
2. Copia il testo da `app/legal/privacy.tsx`
3. Click "Share" → "Publish to web"
4. Usa l'URL Notion (es. `joyapp.notion.site/privacy`)

### Opzione 2: GitHub Pages (GRATIS, 10 min)
1. Crea repo `joyapp-legal` su GitHub
2. Aggiungi `privacy.html` e `terms.html`
3. Settings → Pages → Deploy from branch main
4. URL: `joyapp.github.io/joyapp-legal/privacy.html`

### Opzione 3: iubenda (€27/anno, PROFESSIONALE)
1. Vai su [iubenda.com](https://iubenda.com)
2. Compila il wizard (rispondi: "raccogliamo email, foto, posizione, chat")
3. Iubenda genera la policy in italiano + 9 altre lingue, sempre aggiornata
4. Copia l'URL e mettilo in app.json / store

---

## 📦 PRE-SUBMISSION CHECKLIST

- [x] Versione bumped a 1.1.0 in `app.json`
- [x] iOS `buildNumber: "2"`, Android `versionCode: 2`
- [x] Permessi iOS con frasi chiare (< 10 parole, beneficio utente esplicito)
- [x] `ITSAppUsesNonExemptEncryption: false` (no extra crypto)
- [x] `LSApplicationCategoryType: public.app-category.lifestyle`
- [x] Bottoni Segnala + Blocca utenti (Apple 1.2 UGC)
- [x] Cancella account (Apple 5.1.1)
- [x] Checkbox Termini + Privacy alla registrazione
- [x] Privacy Policy + Termini accessibili dal Profilo
- [ ] Backend produzione permanente (NON più URL preview Emergent)
- [ ] Privacy Policy pubblicata online (3 opzioni sopra)
- [ ] Marketing URL (anche semplice landing Notion)
- [ ] Account App Store Connect creato + paid
- [ ] Certificati distribution generati (EAS li gestisce automaticamente)

---

## 🚀 BUILD PRODUCTION (quando i ❌ sopra sono ✅)

```bash
cd /percorso/joy-app/frontend

# 1. Pull ultime modifiche
git pull

# 2. Build production iOS
eas build --profile production --platform ios
# Output: file .ipa firmato per distribuzione App Store
# Tempo: ~15-20 min

# 3. Submit a TestFlight + App Store Connect
eas submit --platform ios --latest
# Ti chiede: Apple ID, password (genera un'app-specific password)
# Carica .ipa su App Store Connect automaticamente
# Apple processa in 10-30 min

# 4. Vai su https://appstoreconnect.apple.com
# - Crea "New App" se non esiste
# - Compila: nome, sottotitolo, descrizione, keywords, categorie
# - Carica i 5 screenshot da frontend/store-assets/ios/
# - Aggiungi link Privacy Policy + Marketing URL
# - Submit for Review
# - Apple risponde in 24-48h (a volte 7 giorni il primo invio)
```

---

## 📝 NOTE FINALI

- **Build incrementi**: dopo ogni submit Apple, bump `version` (es. 1.1.1) E `buildNumber` (es. 3). Apple richiede un buildNumber sempre crescente.
- **TestFlight scade ogni 90 giorni**. Carica un nuovo build trimestrale durante la beta.
- **Rifiuti tipici Apple**:
  - "Guideline 5.1.1 (v)" → manca delete account (✅ fatto)
  - "Guideline 1.2" → manca segnalazione UGC (✅ fatto)
  - "Guideline 4.0 Design" → splash troppo lungo / crash al primo avvio
  - Sii pronto a un paio di iterazioni: è normale.
