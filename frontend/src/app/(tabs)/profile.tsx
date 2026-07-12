import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { BadgeIcon } from '@/components/badge-icon';
import { SportIcon } from '@/utils/sport-icon';
import { BottomTabInset, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { usePendingWaitlist } from '@/contexts/pending-waitlist-context';
import { getMyActivities } from '@/services/activities';
import { getBadgeCatalog, getMyBadges, setDisplayedBadge } from '@/services/badges';
import { getFriends } from '@/services/friends';
import { listSports } from '@/services/sports';
import { uploadMyAvatar } from '@/services/users';
import { Badge, UserBadge } from '@/types/badge';
import { Activity } from '@/types/activity';
import { UserStats } from '@/types/user';
import { relativeDate } from '@/utils/date';

const STATUS_COLOR: Record<Activity['status'], string> = {
  open: '#9ccd6b',
  full: '#e8823f',
  cancelled: '#eb8f84',
  completed: '#8f8b85',
};

const STATUS_LABEL: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

function memberSince(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  const m = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()];
  return `${m} ${d.getFullYear()}`;
}

function locName(loc?: string | { name?: string }): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc || null;
  return loc.name ?? null;
}

function badgeProgress(b: Badge, stats: UserStats): number {
  if (b.criteriaType === 'activitiesJoined') return stats.activitiesJoined;
  if (b.criteriaType === 'mvpVotesReceived') return stats.mvpVotesReceived;
  return 0;
}

