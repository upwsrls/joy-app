# 📱 Build EAS — Guida step-by-step per iOS (e Android)

Questa guida ti porta dal codice attuale a un **dev build EAS** installato sul tuo
iPhone (e/o telefono Android), così funzioneranno anche le **notifiche push remote**
che in Expo Go SDK 53+ non sono più disponibili.

> 💡 Tutti i comandi qui sotto si lanciano dal **TUO computer** (non dal cloud).
> Devi avere installati: Node.js 20+, git, e questo repo clonato in locale.

---

## 1) Una volta sola — Setup EAS CLI

```bash
npm install -g eas-cli
cd /path/al/tuo/joy-app/frontend
eas login           # email + password Expo
eas whoami          # verifica account
```

## 2) Una volta sola — Inizializza il progetto su EAS

Dalla cartella `frontend/`:

```bash
eas init            # ti chiede di confermare nome slug/owner. Conferma.
```

Questo aggiunge automaticamente un `extra.eas.projectId` in `app.json`.
**Commit/push del file `app.json` aggiornato.**

## 3) Una volta sola — Configura le credenziali iOS

Per il build iOS serve **Apple Developer Account ($99/anno)** + il tuo iPhone
registrato come dispositivo di test.

```bash
eas device:create
```

Segui le istruzioni: ti darà un link/QR da aprire sul tuo iPhone per registrare
l'UDID. Una volta fatto, il device sarà disponibile per i build.

## 4) Build di sviluppo iOS

```bash
eas build --profile development --platform ios
```

EAS:
- Ti chiede la password Apple (la prima volta) e crea il provisioning profile.
- Il build dura ~10-20 minuti.
- Al termine ricevi un link `.ipa` + un QR per installarlo sul tuo iPhone.
- Apri il QR sul telefono o scansionalo, e installa la **JOY (dev)** app.

> ℹ️ Il `eas.json` è già configurato nel progetto con il profilo `development`.

## 5) Avvia il dev server con dev client

Dal tuo computer:

```bash
cd frontend
npx expo start --dev-client
```

Apri **JOY (dev)** sul telefono e collega il dev client (scansiona il QR).
Le push notifications ora funzionano davvero!

## 6) Build Android (opzionale, da provare con un amico)

```bash
eas build --profile development --platform android
```

Non richiede account a pagamento. Il `.apk` risultante si installa direttamente
abilitando "Origini sconosciute" su Android.

---

## 🔔 Cosa attiverà una notifica push (V7b)

| Trigger | Titolo notifica | Corpo |
|---|---|---|
| Qualcuno ti scrive in chat | 💬 Nome mittente | Testo del messaggio (max 140 char) |
| Qualcuno ritira una tua gioia | 🎁 La tua gioia è stata ritirata! | "Mario ha ricevuto 'Libri'" |
| Qualcuno ti recensisce | ⭐ Nuova recensione ricevuta | "Maria ti ha lasciato ⭐⭐⭐⭐⭐" |
| Qualsiasi utente pubblica una nuova gioia | 🌍 Nuova gioia in Italia! | "Paolo · Roma ha pubblicato: Vestiti bimbo" |

Le push vengono inviate dal backend via **Expo Push API gratuita** (no Apple/FCM
keys da gestire — Expo si occupa del routing).

## 🔧 Debug rapido

- **"No token returned"** sul login → il device non ha permessi notifica.
  Vai in Impostazioni iOS → JOY (dev) → Notifiche → Abilita tutte.
- **Push non arriva** → controlla che `push_token` esista nel DB:
  ```
  GET /api/auth/me  → poi verifica db.users con tuo user_id
  ```
- **Build EAS fallisce** → `eas build:list` per vedere errori e `eas build:view <id>`.

---

## ✅ Checklist prima del primo build

- [ ] Node 20+ installato (`node -v`)
- [ ] `eas-cli` globale installato
- [ ] Login a Expo (`eas whoami`)
- [ ] Apple Developer Account attivo (per iOS)
- [ ] iPhone registrato (`eas device:list` lo mostra)
- [ ] `app.json` ha `bundleIdentifier: com.joyapp.giftapp` (già impostato ✓)
- [ ] `eas.json` presente nel progetto (già creato ✓)
- [ ] `expo-notifications` + `expo-device` installati (già fatto ✓)

Tutto pronto! 🚀
