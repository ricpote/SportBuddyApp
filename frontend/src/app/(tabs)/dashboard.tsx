import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { admitFromWaitlist, getMyActivities, rejectFromWaitlist } from '@/services/activities';
import { getUserProfile } from '@/services/users';
import { Activity } from '@/types/activity';
import { PublicUser } from '@/types/user';

type PendingRequest = {
  userId: string;
  activityId: string;
  activityTitle: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}

function StatTile({
  label,
  value,
  subtitle,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      {accent && <View style={styles.accentDot} />}
      <ThemedText style={styles.tileValue}>{value}</ThemedText>
      <ThemedText style={styles.tileLabel}>{label}</ThemedText>
      {subtitle ? <ThemedText style={styles.tileSub}>{subtitle}</ThemedText> : null}
    </View>
  );
}

export default function PartnerDashboard() {
  const { profile, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<Record<string, PublicUser>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyActivities();
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myActivities = useMemo(
    () => activities.filter(a => a.createdBy === user?.uid),
    [activities, user?.uid],
  );

  const activeActivities = useMemo(
    () => myActivities.filter(a => a.status === 'open' || a.status === 'full'),
    [myActivities],
  );

  const upcomingEvents = useMemo(
    () =>
      activeActivities
        .filter(a => new Date(a.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5),
    [activeActivities],
  );

  const fillRate = useMemo(() => {
    if (myActivities.length === 0) return 0;
    const sum = myActivities.reduce(
      (acc, a) => acc + (a.maxParticipants > 0 ? a.participantsList.length / a.maxParticipants : 0),
      0,
    );
    return Math.round((sum / myActivities.length) * 100);
  }, [myActivities]);

  const pendingRequests = useMemo<PendingRequest[]>(() => {
    const result: PendingRequest[] = [];
    for (const act of activeActivities) {
      if (act.requiresApproval) {
        for (const uid of act.waitlist) {
          result.push({ userId: uid, activityId: act.id, activityTitle: act.title });
        }
      }
    }
    return result;
  }, [activeActivities]);

  useEffect(() => {
    const toLoad = [...new Set(pendingRequests.slice(0, 5).map(r => r.userId))].filter(
      id => !pendingUsers[id],
    );
    if (toLoad.length === 0) return;
    Promise.all(toLoad.map(id => getUserProfile(id))).then(profiles => {
      setPendingUsers(prev => {
        const next = { ...prev };
        profiles.forEach(p => { next[p.id] = p; });
        return next;
      });
    });
  }, [pendingRequests]);

  const eventsThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return activeActivities.filter(a => new Date(a.date) >= monthStart).length;
  }, [activeActivities]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const followerCount = profile?.followers?.length ?? 0;
  const totalPending = pendingRequests.length;

  const handleAdmit = async (activityId: string, userId: string) => {
    const key = `${activityId}-${userId}`;
    setActionLoading(key);
    try {
      await admitFromWaitlist(activityId, userId);
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (activityId: string, userId: string) => {
    const key = `${activityId}-${userId}`;
    setActionLoading(key);
    try {
      await rejectFromWaitlist(activityId, userId);
      await load();
    } finally {
      setActionLoading(null);
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
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText type="title" style={styles.greeting} numberOfLines={1}>
            {greeting}, {profile?.name} 👋
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {totalPending > 0
              ? `Tens ${totalPending} pedido${totalPending !== 1 ? 's' : ''} por rever`
              : 'Nenhum pedido pendente'}
            {eventsThisMonth > 0
              ? ` e ${eventsThisMonth} evento${eventsThisMonth !== 1 ? 's' : ''} este mês`
              : ''}
            .
          </ThemedText>
        </View>
        <Link href="/create-activity" asChild>
          <Pressable style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.75 }]}>
            <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 6 }} />
            <ThemedText style={styles.createBtnText}>Criar evento</ThemedText>
          </Pressable>
        </Link>
      </View>

      {/* Stat tiles */}
      <View style={[styles.statsRow, isDesktop && styles.statsRowDesktop]}>
        <StatTile
          label="Seguidores"
          value={followerCount.toLocaleString('pt-PT')}
          subtitle="total"
        />
        <StatTile
          label="Eventos ativos"
          value={String(activeActivities.length)}
          subtitle="este mês"
        />
        <StatTile
          label="Taxa de preenchimento"
          value={`${fillRate}%`}
          subtitle="média"
        />
        <StatTile
          label="Pedidos pendentes"
          value={String(totalPending)}
          accent={totalPending > 0}
        />
      </View>

      {/* Two-column section */}
      <View style={[styles.columns, isDesktop && styles.columnsDesktop]}>
        {/* Próximos eventos */}
        <View style={[styles.card, isDesktop && { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Próximos eventos</ThemedText>
            <Link href="/my-events" asChild>
              <Pressable style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <ThemedText style={styles.seeAll}>Ver todos</ThemedText>
              </Pressable>
            </Link>
          </View>

          {upcomingEvents.length === 0 ? (
            <ThemedText style={styles.empty}>Sem eventos próximos</ThemedText>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <ThemedText style={[styles.th, { flex: 3 }]}>EVENTO</ThemedText>
                <ThemedText style={[styles.th, { flex: 2 }]}>DATA</ThemedText>
                <ThemedText style={[styles.th, { flex: 2 }]}>INSCRITOS</ThemedText>
              </View>
              {upcomingEvents.map(event => {
                const pct =
                  event.maxParticipants > 0
                    ? event.participantsList.length / event.maxParticipants
                    : 0;
                return (
                  <Link key={event.id} href={`/activity/${event.id}` as any} asChild>
                    <Pressable
                      style={({ pressed }) => [styles.tableRow, pressed && { opacity: 0.7 }]}>
                      <ThemedText style={[styles.td, { flex: 3 }]} numberOfLines={1}>
                        {event.title}
                      </ThemedText>
                      <ThemedText style={[styles.td, { flex: 2 }]}>
                        {formatDate(event.date)}
                      </ThemedText>
                      <View style={{ flex: 2 }}>
                        <ThemedText style={styles.tdSmall}>
                          {event.participantsList.length}/{event.maxParticipants}
                        </ThemedText>
                        <View style={styles.progressBg}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.round(pct * 100)}%` as any },
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                );
              })}
            </>
          )}
        </View>

        {/* Pedidos pendentes */}
        <View style={[styles.card, isDesktop && { flex: 2 }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardTitle}>Pedidos pendentes</ThemedText>
          </View>

          {pendingRequests.length === 0 ? (
            <ThemedText style={styles.empty}>Nenhum pedido pendente</ThemedText>
          ) : (
            pendingRequests.slice(0, 5).map(req => {
              const u = pendingUsers[req.userId];
              const key = `${req.activityId}-${req.userId}`;
              const busy = actionLoading === key;
              return (
                <View key={key} style={styles.requestRow}>
                  <View style={styles.requestAvatar}>
                    <ThemedText style={styles.requestInitial}>
                      {u?.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText style={styles.requestName} numberOfLines={1}>
                      {u?.name ?? '…'}
                    </ThemedText>
                    <ThemedText style={styles.requestActivity} numberOfLines={1}>
                      {req.activityTitle}
                    </ThemedText>
                  </View>
                  <Pressable
                    disabled={busy}
                    onPress={() => handleAdmit(req.activityId, req.userId)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.admitBtn,
                      (pressed || busy) && { opacity: 0.6 },
                    ]}>
                    <ThemedText style={styles.actionBtnText}>✓</ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    onPress={() => handleReject(req.activityId, req.userId)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.rejectBtn,
                      (pressed || busy) && { opacity: 0.6 },
                    ]}>
                    <ThemedText style={styles.actionBtnText}>✗</ThemedText>
                  </Pressable>
                </View>
              );
            })
          )}
          {pendingRequests.length > 5 && (
            <ThemedText style={[styles.seeAll, { marginTop: 8 }]}>
              Ver todos os {pendingRequests.length} pedidos
            </ThemedText>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  content: { padding: 24, paddingBottom: 48 },

  header: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 28,
  },
  headerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { fontSize: 26, color: '#f4f2ef', marginBottom: 4 },
  subtitle: { color: '#8f8b85', fontSize: 14 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8823f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  createBtnText: { color: '#fff', fontSize: 14, fontFamily: 'HankenGrotesk_700Bold' },

  statsRow: { flexDirection: 'column', gap: 12, marginBottom: 24 },
  statsRowDesktop: { flexDirection: 'row' },
  tile: {
    flex: 1,
    backgroundColor: '#111012',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  tileAccent: { borderColor: 'rgba(232,130,63,0.3)' },
  accentDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e8823f',
  },
  tileValue: { fontSize: 28, color: '#f4f2ef', fontFamily: 'HankenGrotesk_700Bold', marginBottom: 2 },
  tileLabel: { fontSize: 13, color: '#8f8b85' },
  tileSub: { fontSize: 11, color: '#5a5855', marginTop: 2 },

  columns: { flexDirection: 'column', gap: 16 },
  columnsDesktop: { flexDirection: 'row', alignItems: 'flex-start' },

  card: {
    backgroundColor: '#111012',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, color: '#f4f2ef', fontFamily: 'HankenGrotesk_700Bold' },
  seeAll: { fontSize: 13, color: '#e8823f' },

  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 4,
  },
  th: { fontSize: 10, color: '#5a5855', fontFamily: 'HankenGrotesk_700Bold', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  td: { fontSize: 14, color: '#c9c5bf' },
  tdSmall: { fontSize: 12, color: '#8f8b85', marginBottom: 4 },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: '#e8823f', borderRadius: 2 },

  empty: { fontSize: 14, color: '#5a5855', fontStyle: 'italic' },

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  requestAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e1c1f',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  requestInitial: { fontSize: 15, color: '#e8823f', fontFamily: 'HankenGrotesk_700Bold' },
  requestName: { fontSize: 14, color: '#f4f2ef', fontFamily: 'HankenGrotesk_700Bold' },
  requestActivity: { fontSize: 12, color: '#8f8b85', marginTop: 1 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  admitBtn: { backgroundColor: 'rgba(156,205,107,0.15)', borderWidth: 1, borderColor: 'rgba(156,205,107,0.3)' },
  rejectBtn: { backgroundColor: 'rgba(235,143,132,0.15)', borderWidth: 1, borderColor: 'rgba(235,143,132,0.3)' },
  actionBtnText: { fontSize: 14, color: '#f4f2ef' },
});
