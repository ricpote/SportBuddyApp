import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { BadgeIcon } from '@/components/badge-icon';
import { AvatarCircle } from '@/components/avatar-circle';
import { SportIcon } from '@/utils/sport-icon';
import { BottomTabInset, Spacing, TopTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { getBadgeCatalog, getUserBadges } from '@/services/badges';
import { acceptFriendRequest, cancelFriendRequest, rejectFriendRequest, removeFriend, sendFriendRequest } from '@/services/friends';
import { listSports } from '@/services/sports';
import { getUserProfile, getMutualFriends, followUser, unfollowUser, uploadMyAvatar } from '@/services/users';
import { getUserActivities, listActivities } from '@/services/activities';
import { openConversation } from '@/services/conversations';
import { Badge, UserBadge } from '@/types/badge';
import { Activity } from '@/types/activity';
import { PublicUser } from '@/types/user';
import { relativeDate } from '@/utils/date';
import { compressImageDataUrl } from '@/utils/image';

type FriendStatus = 'none' | 'sending' | 'sent' | 'received' | 'friends';

const STATUS_COLOR: Record<Activity['status'], string> = {
  open: '#9ccd6b', full: '#e8823f', cancelled: '#eb8f84', completed: '#8f8b85',
};
const STATUS_LABEL: Record<Activity['status'], string> = {
  open: 'Aberta', full: 'Quase cheia', cancelled: 'Cancelada', completed: 'Terminada',
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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [profile, setProfile] = useState<PublicUser | null | undefined>(undefined);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendError, setFriendError] = useState<string | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[] | null>(null);
  const [catalog, setCatalog] = useState<Badge[] | null>(null);
  const [sports, setSports] = useState<{ id: string; name: string }[] | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[] | null>(null);
  const [pastActivities, setPastActivities] = useState<Activity[] | null>(null);
  const [mutualFriends, setMutualFriends] = useState<{ id: string; name: string; avatarUrl?: string }[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getUserProfile(id)
      .then(p => {
        setProfile(p);
        if (p.isFriend) setFriendStatus('friends');
        else if (p.hasSentRequest) setFriendStatus('sent');
        else if (p.incomingRequestId) { setFriendStatus('received'); setIncomingRequestId(p.incomingRequestId); }
        setIsFollowing(!!p.isFollowing);
        setFollowersCount(p.followersCount ?? 0);
        if (p.role === 'partner') {
          listActivities({ createdBy: id }).then(setUpcomingActivities).catch((err) => {
            console.error('Error loading upcoming activities for organization profile:', err);
            setUpcomingActivities([]);
          });
          listActivities({ createdBy: id, status: 'completed' }).then(setPastActivities).catch((err) => {
            console.error('Error loading past activities for organization profile:', err);
            setPastActivities([]);
          });
        }
      })
      .catch(() => setProfile(null));
    getUserBadges(id).then(setEarnedBadges).catch(() => setEarnedBadges(null));
    getBadgeCatalog().then(setCatalog).catch(() => setCatalog(null));
    listSports().then(setSports).catch(() => setSports(null));
    getUserActivities(id).then(setActivities).catch(() => setActivities([]));
    getMutualFriends(id).then(setMutualFriends).catch(() => setMutualFriends([]));
  }, [id, me?.uid]);

  // Recarrega sempre que o ecrã volta a ganhar foco (ex: depois de editar o
  // perfil ou fazer upload do logo noutro ecrã), não só na primeira montagem.
  useFocusEffect(load);

  const sportMap = (sports ?? []).reduce<Record<string, string>>(
    (m, s) => { m[s.id] = s.name; return m; }, {}
  );

  const earnedWithIcon = (earnedBadges ?? []).map(eb => {
    const catalogEntry = (catalog ?? []).find(c => c.id === eb.id);
    return { ...eb, icon: catalogEntry?.icon ?? eb.icon };
  });

  const earnedByFamily = new Map<string, typeof earnedWithIcon[number]>();
  for (const badge of earnedWithIcon) {
    const key = badge.criteriaType === 'activitiesJoinedBySport'
      ? `sport_${badge.sportId}` : badge.criteriaType;
    const existing = earnedByFamily.get(key);
    if (!existing || badge.threshold > existing.threshold) earnedByFamily.set(key, badge);
  }

  const displayedEarned = Array.from(earnedByFamily.values())
    .sort((a, b) => b.threshold - a.threshold)
    .slice(0, 4);

  async function handleAddFriend() {
    if (!id || friendStatus !== 'none') return;
    setFriendStatus('sending');
    setFriendError(null);
    try {
      await sendFriendRequest(id);
      setFriendStatus('sent');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao enviar pedido';
      if (message === 'Já são amigos') setFriendStatus('friends');
      else if (message === 'Já enviaste um pedido a este utilizador') setFriendStatus('sent');
      else { setFriendStatus('none'); setFriendError(message); }
    }
  }

  async function handleAcceptRequest() {
    if (!incomingRequestId) return;
    try {
      await acceptFriendRequest(incomingRequestId);
      setFriendStatus('friends');
      setIncomingRequestId(null);
    } catch {}
  }

  async function handleRejectRequest() {
    if (!incomingRequestId) return;
    try {
      await rejectFriendRequest(incomingRequestId);
      setFriendStatus('none');
      setIncomingRequestId(null);
    } catch {}
  }

  async function handleCancelRequest() {
    if (!id) return;
    try {
      await cancelFriendRequest(id);
      setFriendStatus('none');
    } catch {}
  }

  async function handleRemoveFriend() {
    if (!id) return;
    try {
      await removeFriend(id);
      setFriendStatus('none');
    } catch {}
  }

  async function handleToggleFollow() {
    if (!id || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(id);
        setIsFollowing(false);
        setFollowersCount(c => Math.max(0, c - 1));
      } else {
        await followUser(id);
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      }
    } catch {
    } finally {
      setFollowBusy(false);
    }
  }

  async function handlePickLogo() {
    if (!id || uploadingLogo) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setUploadingLogo(true);
        const mime = result.assets[0].mimeType ?? 'image/jpeg';
        const raw = `data:${mime};base64,${result.assets[0].base64}`;
        await uploadMyAvatar(await compressImageDataUrl(raw));
        const updated = await getUserProfile(id);
        setProfile(updated);
        // O logo também aparece no rodapé da sidebar, que lê o profile do
        // auth-context — sem isto ficava desatualizado até ao próximo refresh.
        await refreshProfile();
      }
    } catch {
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleMessage() {
    if (!id || openingChat) return;
    setOpeningChat(true);
    try {
      const { conversationId } = await openConversation(id);
      router.push({ pathname: '/direct-chat/[id]', params: { id: conversationId } });
    } catch {
    } finally {
      setOpeningChat(false);
    }
  }

  if (profile === undefined) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" style={{ color: '#8f8b85' }}>A carregar...</ThemedText>
      </View>
    );
  }

  if (profile === null) {
    return (
      <View style={styles.centered}>
        <ThemedText type="small" style={{ color: '#8f8b85' }}>Utilizador não encontrado.</ThemedText>
      </View>
    );
  }

  const isMe = me?.uid === id;
  const isOrg = profile.role === 'partner';
  const memberSinceStr = memberSince(profile.createdAt);
  const locationStr = locName(profile.location);

  function renderEventCard(activity: Activity) {
    const sportName = sportMap[activity.sportId];
    const loc = (activity as any).location?.name as string | undefined;
    const color = STATUS_COLOR[activity.status];
    const fill = activity.participantsList.length / activity.maxParticipants;
    return (
      <Pressable
        key={activity.id}
        style={({ pressed }) => [styles.eventCard, isWide && styles.eventCardWide, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}>
        <View style={styles.eventCardTop}>
          <View style={styles.eventSportTag}>
            <SportIcon sportName={sportName} size={12} color="#e8823f" />
            <ThemedText style={styles.eventSportTagText}>{sportName}</ThemedText>
          </View>
          <View style={[styles.statusChip, { backgroundColor: `${color}20` }]}>
            <ThemedText style={[styles.statusText, { color }]}>{STATUS_LABEL[activity.status]}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.eventCardTitle} numberOfLines={1}>{activity.title}</ThemedText>
        <View style={styles.metaRowSmall}>
          <Ionicons name="calendar-outline" size={12} color="#8f8b85" />
          <ThemedText style={styles.eventMetaText}>{relativeDate(activity.date)}</ThemedText>
          {loc ? (
            <>
              <ThemedText style={styles.metaDotSmall}>·</ThemedText>
              <Ionicons name="location-outline" size={12} color="#8f8b85" />
              <ThemedText style={styles.eventMetaText} numberOfLines={1}>{loc}</ThemedText>
            </>
          ) : null}
        </View>
        <ThemedText style={styles.eventInscritos}>
          {activity.participantsList.length} / {activity.maxParticipants} inscritos
        </ThemedText>
        <View style={styles.progressTrackSmall}>
          <View style={[styles.progressFillSmall, { width: `${Math.min(fill * 100, 100)}%` as any }]} />
        </View>
      </Pressable>
    );
  }

  function renderHistoryRow(activity: Activity) {
    const sportName = sportMap[activity.sportId];
    const loc = (activity as any).location?.name as string | undefined;
    return (
      <Pressable
        key={activity.id}
        style={({ pressed }) => [styles.actItem, pressed && styles.pressed]}
        onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}>
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
        <View style={styles.historyRatingBadge}>
          <Ionicons name="star" size={13} color="#e8823f" />
          <ThemedText style={styles.historyRatingText}>
            {activity.ratingCount > 0 ? activity.ratingAverage.toFixed(1) : '—'}
          </ThemedText>
          {activity.ratingCount > 0 && (
            <ThemedText style={styles.historyRatingCount}>({activity.ratingCount})</ThemedText>
          )}
        </View>
      </Pressable>
    );
  }

  if (isOrg) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + TopTabInset + Spacing.two,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
          },
        ]}>
        <View style={styles.center}>
          <View style={styles.orgWrap}>

            <View style={styles.orgCard}>
              <View style={[styles.orgTopRow, !isWide && styles.orgTopRowNarrow]}>
                {isMe ? (
                  <Pressable onPress={handlePickLogo} disabled={uploadingLogo} style={styles.orgLogoWrap}>
                    <AvatarCircle square name={profile.name} avatarUrl={profile.avatarUrl} size={72} />
                    <View style={styles.orgLogoCameraBtn}>
                      <Ionicons name="camera" size={12} color="#f4f2ef" />
                    </View>
                  </Pressable>
                ) : (
                  <AvatarCircle square name={profile.name} avatarUrl={profile.avatarUrl} size={72} />
                )}

                <View style={styles.orgInfo}>
                  <View style={[styles.nameRow, !isWide && { justifyContent: 'center' }]}>
                    <ThemedText style={styles.orgName} numberOfLines={1}>{profile.name}</ThemedText>
                    <Ionicons name="checkmark-circle" size={18} color="#e8823f" />
                  </View>
                  {(locationStr || profile.website || profile.bio) && (
                    <View style={[styles.metaLineRow, !isWide && { justifyContent: 'center' }]}>
                      {locationStr ? (
                        <ThemedText type="small" style={styles.orgMetaText}>{locationStr}</ThemedText>
                      ) : null}
                      {locationStr && (profile.website || profile.bio) ? (
                        <ThemedText type="small" style={styles.orgMetaText}> · </ThemedText>
                      ) : null}
                      {profile.website ? (
                        <ThemedText type="small" style={styles.orgWebsiteText}>{profile.website}</ThemedText>
                      ) : null}
                      {profile.website && profile.bio ? (
                        <ThemedText type="small" style={styles.orgBioDot}> · </ThemedText>
                      ) : null}
                      {profile.bio ? (
                        <ThemedText type="small" style={styles.orgMetaText}>{profile.bio}</ThemedText>
                      ) : null}
                    </View>
                  )}
                  {uploadingLogo ? (
                    <ThemedText type="small" style={styles.metaText}>A guardar logo...</ThemedText>
                  ) : null}
                </View>

                {isMe && (
                  <Pressable
                    onPress={() => router.push('/edit-profile')}
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnNeutral, styles.editProfileBtn, pressed && styles.pressed]}>
                    <Ionicons name="create-outline" size={16} color="#c9c5bf" />
                    <ThemedText type="smallBold" style={{ color: '#c9c5bf' }}>Editar perfil</ThemedText>
                  </Pressable>
                )}

                {!isMe && (
                  <View style={[styles.orgActions, !isWide && { width: '100%' }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.followBtn,
                        !isWide && { flex: 1 },
                        isFollowing ? styles.actionBtnNeutral : styles.actionBtnOrange,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleToggleFollow}
                      disabled={followBusy}>
                      <Ionicons
                        name={isFollowing ? 'checkmark' : 'add'}
                        size={16}
                        color={isFollowing ? '#c9c5bf' : '#0a0a0b'}
                      />
                      <ThemedText type="smallBold" style={{ color: isFollowing ? '#c9c5bf' : '#0a0a0b' }}>
                        {isFollowing ? 'A seguir' : 'Seguir'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, styles.actionBtnNeutral, { width: 44 }, pressed && styles.pressed]}
                      onPress={handleMessage}
                      disabled={openingChat}>
                      <Ionicons name="chatbubble-outline" size={16} color="#c9c5bf" />
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.orgStatsRow}>
                {[
                  { label: 'SEGUIDORES', value: followersCount },
                  { label: 'EVENTOS', value: profile.stats.activitiesCreated },
                  { label: 'AVALIAÇÃO', value: profile.rating.count > 0 ? profile.rating.average.toFixed(1) : '—' },
                ].map(({ label, value }, i) => {
                  const isOwner = me?.uid === id;
                  const isFollowersBox = label === 'SEGUIDORES';
                  const inner = (
                    <>
                      <ThemedText style={styles.orgStatValue}>{value}</ThemedText>
                      <ThemedText style={styles.orgStatLabel}>{label}</ThemedText>
                    </>
                  );
                  if (isFollowersBox && isOwner) {
                    return (
                      <Pressable
                        key={label}
                        style={({ pressed }) => [styles.orgStatBox, i > 0 && styles.orgStatBoxDivider, pressed && styles.pressed]}
                        onPress={() => router.push({ pathname: '/followers/[id]', params: { id } })}>
                        {inner}
                      </Pressable>
                    );
                  }
                  return (
                    <View key={label} style={[styles.orgStatBox, i > 0 && styles.orgStatBoxDivider]}>
                      {inner}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Próximos eventos</ThemedText>
              {upcomingActivities !== null && upcomingActivities.length > 4 && (
                <Pressable onPress={() => router.push({ pathname: '/explore', params: { organizerId: id } })}>
                  <ThemedText type="small" style={{ color: '#e8823f' }}>
                    Ver todos · {upcomingActivities.length}
                  </ThemedText>
                </Pressable>
              )}
            </View>
            {upcomingActivities === null && (
              <ThemedText type="small" style={styles.emptyText}>A carregar...</ThemedText>
            )}
            {upcomingActivities !== null && upcomingActivities.length === 0 && (
              <ThemedText type="small" style={styles.emptyText}>Sem eventos agendados.</ThemedText>
            )}
            {upcomingActivities !== null && upcomingActivities.length > 0 && (
              <View style={styles.eventsGrid}>
                {upcomingActivities.slice(0, 4).map(renderEventCard)}
              </View>
            )}

            <ThemedText type="subtitle" style={styles.sectionTitle}>Histórico</ThemedText>
            {pastActivities === null && (
              <ThemedText type="small" style={styles.emptyText}>A carregar...</ThemedText>
            )}
            {pastActivities !== null && pastActivities.length === 0 && (
              <ThemedText type="small" style={styles.emptyText}>Ainda sem atividades terminadas.</ThemedText>
            )}
            {pastActivities !== null && pastActivities.length > 0 && (
              <View style={styles.actList}>
                {pastActivities.map(renderHistoryRow)}
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + TopTabInset + Spacing.two,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
        },
      ]}>
      <View style={styles.center}>
        <View style={[styles.columns, isWide && styles.columnsWide]}>

          {/* ── LEFT COLUMN ── */}
          <View style={[styles.leftCol, isWide && styles.leftColWide]}>

            <View style={styles.avatarWrap}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#8f8b85" />
                </View>
              )}
            </View>

            <View style={styles.nameBlock}>
              <ThemedText style={styles.name} numberOfLines={1}>{profile.name}</ThemedText>
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

            {!isMe && (
              <View style={{ gap: Spacing.two }}>
                {friendStatus === 'friends' ? (
                  <View style={[styles.actionBtn, styles.actionBtnNeutral, { justifyContent: 'space-between', paddingHorizontal: Spacing.three }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#8f8b85" />
                      <ThemedText type="smallBold" style={{ color: '#c9c5bf' }}>Amigos</ThemedText>
                    </View>
                    <Pressable onPress={handleRemoveFriend} hitSlop={8}>
                      <Ionicons name="person-remove-outline" size={16} color="#8f8b85" />
                    </Pressable>
                  </View>
                ) : friendStatus === 'received' ? (
                  <View style={{ gap: Spacing.two }}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, styles.actionBtnOrange, pressed && styles.pressed]}
                      onPress={handleAcceptRequest}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#0a0a0b" />
                      <ThemedText type="smallBold" style={{ color: '#0a0a0b' }}>Aceitar pedido</ThemedText>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, styles.actionBtnNeutral, pressed && styles.pressed]}
                      onPress={handleRejectRequest}>
                      <ThemedText type="smallBold" style={{ color: '#c9c5bf' }}>Rejeitar</ThemedText>
                    </Pressable>
                  </View>
                ) : friendStatus === 'sent' ? (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnNeutral, pressed && styles.pressed]}
                    onPress={handleCancelRequest}>
                    <Ionicons name="hourglass-outline" size={16} color="#8f8b85" />
                    <ThemedText type="smallBold" style={{ color: '#c9c5bf' }}>Pedido enviado · Cancelar</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnOrange, pressed && styles.pressed]}
                    onPress={handleAddFriend}
                    disabled={friendStatus === 'sending'}>
                    <Ionicons name="person-add-outline" size={16} color="#0a0a0b" />
                    <ThemedText type="smallBold" style={{ color: '#0a0a0b' }}>
                      {friendStatus === 'sending' ? 'A enviar...' : 'Adicionar amigo'}
                    </ThemedText>
                  </Pressable>
                )}

                {friendStatus === 'friends' && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnOrange, pressed && styles.pressed]}
                    onPress={handleMessage}
                    disabled={openingChat}>
                    <Ionicons name="chatbubble-outline" size={16} color="#0a0a0b" />
                    <ThemedText type="smallBold" style={{ color: '#0a0a0b' }}>Mensagem</ThemedText>
                  </Pressable>
                )}

                {friendError ? (
                  <ThemedText type="small" style={{ color: '#eb8f84', textAlign: 'center' }}>{friendError}</ThemedText>
                ) : null}
              </View>
            )}

            {profile.sports && profile.sports.length > 0 && (
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
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.statsList}>
              {[
                { label: 'Participadas', value: profile.stats.activitiesJoined },
                { label: 'Organizadas',  value: profile.stats.activitiesCreated },
                { label: 'MVP',          value: profile.stats.mvpVotesReceived },
                { label: 'Amigos',       value: profile.friendCount ?? 0 },
              ].map(({ label, value }) => (
                <View key={label} style={styles.statRow}>
                  <ThemedText type="small" style={styles.statLabel}>{label}</ThemedText>
                  <ThemedText type="smallBold" style={styles.statValue}>{value}</ThemedText>
                </View>
              ))}
            </View>

            {mutualFriends.length > 0 && (
              <>
                <View style={styles.divider} />
                <ThemedText type="small" style={styles.mutualLabel}>
                  {mutualFriends.length === 1
                    ? '1 amigo em comum'
                    : `${mutualFriends.length} amigos em comum`}
                </ThemedText>
                <View style={styles.mutualAvatars}>
                  {mutualFriends.map(f => (
                    <View key={f.id} style={styles.mutualAvatar}>
                      {f.avatarUrl
                        ? <Image source={{ uri: f.avatarUrl }} style={styles.mutualAvatarImg} />
                        : <ThemedText style={styles.mutualAvatarText}>
                            {f.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </ThemedText>
                      }
                    </View>
                  ))}
                </View>
              </>
            )}

          </View>

          {/* ── RIGHT COLUMN ── */}
          <View style={[styles.rightCol, isWide && styles.rightColWide]}>

            <ThemedText type="subtitle" style={styles.sectionTitle}>Badges</ThemedText>
            {displayedEarned.length > 0 ? (
              <View style={styles.badgeGrid}>
                {displayedEarned.map(badge => (
                  <View key={badge.id} style={styles.badgeCell}>
                    <BadgeIcon badgeId={badge.id} icon={badge.icon} size={100} />
                    <ThemedText style={styles.badgeName} numberOfLines={2}>{badge.name}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText type="small" style={styles.emptyText}>Sem badges.</ThemedText>
            )}

            <ThemedText type="subtitle" style={styles.sectionTitle}>Atividade recente</ThemedText>
            {activities === null && (
              <ThemedText type="small" style={styles.emptyText}>A carregar...</ThemedText>
            )}
            {activities !== null && activities.length === 0 && (
              <ThemedText type="small" style={styles.emptyText}>Sem atividades.</ThemedText>
            )}
            {activities !== null && activities.length > 0 && (
              <View style={styles.actList}>
                {activities.map(activity => {
                  const sportName = sportMap[activity.sportId];
                  const loc = (activity as any).location?.name as string | undefined;
                  const color = STATUS_COLOR[activity.status];
                  return (
                    <Pressable
                      key={activity.id}
                      style={({ pressed }) => [styles.actItem, pressed && styles.pressed]}
                      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: activity.id } })}>
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
                    </Pressable>
                  );
                })}
              </View>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  columns: { gap: Spacing.four },
  columnsWide: { flexDirection: 'row' },
  leftCol: { gap: Spacing.four },
  leftColWide: { width: 220 },
  rightCol: { gap: Spacing.three },
  rightColWide: { flex: 1, minWidth: 0 },

  avatarWrap: { alignSelf: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#141315',
    alignItems: 'center', justifyContent: 'center',
  },

  nameBlock: { alignItems: 'center', gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: '#f4f2ef', fontSize: 24, fontFamily: 'HankenGrotesk_700Bold', textAlign: 'center' },
  metaText: { color: '#8f8b85' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 42, borderRadius: 12,
  },
  actionBtnOrange: { backgroundColor: '#e8823f' },
  actionBtnNeutral: { backgroundColor: '#141315', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  editProfileBtn: { paddingHorizontal: Spacing.three, flexShrink: 0, alignSelf: 'flex-start' },
  followBtn: { paddingHorizontal: Spacing.three, flexShrink: 0, justifyContent: 'flex-start' },

  sportChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#141315', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sportChipText: { color: '#c9c5bf', fontSize: 12 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  statsList: { gap: Spacing.two },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: '#8f8b85' },
  statValue: { color: '#f4f2ef', fontSize: 20, fontFamily: 'HankenGrotesk_700Bold' },

  sectionTitle: { color: '#f4f2ef', fontSize: 20, fontFamily: 'HankenGrotesk_700Bold' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyText: { color: '#8f8b85', textAlign: 'center', paddingVertical: Spacing.two },

  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badgeCell: { width: 100, alignItems: 'center', paddingBottom: 4 },
  badgeName: { color: '#c9c5bf', textAlign: 'center', marginTop: -8, fontSize: 12, width: 100 },

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

  historyRatingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(232,130,63,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  historyRatingText: { color: '#e8823f', fontSize: 12, fontFamily: 'HankenGrotesk_700Bold' },
  historyRatingCount: { color: '#e8823f', fontSize: 11, opacity: 0.8 },

  mutualCard: {
    backgroundColor: '#111012',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  mutualLabel: { color: '#8f8b85' },
  mutualAvatars: { flexDirection: 'row', gap: 6 },
  mutualAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#e8823f',
    alignItems: 'center', justifyContent: 'center',
  },
  mutualAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  mutualAvatarText: { color: '#0a0a0b', fontSize: 11, fontFamily: 'HankenGrotesk_700Bold' },

  pressed: { opacity: 0.7 },

  // ── Perfil de empresa ──
  orgWrap: { gap: Spacing.four },
  orgCard: {
    gap: Spacing.four,
  },
  orgTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  orgTopRowNarrow: { flexDirection: 'column', alignItems: 'center' },
  orgLogoWrap: { position: 'relative' },
  orgLogoCameraBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e8823f',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0a0a0b',
  },
  orgInfo: { flex: 1, minWidth: 0, gap: 2 },
  orgName: { color: '#f4f2ef', fontSize: 28, lineHeight: 36, fontFamily: 'HankenGrotesk_700Bold' },
  metaLineRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  orgMetaText: { color: '#8f8b85', fontSize: 13 },
  orgWebsiteText: { color: '#e8823f', fontSize: 13 },
  orgBioDot: { color: '#8f8b85', fontSize: 22 },
  orgActions: { flexDirection: 'row', gap: Spacing.two, flexShrink: 0 },

  orgStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#141315',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  orgStatBox: {
    flex: 1, alignItems: 'center', gap: 2,
    paddingVertical: Spacing.three,
  },
  orgStatBoxDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
  orgStatValue: { color: '#e8823f', fontSize: 26, fontFamily: 'HankenGrotesk_700Bold' },
  orgStatLabel: { color: '#8f8b85', fontSize: 10, letterSpacing: 0.6, fontWeight: '700' },

  eventsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  eventCard: {
    width: '100%',
    backgroundColor: '#111012', borderRadius: 16, padding: Spacing.three, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  eventCardWide: { width: '48.5%' },
  eventCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventSportTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventSportTagText: { color: '#e8823f', fontSize: 11, fontWeight: '700' },
  eventCardTitle: { color: '#f4f2ef', fontSize: 15, fontFamily: 'HankenGrotesk_700Bold' },

  metaRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { color: '#8f8b85', fontSize: 12, flexShrink: 1 },
  metaDotSmall: { color: '#4a4845', fontSize: 12 },

  eventInscritos: { color: '#8f8b85', fontSize: 12 },
  progressTrackSmall: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFillSmall: { height: '100%', borderRadius: 2, backgroundColor: '#e8823f' },
});
