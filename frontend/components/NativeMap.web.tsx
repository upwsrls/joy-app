// Web map – uses Leaflet via react-leaflet for a real interactive map with pins.
// This file is ONLY bundled for web (Metro picks the .web.tsx variant automatically).
// We use a runtime `typeof window` guard + dynamic require so that during the
// expo-router SSR pre-render pass (where `window` is undefined) we don't load
// Leaflet at all and instead render a placeholder.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../lib/theme';

type Dono = {
  id: string;
  user_id: string;
  titolo: string;
  categoria: string;
  lat: number;
  lng: number;
  donatore_nome?: string | null;
};

type Props = {
  doni: Dono[];
  myUserId: string | null | undefined;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress: (dono: Dono) => void;
};

type LeafletBundle = {
  L: any;
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  useMap: any;
};

function loadLeaflet(): LeafletBundle | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  const rl = require('react-leaflet');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  const L = require('leaflet');
  return {
    L: L.default || L,
    MapContainer: rl.MapContainer,
    TileLayer: rl.TileLayer,
    Marker: rl.Marker,
    Popup: rl.Popup,
    useMap: rl.useMap,
  };
}

function makeIcon(L: any, color: string) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
  <circle cx="16" cy="16" r="6" fill="#ffffff"/>
</svg>`;
  const url = `data:image/svg+xml;base64,${window.btoa(svg)}`;
  return L.icon({
    iconUrl: url,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  });
}

function MapRecenter({
  center,
  zoom,
  useMap,
}: {
  center: [number, number];
  zoom: number;
  useMap: any;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

export default function NativeMap({ doni, myUserId, initialRegion, onMarkerPress }: Props) {
  const [ready, setReady] = useState(false);
  const bundleRef = useRef<LeafletBundle | null>(null);

  useEffect(() => {
    // Load only on the client
    if (!bundleRef.current) {
      bundleRef.current = loadLeaflet();
    }
    setReady(!!bundleRef.current);
  }, []);

  const center: [number, number] = [initialRegion.latitude, initialRegion.longitude];
  const zoom = Math.max(
    3,
    Math.min(16, Math.round(Math.log2(360 / (initialRegion.latitudeDelta || 5))))
  );

  const otherIcon = useMemo(
    () => (bundleRef.current ? makeIcon(bundleRef.current.L, '#3B82F6') : null), // blue
    [ready]
  );
  const myIcon = useMemo(
    () => (bundleRef.current ? makeIcon(bundleRef.current.L, COLORS.error) : null), // red
    [ready]
  );

  if (!ready || !bundleRef.current) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>Caricamento mappa…</Text>
      </View>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = bundleRef.current;

  return (
    <View style={styles.wrap}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' } as React.CSSProperties}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={center} zoom={zoom} useMap={useMap} />
        {doni.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={d.user_id === myUserId ? myIcon : otherIcon}
            eventHandlers={{ click: () => onMarkerPress(d) }}
          >
            <Popup>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.titolo}</div>
              <div style={{ color: COLORS.primary, fontSize: 12 }}>
                {d.categoria}
                {d.donatore_nome ? ` · ${d.donatore_nome}` : ''}
              </div>
              <div
                onClick={() => onMarkerPress(d)}
                style={{
                  marginTop: 8,
                  cursor: 'pointer',
                  color: '#fff',
                  background: COLORS.primary,
                  padding: '6px 10px',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Apri gioia →
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.s, color: COLORS.textMedium },
});
