import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { Friend, FriendRequest, FriendUser } from '@/types/friend';
import { openConversation } from '@/services/conversations';
import { acceptFriendRequest, getFriends, getPendingRequests, rejectFriendRequest, removeFriend, sendFriendRequest } from '@/services/friends';
import { searchUsers } from '@/services/users';

const SEARCH_DEBOUNCE_MS = 400;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function AvatarCircle({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatar}>
      <ThemedText style={styles.avatarText}>{initials(name)}</ThemedText>
    </View>
  );
}

export default function FriendsScreen() {
  const { user: me } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  // Pesquisa de perfis por nome
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [searchMode, setSearchMode] = useState(false);

  function exitSearch() {
    setSearchMode(false);
    setQuery('');
    setResults(null);
    setSearchError(null);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then((users) => {
          setResults(users.filter((u) => u.id !== me?.uid));
          setSearchError(null);
        })
        .catch(() => {
          setResults([]);
          setSearchError('Não foi possível pesquisar. Tenta de novo.');
        })
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, me?.uid]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        try {
          const [reqs, frs] = await Promise.all([getPendingRequests(), getFriends()]);
          setRequests(reqs);
          setFriends(frs);
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [])
  );

  async function handleAccept(req: FriendRequest) {
    await acceptFriendRequest(req.requestId);
    setRequests((prev) => prev.filter((r) => r.requestId !== req.requestId));
    setFriends((prev) => [{ userId: req.from.id, user: req.from }, ...prev]);
  }

  async function handleReject(requestId: string) {
    await rejectFriendRequest(requestId);
    setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
  }

  async function handleRemove(friendId: string) {
    await removeFriend(friendId);
    setFriends((prev) => prev.filter((f) => f.userId !== friendId));
  }

  // Abre (ou cria) a conversa direta com este amigo e vai para o chat
  async function handleOpenChat(friend: Friend) {
    try {
      const { conversationId } = await openConversation(friend.userId);
      router.push({
        pathname: '/direct-chat/[id]',
        params: { id: conversationId, name: friend.user.name, avatarUrl: friend.user.avatarUrl },
      });
    } catch {}
  }

  async function handleSendRequest(user: FriendUser) {
    try {
      await sendFriendRequest(user.id);
      setSentIds((prev) => [...prev, user.id]);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message === 'Já enviaste um pedido a este utilizador' || message === 'Já são amigos') {
        setSentIds((prev) => [...prev, user.id]);
      } else {
        setSearchError(message || 'Erro ao enviar pedido');
      }
    }
  }

  const friendIds = friends.map((f) => f.userId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#CF8444" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {searchMode ? (
          <>
            <View style={styles.searchHeader}>
              <Pressable onPress={exitSearch} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <ThemedText style={styles.searchHeaderTitle}>Adicionar amigo</ThemedText>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder="Procurar pessoas pelo nome..."
                placeholderTextColor="#64748B"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </Pressable>
              )}
            </View>

            {searchError && <ThemedText style={styles.searchError}>{searchError}</ThemedText>}

            {results === null ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={48} color="#334155" style={{ marginBottom: 8 }} />
                <ThemedText style={styles.emptyText}>Escreve pelo menos 2 letras para procurar.</ThemedText>
              </View>
            ) : (
              <>
                <ThemedText style={styles.sectionTitle}>
                  Resultados{searching ? '...' : ` (${results.length})`}
                </ThemedText>
                {results.length === 0 && !searching ? (
                  <View style={styles.empty}>
                    <ThemedText style={styles.emptyText}>Nenhum utilizador encontrado.</ThemedText>
                  </View>
                ) : (
                  results.map((u) => {
                    const isFriend = friendIds.includes(u.id);
                    const isSent = sentIds.includes(u.id);
                    return (
                      <Pressable
                        key={u.id}
                        style={styles.row}
                        onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })}
                      >
                        <AvatarCircle name={u.name} avatarUrl={u.avatarUrl} />
                        <ThemedText style={styles.name}>{u.name}</ThemedText>
                        <View style={styles.actions}>
                          {isFriend ? (
                            <View style={styles.acceptBtn}>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                            </View>
                          ) : isSent ? (
                            <View style={styles.chatBtn}>
                              <Ionicons name="hourglass-outline" size={18} color="#475569" />
                            </View>
                          ) : (
                            <Pressable style={styles.addBtn} onPress={() => handleSendRequest(u)} hitSlop={4}>
                              <Ionicons name="person-add-outline" size={18} color="#CF8444" />
                            </Pressable>
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </>
            )}
          </>
        ) : (
          <>
        <Pressable
          style={({ pressed }) => [styles.addFriendBtn, pressed && styles.addFriendBtnPressed]}
          onPress={() => setSearchMode(true)}
        >
          <Ionicons name="person-add" size={18} color="#0F172A" />
          <ThemedText style={styles.addFriendBtnText}>Adicionar amigo</ThemedText>
        </Pressable>

        {requests.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Pedidos ({requests.length})</ThemedText>
            {requests.map((req) => (
              <View key={req.requestId} style={styles.row}>
                <AvatarCircle name={req.from.name} avatarUrl={req.from.avatarUrl} />
                <ThemedText style={styles.name}>{req.from.name}</ThemedText>
                <View style={styles.actions}>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAccept(req)}>
                    <Ionicons name="checkmark" size={18} color="#10B981" />
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleReject(req.requestId)}>
                    <Ionicons name="close" size={18} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        <ThemedText style={styles.sectionTitle}>Amigos ({friends.length})</ThemedText>
        {friends.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#334155" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyText}>Ainda não tens amigos. Adiciona a partir do perfil de alguém.</ThemedText>
          </View>
        ) : (
          friends.map((f) => (
            <View key={f.userId} style={styles.row}>
              <Pressable
                style={({ pressed }) => [styles.friendInfo, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: f.userId } })}>
                <AvatarCircle name={f.user.name} avatarUrl={f.user.avatarUrl} />
                <ThemedText style={styles.name}>{f.user.name}</ThemedText>
              </Pressable>
              <View style={styles.actions}>
                <Pressable style={styles.chatBtn} onPress={() => handleOpenChat(f)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#CF8444" />
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => handleRemove(f.userId)}>
                  <Ionicons name="person-remove-outline" size={18} color="#FF6B6B" />
                </Pressable>
              </View>
            </View>
          ))
        )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { backgroundColor: '#0F172A' },
  scrollContent: { flexGrow: 1, paddingVertical: Spacing.four },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Spacing.two,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#CF8444',
    borderRadius: 12,
    height: 48,
  },
  addFriendBtnPressed: {
    opacity: 0.8,
  },
  addFriendBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: Spacing.three,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    height: '100%',
  },
  searchError: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center',
  },
  addBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#CF844420',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CF8444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  name: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 15,
  },
  friendInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  acceptBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#10B98120',
  },
  rejectBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FF6B6B20',
  },
  chatBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#33415540',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
});
