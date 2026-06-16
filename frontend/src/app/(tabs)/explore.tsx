import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listActivities } from '@/services/activities';
import { listSports } from '@/services/sports';
import { Activity } from '@/types/activity';
import { Sport, SportCategory } from '@/types/sport';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

const CATEGORY_OPTIONS: SportCategory[] = ['team', 'individual'];
const CATEGORY_LABELS: Record<SportCategory, string> = {
  team: 'Equipa',
  individual: 'Individual',
};

function isUpcoming(activity: Activity) {
  return (
    (activity.status === 'open' || activity.status === 'full') &&
    new Date(activity.date).getTime() >= Date.now()
  );
}

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SportCategory | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listActivities();
      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar atividades');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    listSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function selectCategory(category: SportCategory) {
    const next = categoryFilter === category ? null : category;
    setCategoryFilter(next);
    // Drop the sport filter if it no longer belongs to the visible category.
    if (next && sportFilter && sports.find((s) => s.id === sportFilter)?.category !== next) {
      setSportFilter(null);
    }
  }

  const visibleSports = categoryFilter
    ? sports.filter((sport) => sport.category === categoryFilter)
    : sports;

  const categoryBySportId = new Map(sports.map((sport) => [sport.id, sport.category]));

  const visibleActivities = activities?.filter(
    (activity) =>
      (showAll || isUpcoming(activity)) &&
      (!sportFilter || activity.sportId === sportFilter) &&
      (!categoryFilter || categoryBySportId.get(activity.sportId) === categoryFilter)
  );

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: safeAreaInsets.top + TopTabInset + Spacing.four, paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Atividades</ThemedText>
          {/* Link asChild drops the Pressable's style function on web, so the
              visual styles live on an inner View instead. */}
          <Link href="/create-activity" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.createButton, { backgroundColor: theme.text }]}>
                <ThemedText style={{ color: theme.background }} type="smallBold">
                  Nova atividade
                </ThemedText>
              </View>
            </Pressable>
          </Link>
        </ThemedView>

        <ThemedView style={styles.chipRow}>
          <Pressable onPress={() => setShowAll(false)}>
            <ThemedView type={showAll ? 'backgroundElement' : 'backgroundSelected'} style={styles.chip}>
              <ThemedText type="small">Próximas</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => setShowAll(true)}>
            <ThemedView type={showAll ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
              <ThemedText type="small">Todas</ThemedText>
            </ThemedView>
          </Pressable>
        </ThemedView>

        {sports.length > 0 && (
          <ThemedView style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((category) => (
              <Pressable key={category} onPress={() => selectCategory(category)}>
                <ThemedView
                  type={categoryFilter === category ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.chip}>
                  <ThemedText type="small">{CATEGORY_LABELS[category]}</ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
        )}

        {sports.length > 0 && (
          <ThemedView style={styles.chipRow}>
            <Pressable onPress={() => setSportFilter(null)}>
              <ThemedView
                type={sportFilter === null ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.chip}>
                <ThemedText type="small">Todas as modalidades</ThemedText>
              </ThemedView>
            </Pressable>
            {visibleSports.map((sport) => (
              <Pressable
                key={sport.id}
                onPress={() => setSportFilter(sportFilter === sport.id ? null : sport.id)}>
                <ThemedView
                  type={sportFilter === sport.id ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.chip}>
                  <ThemedText type="small">{sport.name}</ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
        )}

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {activities === null && !error && (
          <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
        )}

        {activities?.length === 0 && (
          <ThemedText themeColor="textSecondary">Ainda não há atividades. Cria a primeira!</ThemedText>
        )}

        {activities !== null && activities.length > 0 && visibleActivities?.length === 0 && (
          <ThemedText themeColor="textSecondary">Sem atividades para estes filtros.</ThemedText>
        )}

        <ThemedView style={styles.list}>
          {visibleActivities?.map((activity) => (
            <Link key={activity.id} href={{ pathname: '/activity/[id]', params: { id: activity.id } }} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{activity.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {new Date(activity.date).toLocaleString()}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {activity.location.name} · {activity.participantsList.length}/{activity.maxParticipants} ·{' '}
                    {STATUS_LABELS[activity.status]}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ))}
        </ThemedView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
