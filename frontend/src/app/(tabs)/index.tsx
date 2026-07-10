import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ScrollView, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { listActivities } from '@/services/activities';
import { listSports } from '@/services/sports';
import { getNotifications } from '@/services/notifications';
import { Activity } from '@/types/activity';
import { Sport } from '@/types/sport';

const DIFFICULTY_LABELS: Record<Activity['difficultyLevel'], string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

const ALL_FILTER = 'Todos';

function isUpcoming(activity: Activity) {
  return (
    (activity.status === 'open' || activity.status === 'full') &&
    new Date(activity.date).getTime() >= Date.now()
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { user } = useAuth();
  const { unreadCount: chatUnread } = useChatBadge();
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0];

  // Filtro selecionado (nome da modalidade, ou 'Todos')
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  // Dados reais vindos do backend
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      listActivities()
        .then(setActivities)
        .catch(() => setActivities([]));
      listSports()
        .then(setSports)
        .catch(() => setSports([]));
      getNotifications()
        .then((list) => setUnreadCount(list.filter((n) => !n.read).length))
        .catch(() => setUnreadCount(0));
    }, [])
  );

  // sportId -> nome da modalidade, para mostrar no cartão e filtrar por nome
  const sportNameById = new Map(sports.map((s) => [s.id, s.name]));

  // Chips de filtro: "Todos" + as modalidades que existem
  const filters = [ALL_FILTER, ...sports.map((s) => s.name)];

  const upcoming = activities
    .filter(isUpcoming)
    .filter(
      (a) => activeFilter === ALL_FILTER || sportNameById.get(a.sportId) === activeFilter
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* CABEÇALHO */}
        <View style={[styles.header, styles.headerRow]}>
          <View style={styles.profileHeader}>
            {/* Foto de Perfil */}
            {profile?.avatarUrl || user?.photoURL ? (
              <Image source={{ uri: profile?.avatarUrl ?? user?.photoURL ?? undefined }} style={styles.profilePic} />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Ionicons name="person" size={24} color="#64748B" />
              </View>
            )}
            
            {/* Nome e Mensagem */}
            <View>
              <ThemedText type="subtitle" style={styles.profileName}>
                {user?.displayName ?? firstName ?? 'Sem Nome'}
              </ThemedText>
              <ThemedText style={styles.greetingText}>
                Pronto para a tua próxima atividade?
              </ThemedText>
            </View>
          </View>

          {/* AÇÕES RÁPIDAS: notificações, chats, amigos */}
          <View style={styles.headerIcons}>
            <Link href="/notifications" asChild>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.iconBadge}>
                    <ThemedText style={styles.iconBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</ThemedText>
                  </View>
                )}
              </Pressable>
            </Link>

            <Link href="/chats" asChild>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
                {chatUnread > 0 && (
                  <View style={styles.iconBadge}>
                    <ThemedText style={styles.iconBadgeText}>{chatUnread > 9 ? '9+' : chatUnread}</ThemedText>
                  </View>
                )}
              </Pressable>
            </Link>

            <Link href="/friends" asChild>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="people-outline" size={24} color="#FFFFFF" />
              </Pressable>
            </Link>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* SECÇÃO DE FILTROS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive
                  ]}
                >
                  {filter === ALL_FILTER && (
                    <Ionicons
                      name="medal-outline"
                      size={16}
                      color={isActive ? "#0F172A" : "#A0AEC0"}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <ThemedText style={[
                    styles.filterText,
                    isActive && styles.filterTextActive
                  ]}>
                    {filter}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SECÇÃO DE ATIVIDADES */}
          <View style={styles.activitiesHeader}>
            <ThemedText type="subtitle" style={{ color: '#FFFFFF', fontSize: 20 }}>
              Atividades Próximas
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText style={{ color: '#CF8444', fontWeight: 'bold' }}>
                  Ver todas {'>'}
                </ThemedText>
              </Pressable>
            </Link>

          </View>

          <View style={styles.activitiesList}>
            {upcoming.length > 0 ? (
              // Cartões com os dados reais vindos do backend
              upcoming.map((activity) => {
                const difficulty = DIFFICULTY_LABELS[activity.difficultyLevel];
                return (
                  <Pressable
                    key={activity.id}
                    onPress={() =>
                      router.push({ pathname: '/activity/[id]', params: { id: activity.id } })
                    }
                    style={({ pressed }) => pressed && styles.pressed}>
                      <View style={styles.activityCard}>
                        <View style={styles.cardImagePlaceholder}>
                          <View style={styles.sportBadge}>
                            <Ionicons name="football-outline" size={14} color="#FFFFFF" />
                            <ThemedText style={styles.sportBadgeText}>
                              {sportNameById.get(activity.sportId) ?? activity.sportId}
                            </ThemedText>
                          </View>
                          {activity.requiresApproval && (
                            <View style={styles.approvalBadge}>
                              <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                              <ThemedText style={styles.approvalBadgeText}>Entrada por aprovação</ThemedText>
                            </View>
                          )}
                        </View>

                        <View style={styles.cardBody}>
                          <ThemedText type="subtitle" style={styles.activityTitle}>
                            {activity.title}
                          </ThemedText>

                          <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={14} color="#A0AEC0" />
                            <ThemedText style={styles.infoText}>{formatDate(activity.date)}</ThemedText>
                            <Ionicons name="time-outline" size={14} color="#A0AEC0" style={{ marginLeft: 10 }} />
                            <ThemedText style={styles.infoText}>{formatTime(activity.date)}</ThemedText>
                          </View>

                          <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#A0AEC0" />
                            <ThemedText style={styles.infoText}>{activity.location.name}</ThemedText>
                          </View>

                          <View style={styles.cardFooter}>
                            <View style={[
                              styles.difficultyBadge,
                              difficulty === 'Avançado' ? { backgroundColor: '#FF6B6B' } : {}
                            ]}>
                              <ThemedText style={styles.difficultyText}>{difficulty}</ThemedText>
                            </View>

                            <View style={styles.spotsContainer}>
                              <Ionicons name="people-outline" size={14} color="#A0AEC0" />
                              <ThemedText style={styles.spotsText}>
                                {activity.participantsList.length}/{activity.maxParticipants}
                              </ThemedText>
                              {activity.status === 'full' && (
                                <ThemedText style={[styles.spotsText, { color: '#FF6B6B' }]}>
                                  · Completa
                                </ThemedText>
                              )}
                              {activity.waitlist.length > 0 && (
                                <ThemedText style={[styles.spotsText, { color: '#CF8444' }]}>
                                  +{activity.waitlist.length} em espera
                                </ThemedText>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="sad-outline" size={48} color="#334155" />
                <ThemedText style={styles.emptyStateTitle}>Nenhuma atividade encontrada</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  {activeFilter === ALL_FILTER
                    ? 'Não existem atividades de momento. Cria a primeira!'
                    : `Não há atividades de ${activeFilter} de momento.`}
                </ThemedText>
              </View>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingTop: TopTabInset + Spacing.two,
  },
  header: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 6,
  },
  iconBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profilePic: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  profilePicPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  greetingText: {
    color: '#A0AEC0',
    fontSize: 14,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.five,
    height: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#CF8444',
    borderColor: '#CF8444',
  },
  filterText: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0F172A',
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  activitiesList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardImagePlaceholder: {
    height: 120,
    backgroundColor: '#334155',
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sportBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  approvalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  activityTitle: {
    color: '#CF8444',
    fontSize: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#A0AEC0',
    fontSize: 14,
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
  difficultyBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
