import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { listActivities } from '@/services/activities';
import { listSports } from '@/services/sports';
import { Activity } from '@/types/activity';
import { Sport, SportCategory } from '@/types/sport';
import { relativeDate } from '@/utils/date';
import { SportIcon } from '@/utils/sport-icon';

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

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SportCategory | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchText, setSearchText] = useState('');
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
      (!categoryFilter || categoryBySportId.get(activity.sportId) === categoryFilter) &&
      (!searchText.trim() || activity.title.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: '#0F172A' }]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh} 
          tintColor="#CF8444" // Cor da rodinha de refresh
        />
      }
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: safeAreaInsets.top + TopTabInset + Spacing.four, paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <View style={styles.container}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <ThemedText type="title" style={{ color: '#FFFFFF' }}>Explorar</ThemedText>
          <Link href="/create-activity" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <View style={styles.createButton}>
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <ThemedText style={{ color: '#FFFFFF' }} type="smallBold">
                  Nova
                </ThemedText>
              </View>
            </Pressable>
          </Link>
        </View>

        {/* BARRA DE PESQUISA */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar atividade..."
            placeholderTextColor="#64748B"
            value={searchText}
            onChangeText={setSearchText}
            clearButtonMode="while-editing"
          />
        </View>

        {/* FILTRO: PRÓXIMAS / TODAS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
          <Pressable onPress={() => setShowAll(false)}>
            <View style={[styles.chip, !showAll && styles.chipActive]}>
              <ThemedText type="small" style={[styles.chipText, !showAll && styles.chipTextActive]}>
                Próximas
              </ThemedText>
            </View>
          </Pressable>
          <Pressable onPress={() => setShowAll(true)}>
            <View style={[styles.chip, showAll && styles.chipActive]}>
              <ThemedText type="small" style={[styles.chipText, showAll && styles.chipTextActive]}>
                Todas
              </ThemedText>
            </View>
          </Pressable>
        </ScrollView>

        {/* FILTRO: CATEGORIAS */}
        {sports.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
            {CATEGORY_OPTIONS.map((category) => {
              const isActive = categoryFilter === category;
              return (
                <Pressable key={category} onPress={() => selectCategory(category)}>
                  <View style={[styles.chip, isActive && styles.chipActive]}>
                    <ThemedText type="small" style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {CATEGORY_LABELS[category]}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* FILTRO: MODALIDADES */}
        {sports.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.sportChipsScroll} contentContainerStyle={styles.chipRowScroll}>
            <Pressable onPress={() => setSportFilter(null)}>
              <View style={[styles.chip, sportFilter === null && styles.chipActive]}>
                <Ionicons
                  name="apps-outline"
                  size={16}
                  color={sportFilter === null ? '#0F172A' : '#A0AEC0'}
                  style={{ marginRight: 5 }}
                />
                <ThemedText type="small" style={[styles.chipText, sportFilter === null && styles.chipTextActive]}>
                  Todas as modalidades
                </ThemedText>
              </View>
            </Pressable>
            {visibleSports.map((sport) => {
              const isActive = sportFilter === sport.id;
              return (
                <Pressable
                  key={sport.id}
                  onPress={() => setSportFilter(sportFilter === sport.id ? null : sport.id)}>
                  <View style={[styles.chip, isActive && styles.chipActive]}>
                    <SportIcon
                      sportName={sport.name}
                      size={16}
                      color={isActive ? '#0F172A' : '#A0AEC0'}
                      style={{ marginRight: 5 }}
                    />
                    <ThemedText type="small" style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {sport.name}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ESTADOS E MENSAGENS */}
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {activities === null && !error && (
          <ThemedText style={styles.emptyText}>A carregar atividades...</ThemedText>
        )}

        {activities?.length === 0 && (
          <ThemedText style={styles.emptyText}>Ainda não há atividades. Cria a primeira!</ThemedText>
        )}

        {activities !== null && activities.length > 0 && visibleActivities?.length === 0 && (
          <ThemedText style={styles.emptyText}>Sem atividades para estes filtros.</ThemedText>
        )}

        {/* LISTA DE ATIVIDADES (CARTÕES) */}
        <View style={styles.list}>
          {visibleActivities?.map((activity) => (
            <Link key={activity.id} href={{ pathname: '/activity/[id]', params: { id: activity.id } }} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.card}>
                  <ThemedText type="smallBold" style={styles.activityTitle}>
                    {activity.title}
                  </ThemedText>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={14} color="#A0AEC0" />
                    <ThemedText type="small" style={styles.infoText}>
                      {relativeDate(activity.date)}
                    </ThemedText>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#A0AEC0" />
                    <ThemedText type="small" style={styles.infoText}>
                      {activity.location.name}
                    </ThemedText>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.statusBadge}>
                      <ThemedText style={styles.statusText}>{STATUS_LABELS[activity.status]}</ThemedText>
                    </View>
                    <ThemedText style={styles.participantsText}>
                      <Ionicons name="people-outline" size={14} /> {activity.participantsList.length}/{activity.maxParticipants}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
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
    gap: Spacing.four, // Mais espaço entre secções
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CF8444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  chipRowScroll: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  sportChipsScroll: {
    marginBottom: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#CF8444',
    borderColor: '#CF8444',
  },
  chipText: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#0F172A', // Texto escuro para contrastar bem com o fundo laranja
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    textAlign: 'center',
    color: '#FF6B6B',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#334155',
    gap: Spacing.two,
  },
  activityTitle: {
    color: '#CF8444',
    fontSize: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#A0AEC0',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statusBadge: {
    backgroundColor: '#10B981', // Verde suave para os status
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  participantsText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
});