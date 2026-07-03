import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BottomTabInset,
  MaxContentWidth,
  Spacing,
  TopTabInset,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  deleteActivityAsAdmin,
  listAdminActivities,
} from '@/services/activities';
import {
  banUser,
  deleteUser,
  listAdminUsers,
  reactivateUser,
} from '@/services/users';
import { Activity } from '@/types/activity';
import { AdminUser } from '@/types/user';

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export default function AdminScreen() {
  const { profile, profileLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [confirmUserDeleteId, setConfirmUserDeleteId] = useState<string | null>(
    null
  );
  const [confirmActivityDeleteId, setConfirmActivityDeleteId] = useState<
    string | null
  >(null);

  const loadAdminData = useCallback(async () => {
    if (profile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextUsers, nextActivities] = await Promise.all([
        listAdminUsers(),
        listAdminActivities(),
      ]);

      setUsers(nextUsers);
      setActivities(nextActivities);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nao foi possivel carregar o painel'
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.role]);

  useFocusEffect(
    useCallback(() => {
      void loadAdminData();
    }, [loadAdminData])
  );

  const userNameById = useMemo(
    () => new Map(users.map((user) => [user.id, user.name])),
    [users]
  );

  const visibleUsers = useMemo(() => {
    if (!userSearch.trim()) return users;

    return users.filter((user) =>
      [user.name, user.email ?? '', user.role, user.status, user.id].some((value) =>
        matchesSearch(value, userSearch)
      )
    );
  }, [userSearch, users]);

  const visibleActivities = useMemo(() => {
    if (!activitySearch.trim()) return activities;

    return activities.filter((activity) =>
      [
        activity.title,
        activity.description,
        activity.status,
        activity.sportId,
        activity.location.name,
        userNameById.get(activity.createdBy) ?? activity.createdBy,
      ].some((value) => matchesSearch(value, activitySearch))
    );
  }, [activities, activitySearch, userNameById]);

  async function handleBan(userId: string) {
    setBusyKey(`ban:${userId}`);
    setError(null);

    try {
      const updated = await banUser(userId);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...updated } : user))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel banir o user');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReactivate(userId: string) {
    setBusyKey(`reactivate:${userId}`);
    setError(null);

    try {
      const updated = await reactivateUser(userId);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...updated } : user))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nao foi possivel reativar o user'
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (confirmUserDeleteId !== userId) {
      setConfirmUserDeleteId(userId);
      return;
    }

    setBusyKey(`delete-user:${userId}`);
    setError(null);

    try {
      await deleteUser(userId);
      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, status: 'deleted' } : user
        )
      );
      setConfirmUserDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nao foi possivel remover o user'
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (confirmActivityDeleteId !== activityId) {
      setConfirmActivityDeleteId(activityId);
      return;
    }

    setBusyKey(`delete-activity:${activityId}`);
    setError(null);

    try {
      await deleteActivityAsAdmin(activityId);
      setActivities((current) =>
        current.filter((activity) => activity.id !== activityId)
      );
      setConfirmActivityDeleteId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nao foi possivel apagar a atividade'
      );
    } finally {
      setBusyKey(null);
    }
  }

  if (profileLoading || loading) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.subtleText}>A carregar painel admin...</ThemedText>
      </View>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={40} color="#475569" />
        <ThemedText style={styles.sectionTitle}>Acesso restrito</ThemedText>
        <ThemedText style={styles.subtleText}>
          Esta area so aparece para contas admin.
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <ThemedText style={styles.heroEyebrow}>Admin Console</ThemedText>
              <ThemedText style={styles.heroTitle}>
                Controla utilizadores e atividades
              </ThemedText>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              onPress={() => void loadAdminData()}>
              <Ionicons name="refresh-outline" size={16} color="#0F172A" />
              <ThemedText style={styles.refreshButtonText}>Refresh</ThemedText>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <ThemedText style={styles.statValue}>{users.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Users</ThemedText>
            </View>
            <View style={styles.statTile}>
              <ThemedText style={styles.statValue}>{activities.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Atividades</ThemedText>
            </View>
            <View style={styles.statTile}>
              <ThemedText style={styles.statValue}>
                {users.filter((user) => user.status === 'banned').length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Banidos</ThemedText>
            </View>
          </View>

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Users</ThemedText>
            <ThemedText style={styles.sectionMeta}>
              {visibleUsers.length} visiveis
            </ThemedText>
          </View>

          <TextInput
            style={styles.searchInput}
            value={userSearch}
            onChangeText={setUserSearch}
            placeholder="Pesquisar por nome, email, role ou status"
            placeholderTextColor="#64748B"
          />

          <View style={styles.list}>
            {visibleUsers.map((user) => {
              const isCurrentAdmin = user.id === profile.id;
              const isBusy =
                busyKey === `ban:${user.id}` ||
                busyKey === `reactivate:${user.id}` ||
                busyKey === `delete-user:${user.id}`;

              return (
                <View key={user.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleWrap}>
                      <ThemedText style={styles.itemTitle}>{user.name}</ThemedText>
                      <ThemedText style={styles.itemSubtle}>
                        {user.email ?? user.id}
                      </ThemedText>
                    </View>
                    <View style={styles.badgeRow}>
                      <Badge
                        label={user.role}
                        backgroundColor="#1D4ED8"
                        textColor="#DBEAFE"
                      />
                      <Badge
                        label={user.status}
                        backgroundColor={
                          user.status === 'active'
                            ? '#064E3B'
                            : user.status === 'banned'
                              ? '#7F1D1D'
                              : '#3F3F46'
                        }
                        textColor={
                          user.status === 'active'
                            ? '#D1FAE5'
                            : user.status === 'banned'
                              ? '#FECACA'
                              : '#E4E4E7'
                        }
                      />
                    </View>
                  </View>

                  <ThemedText style={styles.itemSubtle}>
                    ID: {user.id}
                  </ThemedText>

                  <View style={styles.actionsRow}>
                    {user.status !== 'banned' ? (
                      <ActionButton
                        label="Banir"
                        tone="warning"
                        disabled={isBusy || isCurrentAdmin}
                        onPress={() => void handleBan(user.id)}
                      />
                    ) : (
                      <ActionButton
                        label="Reativar"
                        tone="success"
                        disabled={isBusy}
                        onPress={() => void handleReactivate(user.id)}
                      />
                    )}

                    <ActionButton
                      label={
                        confirmUserDeleteId === user.id ? 'Confirmar delete' : 'Apagar'
                      }
                      tone="danger"
                      disabled={isBusy || isCurrentAdmin}
                      onPress={() => void handleDeleteUser(user.id)}
                    />
                  </View>

                  {isCurrentAdmin && (
                    <ThemedText style={styles.helperText}>
                      A tua propria conta nao pode ser banida nem apagada daqui.
                    </ThemedText>
                  )}
                </View>
              );
            })}

            {visibleUsers.length === 0 && (
              <ThemedText style={styles.subtleText}>
                Nenhum user encontrado.
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Atividades</ThemedText>
            <ThemedText style={styles.sectionMeta}>
              {visibleActivities.length} visiveis
            </ThemedText>
          </View>

          <TextInput
            style={styles.searchInput}
            value={activitySearch}
            onChangeText={setActivitySearch}
            placeholder="Pesquisar por titulo, local, sport ou criador"
            placeholderTextColor="#64748B"
          />

          <View style={styles.list}>
            {visibleActivities.map((activity) => {
              const isBusy = busyKey === `delete-activity:${activity.id}`;

              return (
                <View key={activity.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleWrap}>
                      <ThemedText style={styles.itemTitle}>
                        {activity.title}
                      </ThemedText>
                      <ThemedText style={styles.itemSubtle}>
                        {activity.location.name}
                      </ThemedText>
                    </View>
                    <Badge
                      label={activity.status}
                      backgroundColor="#3F3F46"
                      textColor="#E4E4E7"
                    />
                  </View>

                  <ThemedText style={styles.itemSubtle}>
                    Criador:{' '}
                    {userNameById.get(activity.createdBy) ?? activity.createdBy}
                  </ThemedText>
                  <ThemedText style={styles.itemSubtle}>
                    Data: {formatDate(activity.date)}
                  </ThemedText>
                  <ThemedText style={styles.itemSubtle}>
                    Participantes: {activity.participantsList.length}/
                    {activity.maxParticipants}
                  </ThemedText>

                  <View style={styles.actionsRow}>
                    <ActionButton
                      label="Ver"
                      tone="neutral"
                      onPress={() =>
                        router.push({
                          pathname: '/activity/[id]',
                          params: { id: activity.id },
                        })
                      }
                    />

                    <ActionButton
                      label="Editar"
                      tone="success"
                      onPress={() =>
                        router.push({
                          pathname: '/edit-activity/[id]',
                          params: { id: activity.id },
                        })
                      }
                    />

                    <ActionButton
                      label={
                        confirmActivityDeleteId === activity.id
                          ? 'Confirmar delete'
                          : 'Apagar'
                      }
                      tone="danger"
                      disabled={isBusy}
                      onPress={() => void handleDeleteActivity(activity.id)}
                    />
                  </View>
                </View>
              );
            })}

            {visibleActivities.length === 0 && (
              <ThemedText style={styles.subtleText}>
                Nenhuma atividade encontrada.
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Badge({
  label,
  backgroundColor,
  textColor,
}: {
  label: string;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <ThemedText style={[styles.badgeText, { color: textColor }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}) {
  const tones = {
    neutral: { backgroundColor: '#1E293B', borderColor: '#334155', textColor: '#E2E8F0' },
    success: { backgroundColor: '#10B98120', borderColor: '#10B981', textColor: '#A7F3D0' },
    warning: { backgroundColor: '#CF844420', borderColor: '#CF8444', textColor: '#FCD9B6' },
    danger: { backgroundColor: '#FF6B6B20', borderColor: '#FF6B6B', textColor: '#FECACA' },
  }[tone];

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: tones.backgroundColor,
          borderColor: tones.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}>
      <ThemedText style={[styles.actionButtonText, { color: tones.textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    alignItems: 'center',
    paddingTop: TopTabInset + Spacing.three,
    paddingBottom:
      (Platform.OS === 'web' ? Spacing.five : BottomTabInset + Spacing.four),
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth + 140,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  heroCard: {
    backgroundColor: '#111C31',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  heroEyebrow: {
    color: '#8FB7FF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    maxWidth: 460,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  refreshButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  statTile: {
    minWidth: 120,
    backgroundColor: '#17253F',
    borderRadius: 18,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#23314B',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionMeta: {
    color: '#64748B',
    fontSize: 13,
  },
  searchInput: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  list: {
    gap: Spacing.three,
  },
  itemCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#223049',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  itemTitleWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  itemSubtle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
    marginTop: Spacing.one,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: '#64748B',
    fontSize: 12,
  },
  subtleText: {
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
