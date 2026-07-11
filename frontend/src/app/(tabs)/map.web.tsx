import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  MapCameraChangedEvent,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { listNearbyActivities } from '@/services/activities';
import { Activity } from '@/types/activity';

const DEFAULT_CENTER = {
  lat: 38.7223,
  lng: -9.1393,
};

const mapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_MAP_ID;
const DEFAULT_RADIUS_KM = 20;

function UserLocationController({
  location,
  snapTick,
}: {
  location: { lat: number; lng: number } | null;
  snapTick: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !location || snapTick === 0) return;
    map.panTo(location);
  }, [location, map, snapTick]);

  return null;
}

function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not available'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

export default function MapWebScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [snapTick, setSnapTick] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validActivities = useMemo(() => {
    return activities.filter(
      (activity) =>
        Number.isFinite(activity.location?.lat) &&
        Number.isFinite(activity.location?.lng)
    );
  }, [activities]);

  async function loadActivities(lat: number, lng: number, radius: number) {
    try {
      setLoading(true);
      setError(null);

      const data = await listNearbyActivities({
        lat,
        lng,
        radiusKm: radius,
      });

      setActivities(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar atividades proximas'
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshUserLocation(shouldSnap = false) {
    try {
      const nextLocation = await getBrowserLocation();
      setUserLocation(nextLocation);

      if (shouldSnap) {
        setCenter(nextLocation);
        setSnapTick((current) => current + 1);
      }

      return nextLocation;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialActivities() {
      try {
        setError(null);

        let nextCenter = DEFAULT_CENTER;
        const currentLocation = await refreshUserLocation(true);

        if (currentLocation) {
          nextCenter = currentLocation;
        }

        const data = await listNearbyActivities({
          lat: nextCenter.lat,
          lng: nextCenter.lng,
          radiusKm,
        });

        if (cancelled) return;

        setCenter(nextCenter);
        setActivities(data);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar atividades proximas'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshUserLocation(false);
    }, 60_000);

    return () => clearInterval(intervalId);
  }, []);

  async function handleRadiusChange(nextRadius: number) {
    setRadiusKm(nextRadius);
    await loadActivities(center.lat, center.lng, nextRadius);
  }

  async function handleSearchThisArea() {
    await loadActivities(center.lat, center.lng, radiusKm);
  }

  async function handleSnapToMyLocation() {
    const nextLocation = await refreshUserLocation(true);

    if (!nextLocation) {
      setError('Nao foi possivel obter a tua localizacao');
    }
  }

  if (!apiKey) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.title}>Google Maps API key em falta</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <APIProvider apiKey={apiKey}>
        <Map
          style={styles.map}
          defaultCenter={center}
          defaultZoom={13}
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI
          streetViewControl={false}
          fullscreenControl={false}
          mapTypeControl={false}
          scaleControl={false}
          rotateControl={false}
          keyboardShortcuts={false}
          onCameraChanged={(event: MapCameraChangedEvent) => {
            setCenter(event.detail.center);
          }}>
          <UserLocationController location={userLocation} snapTick={snapTick} />

          {userLocation && (
            <AdvancedMarker position={userLocation} title="A tua localizacao">
              <Pin
                background="#2563EB"
                borderColor="#1D4ED8"
                glyphColor="#FFFFFF"
                scale={1.2}
              />
            </AdvancedMarker>
          )}

          {validActivities.map((activity) => (
            <AdvancedMarker
              key={activity.id}
              position={{
                lat: activity.location.lat,
                lng: activity.location.lng,
              }}
              title={activity.title}
              onClick={() => setSelectedActivity(activity)}>
              <Pin
                background="#CF8444"
                borderColor="#7C4F28"
                glyphColor="#FFFFFF"
                scale={1.4}
              />
            </AdvancedMarker>
          ))}

          {selectedActivity && (
            <InfoWindow
              position={{
                lat: selectedActivity.location.lat,
                lng: selectedActivity.location.lng,
              }}
              onCloseClick={() => setSelectedActivity(null)}>
              <div style={{ maxWidth: 240 }}>
                <strong>{selectedActivity.title}</strong>

                <p style={{ margin: '6px 0' }}>
                  {selectedActivity.location.name}
                </p>

                <p style={{ margin: '6px 0' }}>
                  {new Date(selectedActivity.date).toLocaleString()}
                </p>

                <p style={{ margin: '6px 0' }}>
                  {selectedActivity.participantsList.length}/
                  {selectedActivity.maxParticipants} participantes
                </p>

                <button
                  type="button"
                  onClick={() => {
                    router.push({
                      pathname: '/activity/[id]',
                      params: { id: selectedActivity.id },
                    });
                  }}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    background: '#CF8444',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}>
                  Abrir atividade
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      <View style={styles.overlay}>
        <View style={styles.radiusRow}>
          {[5, 10, 20, 50].map((option) => {
            const active = radiusKm === option;

            return (
              <Pressable
                key={option}
                onPress={() => void handleRadiusChange(option)}
                style={[styles.radiusButton, active && styles.radiusButtonActive]}>
                <ThemedText
                  style={[styles.radiusText, active && styles.radiusTextActive]}>
                  {option} km
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => void handleSearchThisArea()} style={styles.searchButton}>
          <ThemedText style={styles.searchButtonText}>
            Pesquisar nesta area
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => void handleSnapToMyLocation()} style={styles.locationButton}>
          <ThemedText style={styles.searchButtonText}>
            Voltar para a minha localização
          </ThemedText>
        </Pressable>

        <View style={styles.statusBox}>
          {loading ? (
            <>
              <ActivityIndicator />
              <ThemedText>A carregar atividades...</ThemedText>
            </>
          ) : error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : (
            <ThemedText>{validActivities.length} atividades encontradas</ThemedText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 600,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 24,
    left: 24,
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
    fontWeight: '700',
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
  locationButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D4ED8',
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
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  error: {
    color: '#B91C1C',
  },
});
