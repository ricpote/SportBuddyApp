import { StyleSheet, TextInput, View } from 'react-native';

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

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value.address}
        onChangeText={(address) => {
          onChange({
            ...value,
            name: address || 'Local selecionado',
            address,
          });
        }}
        placeholder="Escreve a morada da atividade"
        placeholderTextColor="#8f8b85"
        style={styles.input}
      />

      <ThemedText style={styles.helpText}>
        O mapa interativo está disponível na versão web. Esta versão mobile é temporária.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontWeight: '700',
    color: '#f4f2ef',
  },
  input: {
    backgroundColor: '#f4f2ef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1a1005',
  },
  helpText: {
    color: '#8f8b85',
    fontSize: 12,
  },
});