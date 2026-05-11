// JOY V3 palette — caldo, gioioso, family-friendly
import { Platform } from 'react-native';

export const COLORS = {
  primary: '#FF6B6B',         // Corallo vivace (CTA, link, accenti)
  primaryLight: '#FFA5A5',
  secondary: '#4ECDC4',       // Turchese (accenti positivi, success secondari)
  accent: '#FFD93D',           // Giallo solare (highlight, badge)
  background: '#FFF8F0',       // Crema chiaro (sfondo)
  cardBackground: '#FFFFFF',
  cardBorder: '#FFE3E3',       // bordo rosato chiaro
  textDark: '#2C3E50',
  textMedium: '#7B8B99',
  inputBorder: '#FFD9D9',
  secondaryBg: '#FFF3F0',
  buttonRitira: '#4ECDC4',
  mapPinBlue: '#FF6B6B',       // (manteniamo nome, ma ora è corallo per coerenza)
  mapPinRed: '#E53935',
  white: '#FFFFFF',
  error: '#E53935',
  success: '#51CF66',
  grayText: '#7B8B99',
  lightGray: '#F5F0EA',
};

export const SPACING = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 };

export const RADIUS = { small: 8, medium: 16, large: 24, round: 9999 };

export const CATEGORIE = [
  { nome: 'Cibo', icon: '🍎' },
  { nome: 'Vestiti bimbo', icon: '🧦' },
  { nome: 'Giochi', icon: '🧸' },
  { nome: 'Libri', icon: '📚' },
  { nome: 'Coperte', icon: '🛏️' },
  { nome: 'Disegni', icon: '🎨' },
  { nome: 'Altro', icon: '🌈' },
];

// Cross-platform shadow: use boxShadow string on web (RN 0.76+ deprecated shadow* on web),
// keep legacy shadow* + elevation on native so iOS/Android still get a proper shadow.
export const SHADOW = Platform.select({
  web: { boxShadow: '0 4px 10px rgba(255, 107, 107, 0.12)' },
  default: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
}) as any;
