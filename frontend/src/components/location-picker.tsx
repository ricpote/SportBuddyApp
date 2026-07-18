import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value.address}
        onChangeText={(address) => {
          onChange({
            ...value,
            name: address || t('activity.locationPicker.defaultName'),
            address,
          });
        }}
        placeholder={t('activity.locationPicker.placeholder')}
        placeholderTextColor="#8f8b85"
        style={styles.input}
      />

      <ThemedText style={styles.helpText}>
        {t('activity.locationPicker.mobileHint')}
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