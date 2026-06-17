import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';
import { listActivities } from '@/services/activities';
import { Activity } from '@/types/activity';

type ProfileData = {
  name: string;
  email: string;
  role: string;
};

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      listActivities()
        .then(setActivities)
        .catch(() => setActivities(null));
    }, [])
  );

  // The backend has no "my activities" endpoint yet, so we derive everything
  // from the full list.
  const myActivities =
    user && activities
      ? activities.filter(
          (activity) =>
            activity.participantsList.includes(user.uid) ||
            activity.waitlist.includes(user.uid)
        )
      : [];

  const createdCount = user
    ? myActivities.filter((activity) => activity.createdBy === user.uid).length
    : 0;
  const joinedCount = user
    ? myActivities.filter(
        (activity) =>
          activity.createdBy !== user.uid && activity.participantsList.includes(user.uid)
      ).length
    : 0;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: safeAreaInsets.top + TopTabInset + Spacing.five,
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
        },
      ]}>
      <ThemedView style={styles.container}>
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
            Atividades criadas: {createdCount}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Atividades participadas: {joinedCount}
          </ThemedText>
        </ThemedView>

        <ThemedText type="subtitle">As minhas atividades</ThemedText>

        {activities === null && (
          <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
        )}

        {activities !== null && myActivities.length === 0 && (
          <ThemedText themeColor="textSecondary">
            Ainda não participas em nenhuma atividade.
          </ThemedText>
        )}

        <ThemedView style={styles.list}>
          {myActivities.map((activity) => (
            <Link
              key={activity.id}
              href={{ pathname: '/activity/[id]', params: { id: activity.id } }}
              asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{activity.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {new Date(activity.date).toLocaleString()} · {STATUS_LABELS[activity.status]}
                    {user && activity.createdBy === user.uid
                      ? ' · Organizador'
                      : user && activity.waitlist.includes(user.uid)
                        ? ' · Em lista de espera'
                        : ''}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ))}
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
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
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
  list: {
    gap: Spacing.two,
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
