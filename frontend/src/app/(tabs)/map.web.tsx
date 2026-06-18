import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function MapWebFallbackScreen() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Mapa indisponível no web</ThemedText>
      <ThemedText>
        O mapa com pins usa react-native-maps, que deve ser testado no Expo Go,
        Android emulator, or iOS simulator.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});