# JOY App - Product Requirements (V2)

## Overview
JOY is an Italian Expo (React Native) app that lets families donate or receive items they no longer use (food, kids' clothes, toys, books, blankets, drawings, etc.) for free, locally. Migrated from a Supabase-based codebase to FastAPI + MongoDB on the Emergent platform. **V2** introduces Cloudinary image storage and a modular backend.

## Tech Stack
- **Frontend**: Expo SDK 54 + Expo Router (file-based), TypeScript, react-native-maps@1.20.1 (mobile only, list fallback on web), expo-image-picker, expo-location, axios, AsyncStorage
- **Backend**: FastAPI + MongoDB (motor async)
- **Auth**: JWT (HS256, 30-day expiry) + bcrypt password hashing
- **Image storage**: **Cloudinary** (`drmrh9h7f`), user-scoped folders `joy/<user_id>/...`
- **Real-time**: polling (4s) for chat list & messages

## Backend Structure (modular)
```
/app/backend/
├── server.py                 # Slim FastAPI entrypoint, mounts /api routers
├── core/
│   ├── config.py             # env-loaded Settings
│   ├── database.py           # Mongo client + ensure_indexes
│   ├── security.py           # bcrypt, JWT, get_current_user dependency
│   └── cloudinary_service.py # upload_base64, safe_destroy, public_id_from_url
└── routes/
    ├── auth.py               # /api/auth/*
    ├── profile.py            # /api/profile/*
    ├── uploads.py            # /api/uploads/image
    ├── dono.py               # /api/doni/*
    └── chat.py               # /api/conversazioni/*
```

## User Flow
Login/Register → Profile Setup → Onboarding (skippable) → Home → Dona / Mappa / Chat

## Backend Endpoints (all under `/api`)
### Auth (no token required)
- `POST /auth/register` — { email, password (min 6) } → { access_token, user_id, email }
- `POST /auth/login` — same
- `GET /auth/me` — current user

### Profile
- `GET /profile/me` — backward-compat: rehydrates legacy `foto_base64` into `foto_url`
- `PUT /profile/me` — { nome, citta, telefono?, foto_url? }
- `GET /profile/{user_id}`

### Uploads (NEW in V2)
- `POST /uploads/image` — { base64 } → { secure_url, public_id }. Auth required, max ~9 MB binary, user-scoped Cloudinary folder.

### Doni (gifts)
- `POST /doni` — { titolo, descrizione?, categoria, lat, lng, foto_urls (1-3) }
- `GET /doni` — all non-collected gifts (backward-compat for legacy `foto_base64_list`)
- `GET /doni/miei` — current user's gifts
- `GET /doni/{id}`
- `DELETE /doni/{id}` — soft-delete + best-effort Cloudinary destroy

### Conversazioni / Messaggi
- `GET /conversazioni`
- `POST /conversazioni/start/{altro_user_id}`
- `GET /conversazioni/{conv_id}/messaggi`
- `POST /conversazioni/{conv_id}/messaggi`

## Frontend Routes
- `/` splash + redirect logic
- `/login`, `/register`
- `/profile-setup` (uploads photo to Cloudinary then PUTs profile)
- `/onboarding`
- `/home`
- `/dona` (uploads each photo to Cloudinary on selection; in-modal city search)
- `/mappa` (native map on iOS/Android, list fallback on web)
- `/chat-list`, `/chat/[id]`
- `/dono/[id]`

## Image Upload Flow (V2)
1. User taps "Aggiungi foto" → `expo-image-picker` returns base64
2. Frontend POSTs `data:image/jpeg;base64,...` to `/api/uploads/image`
3. Backend uploads to Cloudinary, returns `secure_url`
4. Frontend stores the URL in form state (no large base64 lingering in memory)
5. On "Pubblica", frontend POSTs `/api/doni` with `foto_urls: [https://...]`

## Theme
Primary `#4A90E2`, Background `#D9ECFF`, CardBorder `#BBDEFB`, TextDark `#1E3A8A`. Italian copy, emoji-driven category icons.

## Categories
🍎 Cibo · 🧦 Vestiti bimbo · 🧸 Giochi · 📚 Libri · 🛏️ Coperte · 🎨 Disegni · 🌈 Altro

## Test status
- Backend V2: **42/42 tests PASS** (auth, profile, Cloudinary upload roundtrip, doni CRUD with foto_urls, backward-compat for legacy foto_base64/foto_base64_list, chat flow, auth gating). Report: `/app/test_reports/iteration_2.json`.
