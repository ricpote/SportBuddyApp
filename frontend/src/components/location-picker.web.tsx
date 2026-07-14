import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

import { ThemedText } from '@/components/themed-text';

export type PickedLocation = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

type LocationPickerProps = {
  value: PickedLocation;
  onChange: (location: PickedLocation) => void;
};

const DEFAULT_CENTER = {
  lat: 38.7223,
  lng: -9.1393,
};

// O primeiro address_component do Google é normalmente o número da porta
// (ex: "64"), que não serve de nome. Escolhemos algo com significado:
// nome do sítio > rua + número > freguesia > cidade.
type GeocoderAddressComponent = { long_name: string; types: string[] };

function pickLocationName(result?: {
  address_components?: GeocoderAddressComponent[];
}): string | undefined {
  const comps = result?.address_components ?? [];
  const byType = (type: string) =>
    comps.find((c: GeocoderAddressComponent) => c.types.includes(type))?.long_name;

  const route = byType('route');
  const number = byType('street_number');

  return (
    byType('establishment') ??
    byType('point_of_interest') ??
    byType('premise') ??
    (route ? (number ? `${route} ${number}` : route) : undefined) ??
    byType('sublocality') ??
    byType('locality')
  );
}

function LocationPickerMap({ value, onChange }: LocationPickerProps) {
  const map = useMap();
 const geocodingLibrary = useMapsLibrary('geocoding');
const geocoder = geocodingLibrary ? new geocodingLibrary.Geocoder() : null;
const [query, setQuery] = useState(value.address || '');


  async function reverseGeocode(lat: number, lng: number) {
    if (!geocoder) return;

    const result = await geocoder.geocode({
      location: { lat, lng },
    });

    const firstResult = result.results[0];

    onChange({
      name: pickLocationName(firstResult) || 'Local selecionado',
      address: firstResult?.formatted_address || `${lat}, ${lng}`,
      lat,
      lng,
    });

    setQuery(firstResult?.formatted_address || '');
  }

  async function searchAddress() {
    if (!geocoder || !query.trim()) return;

    const result = await geocoder.geocode({
      address: query,
    });

    const firstResult = result.results[0];

    if (!firstResult) return;

    const lat = firstResult.geometry.location.lat();
    const lng = firstResult.geometry.location.lng();

    map?.panTo({ lat, lng });
    map?.setZoom(15);

    onChange({
      name: pickLocationName(firstResult) || query,
      address: firstResult.formatted_address,
      lat,
      lng,
    });

    setQuery(firstResult.formatted_address);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar morada ou local"
          placeholderTextColor="#8f8b85"
          style={styles.input}
          onSubmitEditing={searchAddress}
        />

        <Pressable onPress={searchAddress} style={styles.button}>
          <ThemedText style={styles.buttonText}>Pesquisar</ThemedText>
        </Pressable>
      </View>

      <Map
        style={styles.map}
        defaultCenter={{
          lat: value.lat || DEFAULT_CENTER.lat,
          lng: value.lng || DEFAULT_CENTER.lng,
        }}
        defaultZoom={13}
        mapId={process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI
        onCameraChanged={(_event: MapCameraChangedEvent) => { }}
        onClick={(event) => {
          const lat = event.detail.latLng?.lat;
          const lng = event.detail.latLng?.lng;

          if (typeof lat === 'number' && typeof lng === 'number') {
            reverseGeocode(lat, lng);
          }
        }}
      >
        <AdvancedMarker
          position={{
            lat: value.lat || DEFAULT_CENTER.lat,
            lng: value.lng || DEFAULT_CENTER.lng,
          }}
        />
      </Map>

      <View style={styles.selectedBox}>
        <ThemedText style={styles.selectedTitle}>Local selecionado</ThemedText>
        <ThemedText>{value.address || 'Nenhum local selecionado'}</ThemedText>
      </View>
    </View>
  );
}

export default function LocationPicker(props: LocationPickerProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

  if (!apiKey) {
    return (
      <View style={styles.selectedBox}>
        <ThemedText>Falta EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY no .env</ThemedText>
      </View>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <LocationPickerMap {...props} />
    </APIProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f2ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1a1005',
  },
  button: {
    backgroundColor: '#e8823f',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#f4f2ef',
    fontWeight: '700',
  },
  map: {
    width: '100%',
    height: 360,
    borderRadius: 16,
  },
  selectedBox: {
    backgroundColor: '#111012',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  selectedTitle: {
    fontWeight: '700',
    color: '#f4f2ef',
  },
});