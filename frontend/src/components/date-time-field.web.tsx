import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import type { DateTimeFieldProps } from './date-time-field';

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <input
        type="datetime-local"
        value={toLocalInputValue(value)}
        onChange={(event) => {
          const picked = new Date(event.target.value);
          if (!Number.isNaN(picked.getTime())) onChange(picked);
        }}
        style={{
          height: 52, // Mesma altura dos outros inputs
          borderRadius: 12,
          border: '1px solid #334155', // Borda subtil
          paddingLeft: 16,
          paddingRight: 16,
          fontSize: 16,
          fontFamily: 'inherit',
          color: '#FFFFFF', // Texto branco
          backgroundColor: '#1E293B', // Fundo escuro do input
          colorScheme: 'dark', // Diz ao Google Chrome/Safari para usar a versão escura do calendário
          outline: 'none',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});