# JOY App - Product Requirements

## Overview
JOY is an Italian React Native (Expo) app that lets families donate or receive items they no longer use (food, kids' clothes, toys, books, blankets, drawings, etc.) for free, locally. Migrated from a Supabase-based codebase to FastAPI + MongoDB on the Emergent platform.

## Tech Stack
- Frontend: Expo SDK 54 + Expo Router (file-based routing), TypeScript, react-native-maps (mobile only, list fallback on web), expo-image-picker, expo-location
- Backend: FastAPI + MongoDB (motor async)
- Auth: JWT (HS256) + bcrypt password hashing
- Image storage: base64 in MongoDB
- Real-time: polling (4s) on chat list & messages

## User Flow
Login/Register → Profile Setup → Onboarding (skippable) → Home → Dona / Mappa / Chat

## Backend Endpoints (all under `/api`)
### Auth (no token required)
- `POST /auth/register` — body: { email, password (min 6) } → returns { access_token, user_id, email }
- `POST /auth/login` — same body, same return
- `GET /auth/me` — returns current user

### Profile
- `GET /profile/me`
- `PUT /profile/me` — body: { nome, citta, telefono?, foto_base64? }
- `GET /profile/{user_id}`

### Doni (gifts)
- `POST /doni` — body: { titolo, descrizione?, categoria, lat, lng, foto_base64_list (1-3) }
- `GET /doni` — list of all non-collected gifts
- `GET /doni/miei` — current user's gifts
- `GET /doni/{id}`
- `DELETE /doni/{id}` — soft-delete (sets ritirato=true)

### Conversazioni / Messaggi
- `GET /conversazioni` — list user's conversations (with last message)
- `POST /conversazioni/start/{altro_user_id}` — get or create 1:1 conversation
- `GET /conversazioni/{conv_id}/messaggi`
- `POST /conversazioni/{conv_id}/messaggi` — body: { testo }

## Frontend Routes
- `/` — splash + redirect logic
- `/login`, `/register`
- `/profile-setup`
- `/onboarding`
- `/home`
- `/dona`, `/cerca-citta`
- `/mappa`
- `/chat-list`, `/chat/[id]`
- `/dono/[id]`

## Theme
- Primary: #4A90E2 (light blue)
- Background: #D9ECFF
- CardBorder: #BBDEFB
- TextDark: #1E3A8A

## Categories (with emoji)
Cibo 🍎, Vestiti bimbo 🧦, Giochi 🧸, Libri 📚, Coperte 🛏️, Disegni 🎨, Altro 🌈