async function compressImageDataUrl(dataUrl: string): Promise<string> {
  if (Platform.OS !== 'web') return dataUrl;
  return new Promise((resolve, reject) => {
    const image = new (window as any).Image();
    image.onload = () => {
      const maxSize = 192;
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const w = Math.max(1, Math.round(image.width * scale));
      const h = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas error')); return; }
      ctx.drawImage(image, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    image.onerror = () => reject(new Error('load error'));
    image.src = dataUrl;
  });
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { pendingCount, refresh: refreshBadge } = usePendingWaitlist();
  const isWide = width >= 700;

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'past'>('all');
  const [activityLimit, setActivityLimit] = useState(5);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[] | null>(null);
  const [catalog, setCatalog] = useState<Badge[] | null>(null);
  const [sports, setSports] = useState<{ id: string; name: string }[] | null>(null);
  const [updatingBadgeId, setUpdatingBadgeId] = useState<string | null>(null);

  const load = useCallback(() => {
    getMyActivities().then(setActivities).catch(() => setActivities(null));
    getFriends().then(list => setFriendCount(list.length)).catch(() => {});
    getMyBadges().then(setEarnedBadges).catch(() => setEarnedBadges(null));
    getBadgeCatalog().then(setCatalog).catch(() => setCatalog(null));
    listSports().then(setSports).catch(() => setSports(null));
    refreshBadge();
  }, [refreshBadge]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sportMap = (sports ?? []).reduce<Record<string, string>>(
    (m, s) => { m[s.id] = s.name; return m; }, {}
  );

  const earnedIds = new Set((earnedBadges ?? []).map(b => b.id));

  const filteredActivities = (activities ?? []).filter(a => {
    if (activityFilter === 'active') return a.status === 'open' || a.status === 'full';
    if (activityFilter === 'past') return a.status === 'completed' || a.status === 'cancelled';
    return true;
  });
  const visibleActivities = filteredActivities.slice(0, activityLimit);

  const earnedWithCurrentIcon = (earnedBadges ?? []).map(eb => {
    const catalogEntry = (catalog ?? []).find(c => c.id === eb.id);
    return { ...eb, icon: catalogEntry?.icon ?? eb.icon };
  });

  const earnedByFamily = new Map<string, typeof earnedWithCurrentIcon[number]>();
  for (const badge of earnedWithCurrentIcon) {
    const key = badge.criteriaType === 'activitiesJoinedBySport'
      ? `sport_${badge.sportId}`
      : badge.criteriaType;
    const existing = earnedByFamily.get(key);
    if (!existing || badge.threshold > existing.threshold) {
      earnedByFamily.set(key, badge);
    }
  }

  const displayedEarned = Array.from(earnedByFamily.values())
    .sort((a, b) => b.threshold - a.threshold)
    .slice(0, 4);

  const lockedWithProgress = (catalog ?? [])
    .filter(b => !earnedIds.has(b.id) && b.criteriaType !== 'activitiesJoinedBySport')
    .map(b => {
      const current = profile ? badgeProgress(b, profile.stats) : 0;
      return { ...b, current, pct: current / b.threshold };
    });
  const nextBadge = [...lockedWithProgress]
    .sort((a, b) => b.pct - a.pct)
    .find(b => b.pct > 0 && b.pct < 1);

  const memberSinceStr = memberSince(profile?.createdAt);
  const locationStr = locName(profile?.location);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setUploadingAvatar(true);
        const mime = result.assets[0].mimeType ?? 'image/jpeg';
        const raw = `data:${mime};base64,${result.assets[0].base64}`;
        await uploadMyAvatar(await compressImageDataUrl(raw));
        await refreshProfile();
      }
    } catch {
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBadgeTap = async (badge: UserBadge) => {
    if (updatingBadgeId) return;
    setUpdatingBadgeId(badge.id);
    try {
      await setDisplayedBadge(badge.isDisplayed ? null : badge.id);
      await getMyBadges().then(setEarnedBadges);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o badge.');
    } finally {
      setUpdatingBadgeId(null);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + TopTabInset + Spacing.four,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
        },
      ]}>
      <View style={styles.center}>
        <View style={[styles.columns, isWide && styles.columnsWide]}>

          {/* ── LEFT COLUMN ──────────────────────────────── */}
          <View style={[styles.leftCol, isWide && styles.leftColWide]}>

            <Pressable onPress={handlePickImage} style={styles.avatarWrap} disabled={uploadingAvatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#8f8b85" />
                </View>
              )}
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={13} color="#f4f2ef" />
              </View>
            </Pressable>

            <View style={styles.nameBlock}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {profile?.name ?? user?.displayName ?? '—'}
              </ThemedText>
              {(profile?.email ?? user?.email) ? (
                <ThemedText type="small" style={styles.metaText}>{profile?.email ?? user?.email}</ThemedText>
              ) : null}
              {memberSinceStr ? (
                <ThemedText type="small" style={styles.metaText}>Membro desde {memberSinceStr}</ThemedText>
              ) : null}
            </View>

            {locationStr ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#8f8b85" />
                <ThemedText type="small" style={styles.metaText}>{locationStr}</ThemedText>
              </View>
            ) : null}

            {uploadingAvatar ? (
              <ThemedText type="small" style={styles.uploadingText}>A guardar...</ThemedText>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
              onPress={() => router.push('/edit-profile')}>
              <ThemedText type="smallBold" style={styles.editBtnText}>Editar perfil</ThemedText>
            </Pressable>

            {pendingCount > 0 && (
              <View style={styles.pendingCard}>
                <ThemedText type="small" style={styles.pendingText}>
                  {pendingCount === 1
                    ? '1 atividade com pedidos na lista de espera'
                    : `${pendingCount} atividades com pedidos`}
                </ThemedText>
              </View>
            )}

            {profile?.sports && profile.sports.length > 0 && (
              <View style={styles.sportChips}>
                {profile.sports.slice(0, 5).map(sid => {
                  const sName = sportMap[sid] ?? sid;
                  return (
                    <View key={sid} style={styles.sportChip}>
                      <SportIcon sportName={sName} size={12} color="#e8823f" />
                      <ThemedText type="small" style={styles.sportChipText}>{sName}</ThemedText>
                    </View>
                  );
                })}
                <Link href="/edit-profile" asChild>
                  <Pressable style={styles.addSportChip}>
                    <Ionicons name="add" size={14} color="#8f8b85" />
                  </Pressable>
                </Link>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.statsList}>
              {[
                { label: 'Participadas', value: profile?.stats.activitiesJoined ?? 0, accent: false },
                { label: 'Organizadas',  value: profile?.stats.activitiesCreated ?? 0, accent: false },
                { label: 'MVP',          value: profile?.stats.mvpVotesReceived ?? 0,  accent: false },
                { label: 'Amigos',       value: friendCount,                            accent: false },
              ].map(({ label, value, accent }) => (
                <View key={label} style={styles.statRow}>
                  <ThemedText type="small" style={styles.statLabel}>{label}</ThemedText>
                  <ThemedText type="smallBold" style={[styles.statValue, accent && styles.statAccent]}>
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>

            {nextBadge ? (
              <>
                <View style={styles.divider} />
                <View style={styles.nextBadgeBox}>
                  <View style={styles.nextBadgeRow}>
                    <ThemedText type="small" style={styles.nextBadgeLabel}>Próxima: </ThemedText>
                    <ThemedText type="smallBold" style={styles.nextBadgeName} numberOfLines={1}>
                      {nextBadge.name}
                    </ThemedText>
                    <ThemedText type="small" style={styles.nextBadgeCount}>
                      {' '}{nextBadge.current}/{nextBadge.threshold}
                    </ThemedText>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(nextBadge.pct * 100, 100)}%` as any },
                      ]}
                    />
                  </View>
                </View>
              </>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
              onPress={signOut}>
              <Ionicons name="log-out-outline" size={16} color="#eb8f84" />
              <ThemedText type="smallBold" style={styles.logoutText}>Terminar sessão</ThemedText>
            </Pressable>
          </View>

          {/* ── RIGHT COLUMN ─────────────────────────────── */}
          <View style={[styles.rightCol, isWide && styles.rightColWide]}>

            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Badges</ThemedText>
              <Pressable
                style={({ pressed }) => [styles.verTodasBtn, pressed && styles.pressed]}
                onPress={() => router.push('/badges')}>
                <ThemedText type="small" style={styles.verTodasText}>Ver todas ›</ThemedText>
              </Pressable>
            </View>

            {displayedEarned.length > 0 ? (
              <View style={styles.badgeGrid}>
                {displayedEarned.map(badge => (
                  <Pressable
                    key={badge.id}
                    style={({ pressed }) => [styles.badgeCell, pressed && styles.pressed]}
                    onPress={() => handleBadgeTap(badge)}>
                    <BadgeIcon badgeId={badge.id} icon={badge.icon} size={100} />
                    <ThemedText style={styles.badgeName} numberOfLines={2}>{badge.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : (
              <ThemedText type="small" style={styles.emptyText}>Ainda sem badges.</ThemedText>
            )}

            <View style={styles.historicHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Histórico</ThemedText>
              <View style={styles.filterRow}>
                {(['all', 'active', 'past'] as const).map(f => (
                  <Pressable key={f} onPress={() => { setActivityFilter(f); setActivityLimit(5); }}>
                    <View style={[styles.filterChip, activityFilter === f && styles.filterChipOn]}>
                      <ThemedText
                        type="small"
                        style={[styles.filterText, activityFilter === f && styles.filterTextOn]}>
                        {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Passadas'}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {activities === null && (
              <ThemedText type="small" style={styles.emptyText}>A carregar...</ThemedText>
            )}
            {activities !== null && filteredActivities.length === 0 && (
              <ThemedText type="small" style={styles.emptyText}>Sem atividades.</ThemedText>
            )}

            <View style={styles.actList}>
              {visibleActivities.map(activity => {

                const sportName = sportMap[activity.sportId];
                const loc = (activity as any).location?.name as string | undefined;
                const color = STATUS_COLOR[activity.status];
                return (
                  <Link
                    key={activity.id}
                    href={{ pathname: '/activity/[id]', params: { id: activity.id } }}
                    asChild>
                    <Pressable style={({ pressed }) => pressed && styles.pressed}>
                      <View style={styles.actItem}>
                        <View style={styles.sportCircle}>
                          <SportIcon sportName={sportName} size={20} color="#f4f2ef" />
                        </View>
                        <View style={styles.actInfo}>
                          <ThemedText type="smallBold" style={styles.actTitle} numberOfLines={1}>
                            {activity.title}
                          </ThemedText>
                          <ThemedText type="small" style={styles.actMeta}>
                            {relativeDate(activity.date)}{loc ? ` · ${loc}` : ''}
                          </ThemedText>
                        </View>
                        <View style={[styles.statusChip, { backgroundColor: `${color}20` }]}>
                          <ThemedText style={[styles.statusText, { color }]}>
                            {STATUS_LABEL[activity.status]}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </View>

            {activityLimit === 5 && filteredActivities.length > 5 && (
              <Pressable
                style={({ pressed }) => [styles.showAllBtn, pressed && styles.pressed]}
                onPress={() => setActivityLimit(10)}>
                <ThemedText type="small" style={styles.showAllText}>Mostrar mais</ThemedText>
              </Pressable>
            )}
            {activityLimit === 10 && (
              <Pressable
                style={({ pressed }) => [styles.showAllBtn, pressed && styles.pressed]}
                onPress={() => setActivityLimit(5)}>
                <ThemedText type="small" style={styles.showAllText}>Mostrar menos</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  center: { width: '100%', maxWidth: 900, paddingHorizontal: Spacing.four },

  columns: { gap: Spacing.four },
  columnsWide: { flexDirection: 'row' },

  leftCol: { gap: Spacing.four },
  leftColWide: { width: 220 },

  rightCol: { gap: Spacing.three },
  rightColWide: { flex: 1, minWidth: 0 },

  avatarWrap: { alignSelf: 'center', position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#141315',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e8823f',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0a0a0b',
  },

  name: {
    color: '#f4f2ef',
    fontSize: 24,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
  },
  nameBlock: { alignItems: 'center', gap: 2 },
  metaText: { color: '#8f8b85', textAlign: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  uploadingText: { color: '#8f8b85', textAlign: 'center', fontSize: 12 },

  editBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12, height: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { color: '#f4f2ef' },

  pendingCard: {
    backgroundColor: 'rgba(232,130,63,0.12)',
    borderWidth: 1, borderColor: '#e8823f',
    borderRadius: 10, padding: Spacing.two,
  },
  pendingText: { color: '#e8823f', textAlign: 'center' },

  sportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#141315',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sportChipText: { color: '#c9c5bf', fontSize: 12 },
  addSportChip: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#141315',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  statsList: { gap: Spacing.two },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: '#8f8b85' },
  statValue: { color: '#f4f2ef', fontSize: 20, fontFamily: 'HankenGrotesk_700Bold' },
  statAccent: { color: '#e8823f' },

  nextBadgeBox: { gap: 8 },
  nextBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  nextBadgeLabel: { color: '#8f8b85' },
  nextBadgeName: { color: '#f4f2ef', flexShrink: 1 },
  nextBadgeCount: { color: '#8f8b85' },
  progressTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%' as any, borderRadius: 3,
    backgroundColor: '#e8823f',
  },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(235,143,132,0.1)',
    borderWidth: 1, borderColor: '#eb8f84',
    borderRadius: 12, height: 44,
    marginTop: Spacing.one,
  },
  logoutText: { color: '#eb8f84' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#f4f2ef', fontSize: 20, fontFamily: 'HankenGrotesk_700Bold' },
  sectionSub: { color: '#8f8b85' },
  verTodasBtn: { paddingVertical: 2 },
  verTodasText: { color: '#e8823f' },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badgeCell: { width: 100, alignItems: 'center', paddingBottom: 4 },

  lockedWrap: {
    width: 72, height: 72,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeName: { color: '#c9c5bf', textAlign: 'center', marginTop: -8, fontSize: 12, width: 100 },
  badgeProgress: { color: '#8f8b85', fontSize: 11, textAlign: 'center' },

  historicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: {
    backgroundColor: '#111012', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipOn: { backgroundColor: '#e8823f', borderColor: '#e8823f' },
  filterText: { color: '#c9c5bf' },
  filterTextOn: { color: '#0a0a0b' },

  emptyText: { color: '#8f8b85', textAlign: 'center', paddingVertical: Spacing.two },
  actList: { gap: Spacing.two },
  actItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111012',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sportCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(232,130,63,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  actInfo: { flex: 1, gap: 2, minWidth: 0 },
  actTitle: { color: '#f4f2ef' },
  actMeta: { color: '#8f8b85' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'HankenGrotesk_600SemiBold' },

  showAllBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  showAllText: { color: '#e8823f' },

  pressed: { opacity: 0.7 },
});
