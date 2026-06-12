import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const { user } = useAuth();

  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Olá{firstName ? `, ${firstName}` : ''} 👋</ThemedText>
          <ThemedText themeColor="textSecondary">
            Pronto para a tua próxima atividade?
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.cards}>
          <Link href="/profile" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="subtitle">O meu perfil</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Consulta os teus dados e estatísticas.
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>

          <Link href="/explore" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="subtitle">Atividades</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Cria uma nova atividade ou explora as que já existem.
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary">
          SportBuddy
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: TopTabInset + Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  cards: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.8,
  },
});
