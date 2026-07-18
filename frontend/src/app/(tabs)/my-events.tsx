import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { cancelActivity, listActivities } from '@/services/activities';
import { Activity } from '@/types/activity';
import { SportIcon } from '@/utils/sport-icon';

type Filter = 'active' | 'past';

const PAGE_SIZE = 5;

function statusInfo(event: Activity): { label: string; color: string } {
  const fill = event.maxParticipants > 0 ? event.participantsList.length / event.maxParticipants : 0;
  if (event.status === 'cancelled') return { label: 'Cancelada', color: '#eb8f84' };
  if (event.status === 'completed') return { label: 'Terminada', color: '#8f8b85' };
  if (fill >= 1) return { label: 'Completa', color: '#eb8f84' };
  if (fill >= 0.75) return { label: 'Quase cheia', color: '#e8823f' };
  return { label: 'Aberta', color: '#9ccd6b' };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return { day, time };
}

export default function MyEvents() {
  const { user } = useAuth();

  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;
      setLoading(true);
      listActivities({ createdBy: user.uid })
        .then(setActivities)
        .finally(() => setLoading(false));
    }, [user?.uid]),
  );

  const active = useMemo(
    () => activities.filter(a => a.status === 'open' || a.status === 'full'),
    [activities],
  );
  const past = useMemo(
    () => activities.filter(a => a.status === 'completed' || a.status === 'cancelled'),
    [activities],
  );

  const baseList = filter === 'active' ? active : past;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? baseList.filter(a => a.title.toLowerCase().includes(q)) : baseList;
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [baseList, search]);

  const shown = filtered.slice(0, limit);
  const total = filter === 'active' ? active.length : past.length;

  const handleEdit = (event: Activity) => {
    setMenuOpenId(null);
    router.push(`/edit-activity/${event.id}` as any);
  };

  const handleDelete = (event: Activity) => {
    setMenuOpenId(null);
    const doCancel = async () => {
      await cancelActivity(event.id);
      if (user?.uid) {
        listActivities({ createdBy: user.uid }).then(setActivities);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Cancelar "${event.title}"? Esta ação não pode ser desfeita.`)) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancelar atividade',
        `Tens a certeza que queres cancelar "${event.title}"?`,
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim, cancelar', style: 'destructive', onPress: doCancel },
        ],
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e8823f" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.title}>Os meus eventos</ThemedText>
          <ThemedText style={styles.subtitle}>
            {activities.length} eventos no total · <ThemedText style={styles.subtitleOrange}>{active.length} ativos</ThemedText>
          </ThemedText>
        </View>
        <Link href="/create-activity" asChild>
          <Pressable style={({ pressed }) => pressed && { opacity: 0.75 }}>
            <View style={styles.createBtn}>
              <Ionicons name="add" size={16} color="#000" style={{ marginRight: 6 }} />
              <ThemedText style={styles.createBtnText}>Criar evento</ThemedText>
            </View>
          </Pressable>
        </Link>
      </View>

      {/* Filter chips + search */}
      <View style={styles.toolbar}>
        <View style={styles.chips}>
          <Pressable
            onPress={() => { setFilter('active'); setLimit(PAGE_SIZE); }}
            style={({ pressed }) => [styles.chip, filter === 'active' && styles.chipActive, pressed && { opacity: 0.7 }]}>
            <ThemedText style={[styles.chipText, filter === 'active' && styles.chipTextActive]}>
              Ativos {active.length}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => { setFilter('past'); setLimit(PAGE_SIZE); }}
            style={({ pressed }) => [styles.chip, filter === 'past' && styles.chipActive, pressed && { opacity: 0.7 }]}>
            <ThemedText style={[styles.chipText, filter === 'past' && styles.chipTextActive]}>
              Passados {past.length}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#5a5855" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar evento..."
            placeholderTextColor="#5a5855"
            value={search}
            onChangeText={t => { setSearch(t); setLimit(PAGE_SIZE); }}
          />
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Table header */}
        <View style={styles.tableHeader}>
          <ThemedText style={[styles.th, { flex: 5 }]}>EVENTO</ThemedText>
          <ThemedText style={[styles.th, { flex: 1.5 }]}>DATA</ThemedText>
          <ThemedText style={[styles.th, { flex: 1.5 }]}>ESTADO</ThemedText>
          <ThemedText style={[styles.th, { flex: 1.5 }]}>INSCRITOS</ThemedText>
          <ThemedText style={[styles.th, { flex: 1.5, paddingLeft: 20 }]}>PEDIDOS</ThemedText>
          <View style={{ width: 36 }} />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={36} color="#3a3838" />
            <ThemedText style={styles.emptyText}>Sem eventos</ThemedText>
          </View>
        ) : (
          shown.map(event => {
            const { label: statusLabel, color: statusColor } = statusInfo(event);
            const { day, time } = formatDate(event.date);
            const fill = event.maxParticipants > 0
              ? event.participantsList.length / event.maxParticipants : 0;
            const barColor = fill >= 1 ? '#eb8f84' : fill >= 0.75 ? '#e8823f' : '#9ccd6b';
            const pendingCount = event.requiresApproval ? event.waitlist.length : 0;

            return (
              <View key={event.id} style={styles.row}>
                {/* Evento */}
                <View style={{ flex: 5, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <View style={styles.sportCircle}>
                    <SportIcon sportName={event.sportId} size={14} color="#e8823f" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/activity/${event.id}` as any} asChild>
                      <Pressable>
                        <ThemedText style={styles.eventTitle} numberOfLines={1}>{event.title}</ThemedText>
                      </Pressable>
                    </Link>
                    <ThemedText style={styles.eventSport} numberOfLines={1}>{event.sportId}</ThemedText>
                  </View>
                </View>

                {/* Data */}
                <View style={{ flex: 1.5 }}>
                  <ThemedText style={styles.dateDay}>{day}</ThemedText>
                  <ThemedText style={styles.dateTime}>{time}</ThemedText>
                </View>

                {/* Estado */}
                <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <ThemedText style={[styles.statusText, { color: statusColor }]}>{statusLabel}</ThemedText>
                </View>

                {/* Inscritos */}
                <View style={{ flex: 1.5, gap: 4 }}>
                  <ThemedText style={styles.fillText}>
                    {event.participantsList.length}/{event.maxParticipants}
                  </ThemedText>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.round(fill * 100)}%` as any, backgroundColor: barColor }]} />
                  </View>
                </View>

                {/* Pedidos */}
                <View style={{ flex: 1.5, paddingLeft: 20 }}>
                  {pendingCount > 0 ? (
                    <ThemedText style={styles.pendingText}>{pendingCount} novo{pendingCount !== 1 ? 's' : ''}</ThemedText>
                  ) : (
                    <ThemedText style={styles.dash}>—</ThemedText>
                  )}
                </View>

                {/* Menu */}
                <View style={{ position: 'relative' }}>
                  <Pressable
                    style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => setMenuOpenId(menuOpenId === event.id ? null : event.id)}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#5a5855" />
                  </Pressable>
                  {menuOpenId === event.id && (
                    <View style={styles.dropdown}>
                      <Pressable
                        style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.7 }]}
                        onPress={() => handleEdit(event)}>
                        <Ionicons name="create-outline" size={16} color="#c9c5bf" />
                        <ThemedText style={styles.dropdownText}>Editar</ThemedText>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.dropdownItem, pressed && { opacity: 0.7 }]}
                        onPress={() => handleDelete(event)}>
                        <Ionicons name="close-circle-outline" size={16} color="#eb8f84" />
                        <ThemedText style={[styles.dropdownText, { color: '#eb8f84' }]}>Cancelar evento</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Pagination */}
      {filtered.length > 0 && (
        <View style={styles.pagination}>
          <ThemedText style={styles.paginationText}>
            A mostrar {shown.length} de {filtered.length} {filter === 'active' ? 'ativos' : 'passados'}
            {limit < filtered.length && (
              <>
                {' · '}
                <ThemedText
                  style={styles.verMais}
                  onPress={() => setLimit(l => l + PAGE_SIZE)}>
                  Ver mais
                </ThemedText>
              </>
            )}
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  content: { padding: 24, paddingBottom: 48 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 20, gap: 16,
  },
  title: { fontSize: 26, color: '#f4f2ef', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#5a5855' },
  subtitleOrange: { fontSize: 13, color: '#e8823f' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8823f',
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 10,
  },
  createBtnText: { color: '#000', fontSize: 14, fontFamily: 'HankenGrotesk_700Bold' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12, marginBottom: 16,
    flexWrap: 'wrap',
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#e8823f',
  },
  chipText: { fontSize: 13, color: '#8f8b85' },
  chipTextActive: { color: '#000', fontFamily: 'HankenGrotesk_700Bold' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111012', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: 200,
  },
  searchInput: {
    flex: 1, color: '#f4f2ef', fontSize: 13,
    outlineStyle: 'none' as any,
  },

  table: {
    backgroundColor: '#111012',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  th: { fontSize: 10, color: '#5a5855', fontFamily: 'HankenGrotesk_700Bold', letterSpacing: 0.5 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },

  sportCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(232,130,63,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  eventTitle: { fontSize: 14, color: '#e8823f', fontFamily: 'HankenGrotesk_700Bold' },
  eventSport: { fontSize: 11, color: '#5a5855', marginTop: 2, textTransform: 'capitalize' },

  dateDay: { fontSize: 13, color: '#c9c5bf' },
  dateTime: { fontSize: 11, color: '#5a5855', marginTop: 2 },

  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 13 },

  fillText: { fontSize: 11, color: '#8f8b85' },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },

  pendingText: { fontSize: 13, color: '#e8823f', fontFamily: 'HankenGrotesk_700Bold' },
  dash: { fontSize: 13, color: '#3a3838' },

  menuBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1a1819',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: '#5a5855' },

  pagination: { alignItems: 'center', marginTop: 16 },
  paginationText: { fontSize: 13, color: '#5a5855' },
  verMais: { fontSize: 13, color: '#e8823f', fontFamily: 'HankenGrotesk_700Bold' },

  dropdown: {
    position: 'absolute',
    right: 0,
    top: 36,
    backgroundColor: '#1a1819',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 999,
    minWidth: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dropdownText: { fontSize: 14, color: '#c9c5bf' },
});
