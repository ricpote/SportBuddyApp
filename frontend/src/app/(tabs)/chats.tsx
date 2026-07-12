import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AvatarCircle } from '@/components/avatar-circle';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { getMyActivities } from '@/services/activities';
import { getConversations, openConversation } from '@/services/conversations';
import { getFriends } from '@/services/friends';
import { Activity } from '@/types/activity';
import { Friend } from '@/types/friend';
import { Conversation } from '@/types/message';
import { relativeDate } from '@/utils/date';

type ChatTab = 'friends' | 'activities';

function avatarColor(userId: string): string {
  const colors = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const { checkUnread, checkUnreadConversations, unreadIds = [], unreadConversationIds = [] } = useChatBadge();
  const [tab, setTab] = useState<ChatTab>('friends');
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modo "nova conversa": mostra a lista de amigos para escolher um
  const [newChatMode, setNewChatMode] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const load = useCallback(() => {
    getMyActivities().then((data) => {
      setActivities(data);
      const chattableIds = data
        // CORREÇÃO: (a.participantsList || []) impede o erro de undefined
        .filter((a) => a.status !== 'cancelled' && (a.participantsList || []).includes(user?.uid ?? ''))
        .map((a) => a.id);
      checkUnread(chattableIds, user?.uid);
    }).catch(() => setActivities([]));

    getConversations().then((data) => {
      setConversations(data);
      checkUnreadConversations(data.map((c) => c.id), user?.uid);
    }).catch(() => setConversations([]));
  }, [checkUnread, checkUnreadConversations, user?.uid]);

  useFocusEffect(load);

  async function onRefresh() {
    setRefreshing(true);
    try {
      load();
    } finally {
      setRefreshing(false);
    }
  }

  async function enterNewChat() {
    setNewChatMode(true);
    setNewChatError(null);
    if (friends === null) {
      getFriends().then(setFriends).catch(() => setFriends([]));
    }
  }

  async function startChatWith(friendId: string, friendName: string, friendAvatarUrl?: string) {
    if (opening) return;
    setOpening(friendId);
    setNewChatError(null);
    try {
      const { conversationId } = await openConversation(friendId);
      setNewChatMode(false);
      router.push({
        pathname: '/direct-chat/[id]',
        params: { id: conversationId, name: friendName, avatarUrl: friendAvatarUrl },
      });
    } catch (e) {
      setNewChatError(e instanceof Error ? e.message : 'Erro ao abrir conversa');
    } finally {
      setOpening(null);
    }
  }

  const uid = user?.uid ?? '';
  const allChats = (activities ?? []).filter(
    (a) => a.status !== 'cancelled' && (a.participantsList || []).includes(uid)
  );

  const activeChats = allChats.filter((a) => a.status === 'open' || a.status === 'full');
  const pastChats = allChats.filter((a) => a.status === 'completed');

  function renderActivityCard(activity: Activity) {
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

  function renderConversationCard(conversation: Conversation) {
    const isUnread = unreadConversationIds.includes(conversation.id);

    return (
      <Link
        key={conversation.id}
        href={{
          pathname: '/direct-chat/[id]',
          params: {
            id: conversation.id,
            name: conversation.otherUser.name,
            avatarUrl: conversation.otherUser.avatarUrl,
          },
        }}
        asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <View style={[styles.card, styles.conversationCard]}>
            <AvatarCircle
              name={conversation.otherUser.name}
              avatarUrl={conversation.otherUser.avatarUrl}
              size={44}
              backgroundColor={avatarColor(conversation.otherUser.id)}
            />
            <View style={styles.conversationBody}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                    {conversation.otherUser.name}
                  </ThemedText>
                  {isUnread && <View style={styles.unreadBadge} />}
                </View>
                {conversation.lastMessageAt && (
                  <ThemedText type="small" style={styles.dateText}>
                    {relativeDate(conversation.lastMessageAt)}
                  </ThemedText>
                )}
              </View>
              {conversation.lastMessage && (
                <ThemedText type="small" style={styles.infoText} numberOfLines={1}>
                  {conversation.lastMessage}
                </ThemedText>
              )}
            </View>
          </View>
        </Pressable>
      </Link>
    );
  }

  function renderFriendRow(friend: Friend) {
    const isOpening = opening === friend.userId;

    return (
      <Pressable
        key={friend.userId}
        onPress={() => startChatWith(friend.userId, friend.user.name, friend.user.avatarUrl)}
        style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.card, styles.conversationCard, isOpening && { opacity: 0.6 }]}>
          <AvatarCircle
            name={friend.user.name}
            avatarUrl={friend.user.avatarUrl}
            size={44}
            backgroundColor={avatarColor(friend.userId)}
          />
          <View style={styles.conversationBody}>
            <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
              {friend.user.name}
            </ThemedText>
          </View>
          <Ionicons name="chatbubble-outline" size={20} color="#e8823f" />
        </View>
      </Pressable>
    );
  }

  // Vista de escolha de amigo para nova conversa
  if (newChatMode) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + safeAreaInsets.bottom + Spacing.four, paddingTop: TopTabInset + Spacing.four },
        ]}>
        <View style={styles.container}>
          <View style={styles.newChatHeader}>
            <Pressable onPress={() => setNewChatMode(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#e8823f" />
            </Pressable>
            <ThemedText type="title" style={styles.pageTitle}>Nova conversa</ThemedText>
          </View>

          {newChatError && (
            <ThemedText type="small" style={styles.errorText}>{newChatError}</ThemedText>
          )}

          {friends === null && (
            <ThemedText style={styles.emptyText}>A carregar amigos...</ThemedText>
          )}

          {friends !== null && friends.length === 0 && (
            <ThemedText style={[styles.emptyText, { marginTop: 40 }]}>
              Ainda não tens amigos. Adiciona amigos para poderes conversar com eles!
            </ThemedText>
          )}

          {(friends ?? []).map(renderFriendRow)}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: BottomTabInset + safeAreaInsets.bottom + Spacing.four, paddingTop: TopTabInset + Spacing.four },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8823f" />}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.pageTitle}>Chats</ThemedText>
          {tab === 'friends' && (
            <Pressable
              onPress={enterNewChat}
              style={({ pressed }) => [styles.newChatBtn, pressed && styles.pressed]}
              hitSlop={8}>
              <Ionicons name="add" size={24} color="#f4f2ef" />
            </Pressable>
          )}
        </View>

        {/* Separadores Amigos / Atividades */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setTab('friends')}
            style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}>
            <ThemedText type="smallBold" style={tab === 'friends' ? styles.tabTextActive : styles.tabText}>
              Amigos
            </ThemedText>
            {unreadConversationIds.length > 0 && tab !== 'friends' && <View style={styles.tabDot} />}
          </Pressable>
          <Pressable
            onPress={() => setTab('activities')}
            style={[styles.tabBtn, tab === 'activities' && styles.tabBtnActive]}>
            <ThemedText type="smallBold" style={tab === 'activities' ? styles.tabTextActive : styles.tabText}>
              Atividades
            </ThemedText>
            {unreadIds.length > 0 && tab !== 'activities' && <View style={styles.tabDot} />}
          </Pressable>
        </View>

        {tab === 'friends' && (
          <>
            {conversations === null && (
              <ThemedText style={styles.emptyText}>A carregar...</ThemedText>
            )}

            {conversations !== null && conversations.length === 0 && (
              <ThemedText style={[styles.emptyText, { marginTop: 40 }]}>
                Ainda não tens conversas. Toca no + para começares uma com um amigo!
              </ThemedText>
            )}

            {(conversations ?? []).map(renderConversationCard)}
          </>
        )}

        {tab === 'activities' && (
          <>
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
                {activeChats.map(renderActivityCard)}
              </>
            )}

            {pastChats.length > 0 && (
              <>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Terminadas</ThemedText>
                {pastChats.map(renderActivityCard)}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#0a0a0b', // Fundo escuro principal
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pageTitle: {
    color: '#f4f2ef',
    marginBottom: Spacing.two,
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8823f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#111012',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 4,
    marginBottom: Spacing.two,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#e8823f',
  },
  tabText: {
    color: '#8f8b85',
  },
  tabTextActive: {
    color: '#f4f2ef',
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e8823f',
  },
  sectionTitle: {
    color: '#f4f2ef',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  card: {
    backgroundColor: '#111012',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  conversationBody: {
    flex: 1,
    gap: 4,
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
    color: '#e8823f',
    fontSize: 16,
    flexShrink: 1, // Permite que o título corte com "..." se for muito longo
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e8823f',
  },
  dateText: {
    color: '#8f8b85',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#8f8b85',
  },
  emptyText: {
    color: '#8f8b85',
    textAlign: 'center',
  },
  errorText: {
    color: '#eb8f84',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
