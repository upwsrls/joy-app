/**
 * Pure utilities for filtering and ranking the doni list.
 * Kept dependency-free so the same logic works on web list and native map.
 */
import type { Dono } from './api';

export type DistanceOption = 5 | 10 | 20 | 0; // 0 = "Tutti" (no distance filter)

export type Filters = {
  q: string;
  categorie: string[]; // multi-select; empty = all
  maxKm: DistanceOption;
};

export const EMPTY_FILTERS: Filters = {
  q: '',
  categorie: [],
  maxKm: 0,
};

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function matchSearch(dono: Dono, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    normalize(dono.titolo),
    normalize(dono.descrizione || ''),
    normalize(dono.categoria),
    normalize(dono.donatore_nome || ''),
    normalize(dono.donatore_citta || ''),
  ].join(' ');
  return haystack.includes(q);
}

export function applyFilters(
  doni: Dono[],
  userPos: { latitude: number; longitude: number } | null,
  filters: Filters
): Dono[] {
  return doni.filter((d) => {
    // Search
    if (!matchSearch(d, filters.q)) return false;

    // Categorie (multi-select; empty = pass)
    if (filters.categorie.length > 0 && !filters.categorie.includes(d.categoria)) {
      return false;
    }

    // Distance (require user pos AND dono coords AND maxKm>0)
    if (filters.maxKm > 0 && userPos && d.lat && d.lng) {
      const km = distanceKm(userPos.latitude, userPos.longitude, d.lat, d.lng);
      if (km > filters.maxKm) return false;
    }

    return true;
  });
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.q.trim().length > 0) n += 1;
  if (f.categorie.length > 0) n += 1;
  if (f.maxKm > 0) n += 1;
  return n;
}
