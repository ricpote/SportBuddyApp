import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { usePendingWaitlist } from '@/contexts/pending-waitlist-context';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';
import { getMyActivities } from '@/services/activities';
import { Activity } from '@/types/activity';
import { relativeDate } from '@/utils/date';

type ProfileData = {
  name: string;
  email: string;
  role: string;
  stats: {
    activitiesCreated: number;
    activitiesJoined: number;
  };
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
  const { pendingCount, refresh: refreshBadge } = usePendingWaitlist();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'past'>('all');

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
      getMyActivities()
        .then((data) => { setActivities(data); refreshBadge(); })
        .catch(() => setActivities(null));
    }, [refreshBadge])
  );

  const myActivities = (activities ?? []).filter((a) => {
    if (activityFilter === 'active') return a.status === 'open' || a.status === 'full';
    if (activityFilter === 'past') return a.status === 'completed' || a.status === 'cancelled';
    return true;
  });

  const createdCount = profile?.stats.activitiesCreated ?? 0;
  const joinedCount = profile?.stats.activitiesJoined ?? 0;

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

        <Link href="/edit-profile" asChild>
          <Pressable style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">Editar perfil</ThemedText>
          </Pressable>
        </Link>

        {pendingCount > 0 && (
          <ThemedView style={[styles.card, styles.pendingCard]}>
            <ThemedText type="smallBold" style={styles.pendingText}>
              {pendingCount === 1 ? '1 atividade com pedidos na lista de espera' : `${pendingCount} atividades com pedidos na lista de espera`}
            </ThemedText>
            <ThemedText type="small" style={styles.pendingText}>Abre a atividade para admitir ou rejeitar.</ThemedText>
          </ThemedView>
        )}

        <ThemedText type="subtitle">As minhas atividades</ThemedText>

        <ThemedView style={styles.filterRow}>
          {(['all', 'active', 'past'] as const).map((f) => (
            <Pressable key={f} onPress={() => setActivityFilter(f)}>
              <ThemedView type={activityFilter === f ? 'backgroundSelected' : 'backgroundElement'} style={styles.filterChip}>
                <ThemedText type="small">{f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Passadas'}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>

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
                    {relativeDate(activity.date)} · {STATUS_LABELS[activity.status]}
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
  pendingCard: {
    backgroundColor: '#CF844420',
    borderWidth: 1,
    borderColor: '#CF8444',
  },
  pendingText: {
    color: '#CF8444',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
});
