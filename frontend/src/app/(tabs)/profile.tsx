import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';

type ProfileData = {
  name: string;
  email: string;
  role: string;
  stats: {
    activitiesJoined: number;
    activitiesCreated: number;
  };
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    api
      .get<ProfileData>('/api/users/me')
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Perfil
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">{profile?.name ?? user?.displayName ?? '—'}</ThemedText>
          <ThemedText themeColor="textSecondary">{profile?.email ?? user?.email}</ThemedText>
          <ThemedText themeColor="textSecondary">
            Função: {profile?.role ?? 'participant'}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Estatísticas</ThemedText>
          <ThemedText themeColor="textSecondary">
            Atividades criadas: {profile?.stats?.activitiesCreated ?? 0}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Atividades participadas: {profile?.stats?.activitiesJoined ?? 0}
          </ThemedText>
        </ThemedView>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
          onPress={signOut}>
          <ThemedText type="smallBold">Terminar sessão</ThemedText>
        </Pressable>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
