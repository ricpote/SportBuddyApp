import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getMyActivities } from '@/services/activities';
import { Activity } from '@/types/activity';
import { relativeDate } from '@/utils/date';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

export default function ChatsScreen() {
  const { user } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    getMyActivities()
      .then(setActivities)
      .catch(() => setActivities([]));
  }, []);

  useFocusEffect(load);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await getMyActivities();
      setActivities(data);
    } catch {
      setActivities([]);
    } finally {
      setRefreshing(false);
    }
  }

  const uid = user?.uid ?? '';
  const allChats = (activities ?? []).filter(
    (a) => a.status !== 'cancelled' && a.participantsList.includes(uid)
  );
  const activeChats = allChats.filter((a) => a.status === 'open' || a.status === 'full');
  const pastChats = allChats.filter((a) => a.status === 'completed');

  function renderCard(activity: Activity) {
    return (
      <Link key={activity.id} href={{ pathname: '/chat/[id]', params: { id: activity.id } }} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedView type="backgroundElement" style={styles.cardRow}>
              <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                {activity.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {relativeDate(activity.date)}
              </ThemedText>
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary">
              {activity.location.name} · {activity.participantsList.length} participantes
            </ThemedText>
          </ThemedView>
        </Pressable>
      </Link>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: BottomTabInset + safeAreaInsets.bottom, paddingTop: TopTabInset },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Chats</ThemedText>

        {activities === null && (
          <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
        )}

        {activities !== null && allChats.length === 0 && (
          <ThemedText themeColor="textSecondary">
            Ainda não participas em nenhuma atividade. Junta-te a uma para poder conversar!
          </ThemedText>
        )}

        {activeChats.length > 0 && (
          <>
            <ThemedText type="subtitle">Ativas</ThemedText>
            {activeChats.map(renderCard)}
          </>
        )}

        {pastChats.length > 0 && (
          <>
            <ThemedText type="subtitle">Terminadas</ThemedText>
            {pastChats.map(renderCard)}
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    marginRight: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
