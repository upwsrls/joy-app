# \ud83d\ude80 PRODUCTION RUNBOOK \u2014 JOY 1.1.0

Guida step-by-step per portare JOY su TestFlight e poi App Store.\nOgni step ha un \u201c\u2705 done quando\u201d chiaro \u2014 spunta man mano che procedi.

---

## \ud83d\udce6 PREREQUISITI

| Cosa serve | Costo | Tempo |
|---|---|---|
| Account Apple Developer | $99/anno | Registrazione 1-3 giorni |
| Dominio joyshare.it | (gi\u00e0 tuo \u2713) | \u2014 |
| Backend hosting permanente | gratis-€15/mese | 30-60 min setup |
| MongoDB Atlas (DB cloud) | gratis (M0 512MB) | 15 min setup |

---

## STEP A \u2014 BACKEND DI PRODUZIONE PERMANENTE

Il backend attuale gira sull\u2019URL preview di Emergent (`mood-tracker-619.preview.emergentagent.com`) che \u00e8 temporaneo.\nDevi spostarlo su un host stabile + collegare il sottodominio `api.joyshare.it`.

### A.1 \u2014 Setup MongoDB Atlas (DB cloud gratis)

1. Vai su [cloud.mongodb.com](https://cloud.mongodb.com) e crea un account gratuito
2. Crea un **cluster M0 Free** (512 MB, basta per il MVP)
   - Region: **Frankfurt** o **Milan** (latenza bassa per utenti italiani)
3. **Network Access** \u2192 IP Allow List \u2192 Aggiungi `0.0.0.0/0` (consenti da ovunque, finch\u00e9 sei in beta)
4. **Database Access** \u2192 New User \u2192 username `joy-prod`, generated password
5. **Database** \u2192 Connect \u2192 \u201cDrivers\u201d \u2192 copia la connection string:\n   ```\n   mongodb+srv://joy-prod:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n   ```

### A.2 \u2014 Deploy backend (3 opzioni)

#### Opzione 1: Emergent Native Deployment (\u26a1 PI\u00d9 SEMPLICE)

Nell\u2019interfaccia Emergent, click su **Deploy** \u2192 segue il wizard.\nDopo il deploy ti d\u00e0 un URL stabile tipo `https://joy-prod.emergent.app` (variabile dal piano).\nNel pannello di gestione:
- Setta env var `MONGO_URL` alla stringa MongoDB Atlas
- Setta `CLOUDINARY_*` se le usi
- Setta `JWT_SECRET` (genera una stringa random di 64 char)

#### Opzione 2: Render.com (gratis con cold start)

```bash
# 1. Crea account su render.com\n# 2. New \u2192 Web Service \u2192 Connect repo GitHub\n# 3. Settings:\nName:           joy-api\nRegion:         Frankfurt\nBranch:         main\nRoot Directory: backend\nRuntime:        Python 3\nBuild Command:  pip install -r requirements.txt\nStart Command:  uvicorn server:app --host 0.0.0.0 --port $PORT\n\n# 4. Environment variables (Settings \u2192 Environment):\nMONGO_URL=mongodb+srv://...\nDB_NAME=joy_prod\nJWT_SECRET=<random_64_char>\nCLOUDINARY_CLOUD_NAME=...\nCLOUDINARY_API_KEY=...\nCLOUDINARY_API_SECRET=...\n```

> \u26a0\ufe0f Piano gratuito Render: cold start 30s dopo 15 min di inattivit\u00e0. Per produzione vera, upgrade a $7/mese (Starter).

#### Opzione 3: Railway.app ($5 credito gratuito, no cold start)

```bash
# 1. Vai su railway.app, login con GitHub\n# 2. New Project \u2192 Deploy from GitHub repo \u2192 seleziona joy repo\n# 3. Settings:\nRoot Directory:  backend\nStart Command:   uvicorn server:app --host 0.0.0.0 --port $PORT\n\n# 4. Variables (uguali a Render)\n# 5. Settings \u2192 Networking \u2192 Generate Domain \u2192 ottieni un URL temporaneo\n```

### A.3 \u2014 Collega api.joyshare.it al backend

1. Vai dal tuo registrar (chi gestisce joyshare.it) \u2192 DNS settings
2. Aggiungi record:
   - **Render**: tipo `CNAME`, nome `api`, valore `<your-app>.onrender.com`
   - **Railway**: tipo `CNAME`, nome `api`, valore `<your-app>.up.railway.app`
   - **Emergent**: dipende dal piano, fornisce istruzioni
3. Nel pannello del provider scelto, aggiungi il dominio custom `api.joyshare.it`
4. Aspetta certificato SSL (Let\u2019s Encrypt, automatico, 1-5 min)
5. **Verifica**:
   ```bash\n   curl https://api.joyshare.it/api/\n   # Risposta attesa: {\"message\":\"JOY API ready\",\"version\":\"2.0.0\"}\n   ```

\u2705 **Done quando**: `curl https://api.joyshare.it/api/` ritorna 200.

---

## STEP B \u2014 APPLE DEVELOPER ACCOUNT

### B.1 \u2014 Sottoscrizione ($99/anno)

1. Vai su [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)
2. Login con il tuo Apple ID (consigliato: uno **dedicato** all\u2019app, non personale)
3. Scegli **Individual** (\u20ac99) o **Organization** (\u20ac99 + serve P.IVA + DUNS number)
4. Compila form, paga, aspetta email di conferma (1-3 giorni)

\u2705 **Done quando**: ricevi email \u201cWelcome to the Apple Developer Program\u201d.

### B.2 \u2014 App Store Connect setup

1. Vai su [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps \u2192 + \u2192 New App**
3. Compila:
   - Platform: **iOS**
   - Name: **JOY**
   - Primary Language: **Italian**
   - Bundle ID: seleziona **com.joyapp.giftapp** (gi\u00e0 registrato via EAS, se non vedi: vai prima a B.3)
   - SKU: `joy-app-2026` (qualsiasi stringa unica)
   - User Access: Full Access

### B.3 \u2014 Genera certificati (EAS lo fa per te)

Quando lanci `eas build --profile production --platform ios`, EAS ti chiede:
```
\u2728 Do you have an Apple ID? \u2192 Yes
   Email: tuo-apple-id@email.com\n   Password: ***\n   Two-factor: 123456 (codice SMS)\n\u2728 What would you like to do? \u2192 Generate new certificate
```
EAS genera distribution certificate + provisioning profile + push key automaticamente.

\u2705 **Done quando**: vedi \u201cBuild submitted\u201d nel terminale di `eas build`.

---

## STEP C \u2014 PUBBLICAZIONE PRIVACY POLICY + TERMINI

Hai gi\u00e0 i testi in `app/frontend/app/legal/privacy.tsx` e `terms.tsx`. Devi ANCHE renderli accessibili come **pagine web pubbliche** (Apple lo verifica).

### Opzione veloce: Notion pubblico (15 min, gratis)

1. Crea pagina su [notion.so](https://notion.so): \u201cJOY Privacy Policy\u201d
2. Copia il contenuto da `legal/privacy.tsx` (i blocchi `<Text>` come paragrafi)
3. Share \u2192 Publish to web \u2192 copia URL (es. `joy-app.notion.site/privacy-XXXX`)
4. Ripeti per Termini
5. Configura redirect dal tuo dominio:\n   - DNS joyshare.it \u2192 aggiungi record CNAME `privacy` \u2192 `joy-app.notion.site`\n   - Oppure pi\u00f9 semplice: usa direttamente i URL Notion negli store

### Opzione professionale: GitHub Pages (30 min, gratis, joyshare.it/privacy)

```bash
# 1. Crea repo GitHub: joyshare-web\n# 2. Aggiungi 2 file: privacy.html, terms.html (con HTML semplice dei testi)\n# 3. Settings \u2192 Pages \u2192 Deploy from branch main\n# 4. Custom domain: joyshare.it (aggiungi record CNAME)\n# URL finali: https://joyshare.it/privacy.html\n```

\u2705 **Done quando**: `curl -I https://joyshare.it/privacy` (o l\u2019URL scelto) ritorna 200.

---

## STEP D \u2014 BUILD PRODUCTION + TESTFLIGHT

### D.1 \u2014 Aggiorna app.json (opzionale, per ogni release)

Quando vorrai pubblicare la 1.2.0, aggiorna:
```json
\"version\": \"1.2.0\",\n\"ios\": { \"buildNumber\": \"3\" },\n\"android\": { \"versionCode\": 3 }\n```
Per ora (1.1.0, buildNumber 2) sei pronto.

### D.2 \u2014 Build production

```bash
cd /percorso/joy-app/frontend\n\n# Pull ultime modifiche\ngit pull\n\n# Build production iOS (~15-20 min)\neas build --profile production --platform ios\n```

EAS ti chieder\u00e0 (prima volta):
- Apple ID + password + codice 2FA
- Genera distribution certificate? **Yes**
- Genera provisioning profile? **Yes**
- Genera push notification key? **Yes**

Al termine ti d\u00e0 un URL del .ipa. Salvalo.

\u2705 **Done quando**: vedi \u201cBuild succeeded\u201d e ricevi email da Expo.

### D.3 \u2014 Submit a TestFlight + App Store Connect

```bash
# Compila prima eas.json submit.production con i tuoi dati Apple\neas submit --profile production --platform ios --latest
```

Oppure manualmente: scarica il .ipa, apri **Transporter** (Mac App Store), drag&drop il .ipa.

\u2705 **Done quando**: vedi il build in App Store Connect \u2192 **TestFlight** tab.

### D.4 \u2014 Compila info App Store Connect

Vai su [appstoreconnect.apple.com](https://appstoreconnect.apple.com) \u2192 JOY \u2192 sezione **iOS App 1.1.0**:

1. **App Information**:
   - Privacy Policy URL: `https://joyshare.it/privacy`
   - Category: Lifestyle (primaria) + Social Networking (secondaria)

2. **Pricing and Availability**:
   - Price: **Free**
   - Availability: Italia (per iniziare) o tutto il mondo

3. **App Privacy** (formulario):
   - Dichiari: Email, Name, Photos, Coarse Location, User Content, Identifiers
   - Use: App Functionality (no advertising, no analytics di terzi)

4. **iOS App 1.1.0**:
   - Promotional Text, Description, Keywords \u2192 copia da `STORE_LISTING.md`
   - Screenshots: carica i 5 PNG da `frontend/store-assets/ios/`
   - Support URL: `https://joyshare.it/support` (o pagina Notion)
   - Marketing URL: `https://joyshare.it`
   - Copyright: \u00a9 2026 JOY App

5. **App Review Information**:
   - Sign-in info: \u2705 (anche se l\u2019app richiede login)
     - Username: `test@joyshare.it`
     - Password: `Test2026!`
     - Crea questo account beta nel DB di produzione
   - Notes: \u201cApp per donazioni gratuite tra utenti. Per testare, login con le credenziali sopra. Le gioie pubblicate sono mock per la review.\u201d
   - Contact: tuo telefono + email

### D.5 \u2014 TestFlight Beta Test

In App Store Connect \u2192 **TestFlight**:

1. Attendi che il build venga processato (10-30 min, ricevi email)
2. Vai su TestFlight \u2192 il tuo build \u2192 **Provide Export Compliance** \u2192 \u201cNo\u201d (gi\u00e0 settato in app.json)
3. **Internal Testing**:
   - Crea gruppo \u201cFamiglia & Amici\u201d
   - Add Apple IDs degli amici (max 100)
   - Sono attivi subito, ricevono notifica TestFlight
4. **External Testing** (opzionale, fino a 10.000 tester):
   - Crea gruppo, aggiungi email
   - Apple fa una **Beta App Review** (24-48h)
   - Approvato \u2192 condividi link pubblico TestFlight

\u2705 **Done quando**: 3-5 amici hanno installato e testato.

---

## STEP E \u2014 SUBMIT FOR REVIEW (App Store finale)

Quando i feedback TestFlight sono positivi:

1. App Store Connect \u2192 JOY \u2192 **iOS App 1.1.0** \u2192 in fondo \u201cAdd for Review\u201d
2. Apple ti pone qualche domanda:\n   - **Encryption**: No (gi\u00e0 in app.json `ITSAppUsesNonExemptEncryption: false`)\n   - **Idfa**: No (non tracciamo)\n   - **Content Rights**: Yes, sono nostri o utenti\n3. **Submit for Review**
4. Apple risponde in 24-48h (a volte 7 giorni il primo invio)

### Possibili rifiuti tipici JOY

| Codice | Causa | Fix |
|---|---|---|
| 5.1.1 (v) | Manca delete account | \u2705 gi\u00e0 implementato |
| 1.2 | Manca segnalazione UGC | \u2705 gi\u00e0 implementato |
| 4.0 | Splash crash / troppo lungo | Splash \u00e8 2.6s, dovrebbe essere OK |
| 2.1 | App crash al primo avvio | Test su iPhone fisico prima |
| 5.1.1 (i) | Privacy policy non chiara | Verifica URL accessibile |

Se rifiutano, ti dicono **esattamente** cosa fixare. Patcha, ri-submit. Normale 1-2 iterazioni.

\u2705 **Done quando**: status diventa **\u201cReady for Sale\u201d** + email \u201cYour app is now available\u201d.

---

## STEP F \u2014 POST-LANCIO

1. **Monitora le crash** in App Store Connect \u2192 Analytics
2. **Rispondi alle recensioni** appena arrivano
3. **TestFlight scade ogni 90 giorni** \u2192 carica un nuovo build trimestrale durante la beta
4. **Ogni nuova versione**:\n   - Bump `version` (1.1.0 \u2192 1.1.1 patch, 1.2.0 feature, 2.0.0 major)\n   - Bump `buildNumber` (sempre +1, mai duplicato)\n   - `eas build --profile production --platform ios`\n   - `eas submit --profile production --platform ios --latest`\n   - In App Store Connect: \u201c+ Version\u201d, compila What\u2019s New, Submit for Review

---

## \ud83d\udcdd LINKS UTILI

- [Apple Developer](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [EAS Docs](https://docs.expo.dev/eas/)
- [MongoDB Atlas](https://cloud.mongodb.com)
- [TestFlight Help](https://developer.apple.com/testflight/)

\ud83c\udf89 **In bocca al lupo per il lancio di JOY!**
