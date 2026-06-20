import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { getMyActivities } from '@/services/activities';
import { Activity } from '@/types/activity';
import { relativeDate } from '@/utils/date';

export default function ChatsScreen() {
  const { user } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const { checkUnread, unreadIds = [] } = useChatBadge();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    getMyActivities().then((data) => {
      setActivities(data);
      const chattableIds = data
        // CORREÇÃO: (a.participantsList || []) impede o erro de undefined
        .filter((a) => a.status !== 'cancelled' && (a.participantsList || []).includes(user?.uid ?? ''))
        .map((a) => a.id);
      checkUnread(chattableIds);
    }).catch(() => setActivities([]));
  }, [checkUnread, user?.uid]);

  useFocusEffect(load);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await getMyActivities();
      setActivities(data);
      const chattableIds = data
        .filter((a) => a.status !== 'cancelled' && (a.participantsList || []).includes(user?.uid ?? ''))
        .map((a) => a.id);
      checkUnread(chattableIds);
    } catch {
      setActivities([]);
    } finally {
      setRefreshing(false);
    }
  }

  const uid = user?.uid ?? '';
  const allChats = (activities ?? []).filter(
    (a) => a.status !== 'cancelled' && (a.participantsList || []).includes(uid)
  );
  
  const activeChats = allChats.filter((a) => a.status === 'open' || a.status === 'full');
  const pastChats = allChats.filter((a) => a.status === 'completed');

  function renderCard(activity: Activity) {
    const isUnread = unreadIds.includes(activity.id);
    const participantsCount = (activity.participantsList || []).length;

    return (
      <Link key={activity.id} href={{ pathname: '/chat/[id]', params: { id: activity.id } }} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                  {activity.title}
                </ThemedText>
                {/* Bolinha laranja se houver mensagens por ler */}
                {isUnread && <View style={styles.unreadBadge} />}
              </View>
              <ThemedText type="small" style={styles.dateText}>
                {relativeDate(activity.date)}
              </ThemedText>
            </View>
            <View style={styles.cardFooter}>
              <ThemedText type="small" style={styles.infoText}>
                {activity.location.name} • {participantsCount} {participantsCount === 1 ? 'participante' : 'participantes'}
              </ThemedText>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: BottomTabInset + safeAreaInsets.bottom + Spacing.four, paddingTop: TopTabInset + Spacing.four },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CF8444" />}>
      <View style={styles.container}>
        <ThemedText type="title" style={styles.pageTitle}>Chats</ThemedText>

        {activities === null && (
          <ThemedText style={styles.emptyText}>A carregar...</ThemedText>
        )}

        {activities !== null && allChats.length === 0 && (
          <ThemedText style={[styles.emptyText, { marginTop: 40 }]}>
            Ainda não participas em nenhuma atividade. Junta-te a uma para poder conversar!
          </ThemedText>
        )}

        {activeChats.length > 0 && (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Ativas</ThemedText>
            {activeChats.map(renderCard)}
          </>
        )}

        {pastChats.length > 0 && (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Terminadas</ThemedText>
            {pastChats.map(renderCard)}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#0F172A', // Fundo escuro principal
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  pageTitle: {
    color: '#FFFFFF',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    color: '#FFFFFF',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1, // Para garantir que o título não empurra a data para fora do ecrã
  },
  cardTitle: {
    color: '#CF8444',
    fontSize: 16,
    flexShrink: 1, // Permite que o título corte com "..." se for muito longo
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CF8444',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#94A3B8',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});