import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { listActivities, listNearbyActivities } from '@/services/activities';
import { listSports } from '@/services/sports';
import { Activity } from '@/types/activity';
import { Sport, SportCategory } from '@/types/sport';
import { relativeDate } from '@/utils/date';
import { SportIcon } from '@/utils/sport-icon';

const NEARBY_RADIUS_KM = 20;

const STATUS_CONFIG: Partial<Record<Activity['status'], { label: string; color: string }>> = {
  open:      { label: 'Open',  color: '#9ccd6b' },
  full:      { label: 'Full',  color: '#8f8b85' },
  completed: { label: 'Ended', color: '#8f8b85' },
};

const AVATAR_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

type ScopeFilter = 'nearby' | 'all';
type CatFilter = SportCategory | null;

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();

  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [sports, setSports] = useState<Sport[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('nearby');
  const [catFilter, setCatFilter] = useState<CatFilter>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportModalOpen, setSportModalOpen] = useState(false);

  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator?.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  const load = useCallback(async () => {
    try {
      setError(null);
      let data: Activity[];
      if (scopeFilter === 'nearby') {
        let loc = locationRef.current;
        if (!loc) {
          loc = await getUserLocation();
          if (loc) {
            locationRef.current = loc;
            setUserLocation(loc);
          }
        }
        const center = loc ?? { lat: 38.7223, lng: -9.1393 };
        data = await listNearbyActivities({ lat: center.lat, lng: center.lng, radiusKm: NEARBY_RADIUS_KM });
      } else {
        data = await listActivities();
      }
      setActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activities');
    }
  }, [scopeFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    listSports().then(setSports).catch(() => setSports([]));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const categoryBySportId = new Map(sports.map((s) => [s.id, s.category]));
  const visibleSports = catFilter ? sports.filter((s) => s.category === catFilter) : sports;

  const visibleActivities = (activities ?? []).filter((a) => {
    if (a.status === 'cancelled') return false;
    if (catFilter && categoryBySportId.get(a.sportId) !== catFilter) return false;
    if (sportFilter && a.sportId !== sportFilter) return false;
    if (searchText.trim() && !a.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const selectedSport = sports.find((s) => s.id === sportFilter);

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#e8823f" />}
      contentContainerStyle={[
        styles.content,
        { paddingTop: safeAreaInsets.top + TopTabInset + Spacing.four, paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three },
      ]}>
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.pageTitle}>Explore</ThemedText>
          <Link href="/create-activity" asChild>
            <Pressable style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="add" size={18} color="#1a1005" style={{ marginRight: 4 }} />
              <ThemedText style={styles.newBtnText}>New</ThemedText>
            </Pressable>
          </Link>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8f8b85" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activity..."
            placeholderTextColor="#8f8b85"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#8f8b85" />
            </Pressable>
          )}
        </View>

        {/* FILTER ROW */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {(['nearby', 'all'] as ScopeFilter[]).map((t) => (
              <Pressable key={t} onPress={() => setScopeFilter(t)}>
                <View style={[styles.chip, scopeFilter === t && styles.chipActive]}>
                  <ThemedText style={[styles.chipText, scopeFilter === t && styles.chipTextActive]}>
                    {t === 'nearby' ? 'Nearby' : 'All'}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
            {(['team', 'individual'] as SportCategory[]).map((cat) => (
              <Pressable key={cat} onPress={() => {
                const next = catFilter === cat ? null : cat;
                setCatFilter(next);
                if (next && sportFilter && categoryBySportId.get(sportFilter) !== next) setSportFilter(null);
              }}>
                <View style={[styles.chip, catFilter === cat && styles.chipActive]}>
                  <ThemedText style={[styles.chipText, catFilter === cat && styles.chipTextActive]}>
                    {cat === 'team' ? 'Team' : 'Individual'}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={() => setSportModalOpen(true)} style={styles.sportDropdown}>
            <Ionicons name="options-outline" size={14} color="#c9c5bf" style={{ marginRight: 5 }} />
            <ThemedText style={styles.sportDropdownText} numberOfLines={1}>
              {selectedSport ? selectedSport.name : 'All sports'}
            </ThemedText>
            <Ionicons name="chevron-down" size={12} color="#8f8b85" style={{ marginLeft: 3 }} />
          </Pressable>
        </View>

        {/* SECTION HEADER */}
        {activities !== null && !error && (
          <ThemedText style={styles.sectionLabel}>
            {visibleActivities.length} {scopeFilter === 'nearby' ? 'ACTIVITIES NEAR YOU' : 'ACTIVITIES'}
          </ThemedText>
        )}

        {/* STATES */}
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
        {activities === null && !error && <ThemedText style={styles.emptyText}>Loading activities...</ThemedText>}
        {activities !== null && visibleActivities.length === 0 && (
          <ThemedText style={styles.emptyText}>
            {activities.length === 0 ? 'No activities yet. Create the first one!' : 'No activities match your filters.'}
          </ThemedText>
        )}

        {/* CARDS */}
        <View style={styles.list}>
          {visibleActivities.map((activity) => {
            const status: { label: string; color: string } = STATUS_CONFIG[activity.status] ?? { label: activity.status, color: '#8f8b85' };
            const fill = activity.participantsList.length / activity.maxParticipants;
            const dist = userLocation
              ? formatDist(haversineKm(userLocation.lat, userLocation.lng, activity.location.lat, activity.location.lng))
              : null;
            const sportName = sports.find((s) => s.id === activity.sportId)?.name ?? '';
            const spotsLeft = activity.maxParticipants - activity.participantsList.length;
            const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0 && activity.status === 'open';
            const isPrivate = activity.requiresApproval;
            const maxAvatars = 3;
            const shown = activity.participantsList.slice(0, maxAvatars);
            const extra = activity.participantsList.length - maxAvatars;

            return (
              <Link key={activity.id} href={{ pathname: '/activity/[id]', params: { id: activity.id } }} asChild>
                <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                <View style={styles.card}>

                  {/* TOP ROW: icon + title + badges */}
                  <View style={styles.cardTop}>
                    <View style={styles.sportIconBox}>
                      <SportIcon sportName={sportName} size={22} color="#1a1005" />
                    </View>
                    <ThemedText style={styles.cardTitle} numberOfLines={1}>{activity.title}</ThemedText>
                    <View style={styles.badgeStack}>
                      {isPrivate ? (
                        <View style={[styles.statusBadge, styles.privateBadge]}>
                          <Ionicons name="lock-closed" size={10} color="#8f8b85" />
                          <ThemedText style={[styles.statusText, { color: '#8f8b85' }]}>Private</ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: `${status.color}22` }]}>
                          <ThemedText style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                          </ThemedText>
                        </View>
                      )}
                      {isAlmostFull && (
                        <View style={[styles.statusBadge, { backgroundColor: '#e8823f22' }]}>
                          <ThemedText style={[styles.statusText, { color: '#e8823f' }]}>Almost full</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* META ROW: time · location · distance */}
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#8f8b85" />
                    <ThemedText style={styles.metaText}>{relativeDate(activity.date)}</ThemedText>
                    <ThemedText style={styles.metaDot}>·</ThemedText>
                    <Ionicons name="location-outline" size={13} color="#8f8b85" />
                    <ThemedText style={styles.metaText} numberOfLines={1}>{activity.location.name}</ThemedText>
                    {dist && (
                      <>
                        <ThemedText style={styles.metaDot}>·</ThemedText>
                        <ThemedText style={styles.metaDist}>{dist}</ThemedText>
                      </>
                    )}
                  </View>

                  {/* BOTTOM ROW: avatars + progress bar */}
                  <View style={styles.cardBottom}>
                    <View style={styles.avatarRow}>
                      {shown.map((uid, i) => (
                        <View
                          key={uid}
                          style={[styles.avatar, { backgroundColor: avatarColor(uid), marginLeft: i === 0 ? 0 : -8 }]}
                        />
                      ))}
                      {extra > 0 && (
                        <View style={[styles.avatar, styles.avatarExtra, { marginLeft: -8 }]}>
                          <ThemedText style={styles.avatarExtraText}>+{extra}</ThemedText>
                        </View>
                      )}
                      <ThemedText style={styles.participantCount}>
                        {activity.participantsList.length} of {activity.maxParticipants}
                      </ThemedText>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, {
                        width: `${Math.min(fill * 100, 100)}%` as any,
                        backgroundColor: fill >= 1 ? '#e8823f' : fill >= 0.7 ? '#e8823f' : '#e8823f',
                      }]} />
                    </View>
                  </View>

                </View>
                </Pressable>
              </Link>
            );
          })}
        </View>

      </View>

      {/* SPORT PICKER MODAL */}
      <Modal visible={sportModalOpen} transparent animationType="fade" onRequestClose={() => setSportModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSportModalOpen(false)}>
          <View style={styles.modalSheet}>
            <ThemedText style={styles.modalTitle}>Sport</ThemedText>
            <Pressable
              style={[styles.modalOption, !sportFilter && styles.modalOptionActive]}
              onPress={() => { setSportFilter(null); setSportModalOpen(false); }}>
              <ThemedText style={[styles.modalOptionText, !sportFilter && styles.modalOptionTextActive]}>
                All sports
              </ThemedText>
              {!sportFilter && <Ionicons name="checkmark" size={16} color="#e8823f" />}
            </Pressable>
            {visibleSports.map((sport) => (
              <Pressable
                key={sport.id}
                style={[styles.modalOption, sportFilter === sport.id && styles.modalOptionActive]}
                onPress={() => { setSportFilter(sport.id); setSportModalOpen(false); }}>
                <View style={styles.modalOptionRow}>
                  <SportIcon sportName={sport.name} size={16} color={sportFilter === sport.id ? '#e8823f' : '#8f8b85'} style={{ marginRight: 8 }} />
                  <ThemedText style={[styles.modalOptionText, sportFilter === sport.id && styles.modalOptionTextActive]}>
                    {sport.name}
                  </ThemedText>
                </View>
                {sportFilter === sport.id && <Ionicons name="checkmark" size={16} color="#e8823f" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0a0a0b' },
  content: { flexDirection: 'row', justifyContent: 'center' },
  container: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, gap: Spacing.three },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { color: '#f4f2ef', fontSize: 32 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8823f', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20,
  },
  newBtnText: { color: '#1a1005', fontWeight: '700', fontSize: 14 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#111012', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#f4f2ef', fontSize: 14, height: 20, padding: 0 },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChips: { gap: 6 },
  chip: {
    backgroundColor: '#111012', paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: '#e8823f', borderColor: '#e8823f' },
  chipText: { color: '#8f8b85', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#1a1005' },

  sportDropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111012', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 7, paddingHorizontal: 12,
    flexShrink: 0,
  },
  sportDropdownText: { color: '#c9c5bf', fontSize: 12, fontWeight: '600', maxWidth: 90 },

  sectionLabel: { color: '#8f8b85', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  errorText: { color: '#eb8f84', textAlign: 'center' },
  emptyText: { color: '#8f8b85', textAlign: 'center', marginTop: Spacing.four },

  list: { gap: Spacing.two },

  card: {
    backgroundColor: '#0f0e12', borderRadius: 16, padding: 16, gap: 10,
  },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sportIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#e8823f', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardTitle: { flex: 1, color: '#f4f2ef', fontSize: 15, fontWeight: '700' },
  badgeStack: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0 },
  privateBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#8f8b8522' },
  statusText: { fontSize: 11, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' },
  metaText: { color: '#8f8b85', fontSize: 12, flexShrink: 1 },
  metaDot: { color: '#4a4845', fontSize: 12 },
  metaDist: { color: '#c9c5bf', fontSize: 12, fontWeight: '600', flexShrink: 0 },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  avatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#111012' },
  avatarExtra: { backgroundColor: '#2a2a2e', alignItems: 'center', justifyContent: 'center' },
  avatarExtraText: { color: '#8f8b85', fontSize: 9, fontWeight: '700' },
  participantCount: { color: '#8f8b85', fontSize: 12, marginLeft: 8 },

  progressTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111012', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, gap: 4,
  },
  modalTitle: { color: '#f4f2ef', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
  },
  modalOptionActive: { backgroundColor: 'rgba(232,130,63,0.1)' },
  modalOptionRow: { flexDirection: 'row', alignItems: 'center' },
  modalOptionText: { color: '#8f8b85', fontSize: 14, fontWeight: '500' },
  modalOptionTextActive: { color: '#e8823f', fontWeight: '700' },
});
