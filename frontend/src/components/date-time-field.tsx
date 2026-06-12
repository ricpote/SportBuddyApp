import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
};

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);

  if (Platform.OS === 'ios') {
    return (
      <ThemedView style={styles.iosRow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <DateTimePicker
          value={value}
          mode="datetime"
          onChange={(_event: DateTimePickerEvent, picked?: Date) => {
            if (picked) onChange(picked);
          }}
        />
      </ThemedView>
    );
  }

  function handleChange(event: DateTimePickerEvent, picked?: Date) {
    setMode(null);
    if (event.type !== 'set' || !picked) return;
    onChange(picked);
  }

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedView style={styles.row}>
        <Pressable style={styles.flex1} onPress={() => setMode('date')}>
          <ThemedView type="backgroundElement" style={styles.input}>
            <ThemedText>{value.toLocaleDateString()}</ThemedText>
          </ThemedView>
        </Pressable>
        <Pressable style={styles.flex1} onPress={() => setMode('time')}>
          <ThemedView type="backgroundElement" style={styles.input}>
            <ThemedText>
              {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
      {mode && <DateTimePicker value={value} mode={mode} onChange={handleChange} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
});
