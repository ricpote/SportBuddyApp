import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { listNearbyActivities } from '@/services/activities';
import { Activity } from '@/types/activity';

const DEFAULT_REGION: Region = {
  latitude: 38.7223,
  longitude: -9.1393,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const DEFAULT_RADIUS_KM = 5;

export default function ActivitiesMapScreen() {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivities(lat: number, lng: number, radius: number) {
    try {
      setLoading(true);

      const data = await listNearbyActivities({
        lat,
        lng,
        radiusKm: radius,
      });

      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }

  const loadUserLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setError('Permissão de localização negada');
      setLoading(false);
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});

    const userRegion: Region = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };

    setRegion(userRegion);
    await loadActivities(userRegion.latitude, userRegion.longitude, radiusKm);
  }, [radiusKm]);

  useFocusEffect(
    useCallback(() => {
      loadUserLocation();
    }, [loadUserLocation])
  );

  async function handleRadiusChange(nextRadius: number) {
    setRadiusKm(nextRadius);
    await loadActivities(region.latitude, region.longitude, nextRadius);
  }

  async function handleSearchThisArea() {
    await loadActivities(region.latitude, region.longitude, radiusKm);
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        region={region}
        showsUserLocation
        showsMyLocationButton
        onRegionChangeComplete={setRegion}
      >
        {activities.map((activity) => (
          <Marker
            key={activity.id}
            coordinate={{
              latitude: activity.location.lat,
              longitude: activity.location.lng,
            }}
            title={activity.title}
            description={activity.location.name}
          >
            <Callout
              onPress={() => {
                router.push({
                  pathname: '/activity/[id]',
                  params: { id: activity.id },
                });
              }}
            >
              <View style={styles.callout}>
                <ThemedText style={styles.calloutTitle}>{activity.title}</ThemedText>
                <ThemedText>{activity.location.name}</ThemedText>
                <ThemedText>
                  {new Date(activity.date).toLocaleString()}
                </ThemedText>
                <ThemedText>
                  {activity.participantsList.length}/{activity.maxParticipants} participantes
                </ThemedText>
                <ThemedText style={styles.calloutLink}>Abrir atividade</ThemedText>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.overlay}>
        <View style={styles.radiusRow}>
          {[2, 5, 10, 20].map((option) => {
            const active = radiusKm === option;

            return (
              <Pressable
                key={option}
                onPress={() => handleRadiusChange(option)}
                style={[styles.radiusButton, active && styles.radiusButtonActive]}
              >
                <ThemedText style={[styles.radiusText, active && styles.radiusTextActive]}>
                  {option} km
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={handleSearchThisArea} style={styles.searchButton}>
          <ThemedText style={styles.searchButtonText}>
            Pesquisar nesta área
          </ThemedText>
        </Pressable>

        {loading && (
          <View style={styles.statusBox}>
            <ActivityIndicator />
            <ThemedText>A carregar atividades...</ThemedText>
          </View>
        )}

        {error && (
          <View style={styles.statusBox}>
            <ThemedText style={styles.error}>{error}</ThemedText>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.statusBox}>
            <ThemedText>{activities.length} atividades encontradas</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    gap: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  radiusButtonActive: {
    backgroundColor: '#CF8444',
  },
  radiusText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  radiusTextActive: {
    color: '#FFFFFF',
  },
  searchButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  error: {
    color: '#B91C1C',
  },
  callout: {
    width: 220,
    gap: 4,
  },
  calloutTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  calloutLink: {
    marginTop: 6,
    color: '#CF8444',
    fontWeight: '700',
  },
});