import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend URL hardcoded as fallback so EAS dev/preview builds work
// even if .env is missing on the build machine (the file is gitignored).
// You can still override via EXPO_PUBLIC_BACKEND_URL in your local .env or
// via the `env` block in eas.json (which is the authoritative source at build time).
const DEFAULT_BACKEND_URL = 'https://api.joyapp.it';
const BASE_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL && process.env.EXPO_PUBLIC_BACKEND_URL.trim()) ||
  DEFAULT_BACKEND_URL;

export const API_BASE = `${BASE_URL.replace(/\/+$/, '')}/api`;
export const TOKEN_KEY = 'joy_token';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

if (__DEV__) {
  // Helpful one-shot log on app start so you can confirm which backend the build talks to.
  // eslint-disable-next-line no-console
  console.log('[JOY] API base URL:', API_BASE);
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
};

export type Profile = {
  user_id: string;
  nome: string;
  citta: string;
  telefono?: string;
  foto_url?: string | null;
};

export type Dono = {
  id: string;
  user_id: string;
  titolo: string;
  descrizione: string;
  categoria: string;
  lat: number;
  lng: number;
  foto_urls: string[];
  ritirato: boolean;
  ritirato_da?: string | null;
  ritirato_at?: string | null;
  created_at: string;
  donatore_nome?: string | null;
  donatore_citta?: string | null;
  donatore_telefono?: string | null;
  donatore_rating_avg?: number | null;
  donatore_rating_count?: number;
};

export type Conversazione = {
  id: string;
  altro_user_id: string;
  altro_nome: string;
  altro_citta: string;
  ultimo_messaggio: string;
  ultimo_at: string;
  unread?: number;
};

export type Messaggio = {
  id: string;
  conversazione_id: string;
  mittente_id: string;
  testo: string;
  created_at: string;
};
