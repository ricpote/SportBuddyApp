import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, ScrollView, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeatherSection } from '@/components/weather-section';
import { sportImages } from '@/constants/sport-images';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { listActivities, getFriendsActivities } from '@/services/activities';
import { listSports } from '@/services/sports';
import { getNotifications } from '@/services/notifications';
import { getFriends } from '@/services/friends';
import { Activity } from '@/types/activity';
import { Sport } from '@/types/sport';
import { Friend } from '@/types/friend';
import { SportIcon } from '@/utils/sport-icon';

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
  const { unreadCount: chatUnread } = useChatBadge();
  const firstName = (user?.displayName ?? user?.email ?? '').split(/[\s@]/)[0];

  // Filtro selecionado (nome da modalidade, ou 'Todos')
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);

  // Dados reais vindos do backend
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsActivities, setFriendsActivities] = useState<Activity[]>([]);

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
      getFriends()
        .then(setFriends)
        .catch(() => setFriends([]));
      getFriendsActivities()
        .then(setFriendsActivities)
        .catch(() => setFriendsActivities([]));
    }, [])
  );

  // sportId -> nome da modalidade, para mostrar no cartão e filtrar por nome
  const sportNameById = new Map(sports.map((s) => [s.id, s.name]));

  // friendId -> primeiro nome, para mostrar quem vai em cada atividade recomendada
  const friendNameById = new Map(
    friends.map((f) => [f.userId, f.user.name.split(' ')[0]])
  );

  function friendsGoingLabel(activity: Activity) {
    const names = activity.participantsList
      .map((id) => friendNameById.get(id))
      .filter((name): name is string => !!name);

    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} vai participar`;
    if (names.length === 2) return `${names[0]} e ${names[1]} vão participar`;
    return `${names[0]} e mais ${names.length - 1} amigos vão participar`;
  }

  // Chips de filtro: "Todos" + as modalidades que existem
  const filters = [ALL_FILTER, ...sports.map((s) => s.name)];

  const upcoming = activities
    .filter(isUpcoming)
    .filter(
      (a) => activeFilter === ALL_FILTER || sportNameById.get(a.sportId) === activeFilter
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#0a0a0b' }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* CABEÇALHO */}
        <View style={[styles.header, styles.headerRow]}>
          <View style={styles.profileHeader}>
            {/* Foto de Perfil */}
            {profile?.avatarUrl || user?.photoURL ? (
              <Image source={{ uri: profile?.avatarUrl ?? user?.photoURL ?? undefined }} style={styles.profilePic} />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Ionicons name="person" size={24} color="#8f8b85" />
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
                <Ionicons name="notifications-outline" size={24} color="#f4f2ef" />
                {unreadCount > 0 && (
                  <View style={styles.iconBadge}>
                    <ThemedText style={styles.iconBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</ThemedText>
                  </View>
                )}
              </Pressable>
            </Link>

            <Link href="/chats" asChild>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#f4f2ef" />
                {chatUnread > 0 && (
                  <View style={styles.iconBadge}>
                    <ThemedText style={styles.iconBadgeText}>{chatUnread > 9 ? '9+' : chatUnread}</ThemedText>
                  </View>
                )}
              </Pressable>
            </Link>

            <Link href="/friends" asChild>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="people-outline" size={24} color="#f4f2ef" />
              </Pressable>
            </Link>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* SECÇÃO DE METEOROLOGIA */}
          <WeatherSection />

          {/* SECÇÃO DE FILTROS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.filtersScroll}
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
                  {filter === ALL_FILTER ? (
                    <Ionicons
                      name="medal-outline"
                      size={16}
                      color={isActive ? "#0a0a0b" : "#c9c5bf"}
                      style={{ marginRight: 5 }}
                    />
                  ) : (
                    <SportIcon
                      sportName={filter}
                      size={16}
                      color={isActive ? "#0a0a0b" : "#c9c5bf"}
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

          {/* SECÇÃO "RECOMENDADO PARA TI" — atividades futuras onde amigos já estão inscritos */}
          {friendsActivities.length > 0 && (
            <View style={styles.recommendedSection}>
              <View style={styles.activitiesHeader}>
                <ThemedText type="subtitle" style={{ color: '#f4f2ef', fontSize: 20 }}>
                  Recomendado para ti
                </ThemedText>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedList}
              >
                {friendsActivities.map((activity) => (
                  <Pressable
                    key={activity.id}
                    onPress={() =>
                      router.push({ pathname: '/activity/[id]', params: { id: activity.id } })
                    }
                    style={({ pressed }) => [styles.recommendedCard, pressed && styles.pressed]}
                  >
                    <View style={styles.sportBadge}>
                      <SportIcon sportName={sportNameById.get(activity.sportId)} size={14} color="#f4f2ef" />
                      <ThemedText style={styles.sportBadgeText}>
                        {sportNameById.get(activity.sportId) ?? activity.sportId}
                      </ThemedText>
                    </View>

                    <ThemedText type="subtitle" style={styles.activityTitle} numberOfLines={1}>
                      {activity.title}
                    </ThemedText>

                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={14} color="#c9c5bf" />
                      <ThemedText style={styles.infoText}>{formatDate(activity.date)}</ThemedText>
                      <Ionicons name="time-outline" size={14} color="#c9c5bf" style={{ marginLeft: 10 }} />
                      <ThemedText style={styles.infoText}>{formatTime(activity.date)}</ThemedText>
                    </View>

                    <View style={styles.friendsGoingRow}>
                      <Ionicons name="people-outline" size={14} color="#e8823f" style={{ marginTop: 2 }} />
                      <ThemedText style={styles.friendsGoingText} numberOfLines={2}>
                        {friendsGoingLabel(activity)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* SECÇÃO DE ATIVIDADES */}
          <View style={styles.activitiesHeader}>
            <ThemedText type="subtitle" style={{ color: '#f4f2ef', fontSize: 20 }}>
              Atividades Próximas
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText style={{ color: '#e8823f', fontWeight: 'bold' }}>
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
                        {/* Foto do desporto como fundo; sem foto fica o cinzento de sempre */}
                        <ImageBackground
                          source={sportImages[activity.sportId]}
                          resizeMode="cover"
                          style={styles.cardImagePlaceholder}>
                          <View style={styles.cardImageOverlay} />
                          <View style={styles.sportBadge}>
                            <SportIcon sportName={sportNameById.get(activity.sportId)} size={14} color="#f4f2ef" />
                            <ThemedText style={styles.sportBadgeText}>
                              {sportNameById.get(activity.sportId) ?? activity.sportId}
                            </ThemedText>
                          </View>
                          {activity.requiresApproval && (
                            <View style={styles.approvalBadge}>
                              <Ionicons name="lock-closed" size={12} color="#f4f2ef" />
                              <ThemedText style={styles.approvalBadgeText}>Entrada por aprovação</ThemedText>
                            </View>
                          )}
                        </ImageBackground>

                        <View style={styles.cardBody}>
                          <ThemedText type="subtitle" style={styles.activityTitle}>
                            {activity.title}
                          </ThemedText>

                          <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={14} color="#c9c5bf" />
                            <ThemedText style={styles.infoText}>{formatDate(activity.date)}</ThemedText>
                            <Ionicons name="time-outline" size={14} color="#c9c5bf" style={{ marginLeft: 10 }} />
                            <ThemedText style={styles.infoText}>{formatTime(activity.date)}</ThemedText>
                          </View>

                          <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#c9c5bf" />
                            <ThemedText style={styles.infoText}>{activity.location.name}</ThemedText>
                          </View>

                          <View style={styles.cardFooter}>
                            <View style={[
                              styles.difficultyBadge,
                              difficulty === 'Avançado' ? { backgroundColor: '#eb8f84' } : {}
                            ]}>
                              <ThemedText style={styles.difficultyText}>{difficulty}</ThemedText>
                            </View>

                            <View style={styles.spotsContainer}>
                              <Ionicons name="people-outline" size={14} color="#c9c5bf" />
                              <ThemedText style={styles.spotsText}>
                                {activity.participantsList.length}/{activity.maxParticipants}
                              </ThemedText>
                              {activity.status === 'full' && (
                                <ThemedText style={[styles.spotsText, { color: '#eb8f84' }]}>
                                  · Completa
                                </ThemedText>
                              )}
                              {activity.waitlist.length > 0 && (
                                <ThemedText style={[styles.spotsText, { color: '#e8823f' }]}>
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
                <Ionicons name="sad-outline" size={48} color="#141315" />
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
    backgroundColor: '#eb8f84',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0a0a0b',
  },
  iconBadgeText: {
    color: '#f4f2ef',
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
    borderColor: '#111012',
  },
  profilePicPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111012',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  profileName: {
    color: '#f4f2ef',
    fontSize: 20,
  },
  greetingText: {
    color: '#c9c5bf',
    fontSize: 14,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  filtersScroll: {
    marginBottom: Spacing.five,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    minHeight: 40,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111012',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: '#e8823f',
    borderColor: '#e8823f',
  },
  filterText: {
    color: '#c9c5bf',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#1a1005',
  },
  recommendedSection: {
    marginBottom: Spacing.five,
  },
  recommendedList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  recommendedCard: {
    width: 260,
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  friendsGoingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  friendsGoingText: {
    color: '#e8823f',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
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
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptyStateTitle: {
    color: '#c9c5bf',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateText: {
    color: '#8f8b85',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  activityCard: {
    backgroundColor: '#111012',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardImagePlaceholder: {
    height: 120,
    backgroundColor: '#141315',
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  // Véu escuro por cima da foto para os chips continuarem legíveis
  cardImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,11,0.35)',
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9ccd6b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  sportBadgeText: {
    color: '#f4f2ef',
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
    color: '#f4f2ef',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  activityTitle: {
    color: '#e8823f',
    fontSize: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#c9c5bf',
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  difficultyBadge: {
    backgroundColor: '#9ccd6b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#f4f2ef',
    fontSize: 12,
    fontWeight: 'bold',
  },
  spotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsText: {
    color: '#c9c5bf',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
