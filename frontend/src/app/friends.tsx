import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Friend, FriendRequest } from '@/types/friend';
// Serviço pronto a usar quando o backend existir:
// import { getFriends, getPendingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend } from '@/services/friends';

// ── DADOS FICTÍCIOS ──────────────────────────────────────────────────────────
// Substituir por getPendingRequests()/getFriends() dentro de um useFocusEffect
// quando os endpoints estiverem prontos.
const MOCK_REQUESTS: FriendRequest[] = [
  { friendshipId: 'r1', from: { id: 'u1', name: 'Ana Costa' }, createdAt: new Date().toISOString() },
  { friendshipId: 'r2', from: { id: 'u2', name: 'Bruno Dias' }, createdAt: new Date().toISOString() },
];
const MOCK_FRIENDS: Friend[] = [
  { friendshipId: 'f1', user: { id: 'u3', name: 'Carla Nunes' } },
  { friendshipId: 'f2', user: { id: 'u4', name: 'Diogo Reis' } },
  { friendshipId: 'f3', user: { id: 'u5', name: 'Eva Marques' } },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function FriendsScreen() {
  const [requests, setRequests] = useState<FriendRequest[]>(MOCK_REQUESTS);
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);

  function handleAccept(req: FriendRequest) {
    // Backend real: await acceptFriendRequest(req.friendshipId);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== req.friendshipId));
    setFriends((prev) => [{ friendshipId: req.friendshipId, user: req.from }, ...prev]);
  }

  function handleReject(friendshipId: string) {
    // Backend real: await rejectFriendRequest(friendshipId);
    setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
  }

  function handleRemove(friendshipId: string) {
    // Backend real: await removeFriend(friendshipId);
    setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* PEDIDOS DE AMIZADE */}
        {requests.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Pedidos ({requests.length})</ThemedText>
            {requests.map((req) => (
              <View key={req.friendshipId} style={styles.row}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>{initials(req.from.name)}</ThemedText>
                </View>
                <ThemedText style={styles.name}>{req.from.name}</ThemedText>
                <View style={styles.actions}>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAccept(req)}>
                    <Ionicons name="checkmark" size={18} color="#10B981" />
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleReject(req.friendshipId)}>
                    <Ionicons name="close" size={18} color="#FF6B6B" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* OS MEUS AMIGOS */}
        <ThemedText style={styles.sectionTitle}>Amigos ({friends.length})</ThemedText>
        {friends.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#334155" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.emptyText}>Ainda não tens amigos. Adiciona a partir do perfil de alguém.</ThemedText>
          </View>
        ) : (
          friends.map((f) => (
            <View key={f.friendshipId} style={styles.row}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{initials(f.user.name)}</ThemedText>
              </View>
              <ThemedText style={styles.name}>{f.user.name}</ThemedText>
              <View style={styles.actions}>
                {/* Chat 1-1 — em breve (fica pronto quando a conversa direta existir) */}
                <Pressable style={styles.chatBtn} disabled>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475569" />
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => handleRemove(f.friendshipId)}>
                  <Ionicons name="person-remove-outline" size={18} color="#FF6B6B" />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <ThemedText style={styles.note}>
          Dados de demonstração. Ligar aos endpoints de amigos quando o backend estiver pronto.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { backgroundColor: '#0F172A' },
  scrollContent: { flexGrow: 1, paddingVertical: Spacing.four },
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
  actions: {
    flexDirection: 'row',
    gap: 8,
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
  note: {
    color: '#475569',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
