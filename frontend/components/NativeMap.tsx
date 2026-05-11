// Native (iOS/Android) map component using react-native-maps
import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Dono } from '../lib/api';
import { COLORS } from '../lib/theme';

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

export default function NativeMap({ doni, myUserId, initialRegion, onMarkerPress }: Props) {
  return (
    <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
      {doni.map((d) => (
        <Marker
          key={d.id}
          coordinate={{ latitude: d.lat, longitude: d.lng }}
          pinColor={d.user_id === myUserId ? 'red' : 'blue'}
          title={d.titolo}
          description={`${d.categoria}${d.donatore_nome ? ` · ${d.donatore_nome}` : ''}`}
          onCalloutPress={() => onMarkerPress(d)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
