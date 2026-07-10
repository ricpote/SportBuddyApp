import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Friend, FriendRequest } from '@/types/friend';
import { acceptFriendRequest, getFriends, getPendingRequests, rejectFriendRequest, removeFriend } from '@/services/friends';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function FriendsScreen() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

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
        {requests.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Pedidos ({requests.length})</ThemedText>
            {requests.map((req) => (
              <View key={req.requestId} style={styles.row}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>{initials(req.from.name)}</ThemedText>
                </View>
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
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{initials(f.user.name)}</ThemedText>
              </View>
              <ThemedText style={styles.name}>{f.user.name}</ThemedText>
              <View style={styles.actions}>
                <Pressable style={styles.chatBtn} disabled>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475569" />
                </Pressable>
                <Pressable style={styles.rejectBtn} onPress={() => handleRemove(f.userId)}>
                  <Ionicons name="person-remove-outline" size={18} color="#FF6B6B" />
                </Pressable>
              </View>
            </View>
          ))
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
});
