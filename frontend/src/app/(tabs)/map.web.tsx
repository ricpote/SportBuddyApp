import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  MapCameraChangedEvent,
  Pin,
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

export default function MapWebScreen() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

  const [center, setCenter] = useState(DEFAULT_CENTER);
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
          : 'Erro ao carregar atividades próximas'
      );
    } finally {
      setLoading(false);
    }
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
        reject
      );
    });
  }
  useEffect(() => {
    let cancelled = false;

    async function loadInitialActivities() {
      try {
        setError(null);

        let nextCenter = DEFAULT_CENTER;

        try {
          nextCenter = await getBrowserLocation();
        } catch {
          nextCenter = DEFAULT_CENTER;
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
            : 'Erro ao carregar atividades próximas'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialActivities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRadiusChange(nextRadius: number) {
    setRadiusKm(nextRadius);
    await loadActivities(center.lat, center.lng, nextRadius);
  }

  async function handleSearchThisArea() {
    await loadActivities(center.lat, center.lng, radiusKm);
  }

  if (!apiKey) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.title}>Google Maps API key em falta</ThemedText>
        <ThemedText>

        </ThemedText>
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
          }}
        >

          {validActivities.map((activity) => (
            <AdvancedMarker
              key={activity.id}
              position={{
                lat: activity.location.lat,
                lng: activity.location.lng,
              }}
              title={activity.title}
              onClick={() => setSelectedActivity(activity)}
            >
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
              onCloseClick={() => setSelectedActivity(null)}
            >
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
                  }}
                >
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
                onPress={() => handleRadiusChange(option)}
                style={[styles.radiusButton, active && styles.radiusButtonActive]}
              >
                <ThemedText
                  style={[styles.radiusText, active && styles.radiusTextActive]}
                >
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
});