import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedWeatherIcon } from '@/components/animated-weather-icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getWeeklyForecast, DailyForecast } from '@/services/weather';
import { getWeatherInfo } from '@/utils/weather-codes';

// Lisboa — usado quando a permissão de localização é negada ou falha.
const DEFAULT_COORDS = { latitude: 38.7223, longitude: -9.1393 };

function formatDayLabel(dateStr: string, index: number) {
  if (index === 0) return 'Hoje';

  const label = new Date(dateStr).toLocaleDateString('pt-PT', { weekday: 'short' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
}

export function WeatherSection() {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let coords = DEFAULT_COORDS;

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({});
          coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        }
      } catch {
        // segue com a localização por omissão
      }

      try {
        const data = await getWeeklyForecast(coords.latitude, coords.longitude);
        if (!cancelled) {
          setForecast(data.forecast);
          setLocationName(data.location);
        }
      } catch {
        if (!cancelled) setForecast(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!forecast) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Meteorologia{locationName ? ` · ${locationName}` : ''}
      </ThemedText>

      <View style={styles.row}>
        {forecast.map((day, index) => {
          const { icon, category } = getWeatherInfo(day.weatherCode);
          const precipitation = Math.round(day.precipitationProbability);
          const fillHeight = `${Math.min(100, Math.max(0, precipitation))}%` as const;

          const isToday = index === 0;

          return (
            <View key={day.date} style={styles.day}>
              <ThemedText style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {formatDayLabel(day.date, index)}
              </ThemedText>

              <View style={[styles.circle, isToday && styles.circleToday]}>
                <View style={[styles.fill, { height: fillHeight }]} />
                <AnimatedWeatherIcon icon={icon} category={category} size={22} />
              </View>

              <View style={styles.precipRow}>
                <Ionicons name="water" size={11} color="#60A5FA" />
                <ThemedText style={styles.precipText}>{precipitation}%</ThemedText>
              </View>

              <ThemedText style={styles.tempMax}>{Math.round(day.tempMax)}°</ThemedText>
              <ThemedText style={styles.tempMin}>{Math.round(day.tempMin)}°</ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    paddingHorizontal: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#CF8444',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleToday: {
    borderWidth: 2,
    borderColor: '#CF8444',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
  },
  precipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  precipText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '600',
  },
  tempMax: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tempMin: {
    color: '#64748B',
    fontSize: 11,
  },
});
