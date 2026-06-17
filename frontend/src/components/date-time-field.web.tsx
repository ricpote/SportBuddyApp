import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import type { DateTimeFieldProps } from './date-time-field';

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <input
        type="datetime-local"
        value={toLocalInputValue(value)}
        onChange={(event) => {
          const picked = new Date(event.target.value);
          if (!Number.isNaN(picked.getTime())) onChange(picked);
        }}
        style={{
          height: 48,
          borderRadius: Spacing.two,
          border: 'none',
          paddingLeft: Spacing.three,
          paddingRight: Spacing.three,
          fontSize: 16,
          fontFamily: 'inherit',
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
});
