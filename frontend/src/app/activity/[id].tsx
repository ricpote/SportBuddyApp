import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import {
  admitFromWaitlist,
  cancelActivity,
  getActivity,
  joinActivity,
  leaveActivity,
  rejectFromWaitlist,
  removeParticipant,
} from '@/services/activities';
import { getSport } from '@/services/sports';
import { getUserProfile } from '@/services/users';
import { Activity } from '@/types/activity';
import { Sport } from '@/types/sport';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

const DIFFICULTY_LABELS: Record<Activity['difficultyLevel'], string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();

  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [sport, setSport] = useState<Sport | null>(null);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState<string | null>(null);

  const loadActivity = useCallback(() => {
    if (!id) return;
    getActivity(id)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [id]);

  // Reload on focus so changes made in the edit modal show up when coming back.
  useFocusEffect(loadActivity);

  const sportId = activity?.sportId;

  useEffect(() => {
    if (!sportId) return;
    getSport(sportId)
      .then(setSport)
      .catch(() => setSport(null));
  }, [sportId]);

  useEffect(() => {
    if (!activity) return;
    const uids = [...new Set([...activity.participantsList, ...activity.waitlist])];
    if (uids.length === 0) return;
    Promise.allSettled(uids.map((uid) => getUserProfile(uid).then((u) => [uid, u.name] as const)))
      .then((results) => {
        const names = new Map<string, string>();
        for (const r of results) {
          if (r.status === 'fulfilled') names.set(r.value[0], r.value[1]);
        }
        setParticipantNames(names);
      });
  }, [activity]);

  if (activity === undefined) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
      </ThemedView>
    );
  }

  if (activity === null) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Atividade não encontrada.</ThemedText>
      </ThemedView>
    );
  }

  const isParticipant = !!user && activity.participantsList.includes(user.uid);
  const isWaitlisted = !!user && activity.waitlist.includes(user.uid);
  const isCreator = !!user && activity.createdBy === user.uid;
  const isFull = activity.participantsList.length >= activity.maxParticipants;
  const canJoin = activity.status === 'open' || activity.status === 'full';
  const activityDate = new Date(activity.date);

  async function runAction(action: () => Promise<Activity>, fallbackMessage: string) {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await action();
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function handleJoin() {
    return runAction(() => joinActivity(activity!.id), 'Não foi possível entrar na atividade');
  }

  function handleLeave() {
    return runAction(() => leaveActivity(activity!.id), 'Não foi possível sair da atividade');
  }

  function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setConfirmingCancel(false);
    return runAction(() => cancelActivity(activity!.id), 'Não foi possível cancelar a atividade');
  }

  function handleRemoveParticipant(participantId: string) {
    return runAction(
      () => removeParticipant(activity!.id, participantId),
      'Não foi possível remover o participante'
    );
  }

  function handleAdmit(userId: string) {
    setConfirmingReject(null);
    return runAction(
      () => admitFromWaitlist(activity!.id, userId),
      'Não foi possível admitir o utilizador'
    );
  }

  function handleReject(userId: string) {
    if (confirmingReject !== userId) {
      setConfirmingReject(userId);
      return;
    }
    setConfirmingReject(null);
    return runAction(
      () => rejectFromWaitlist(activity!.id, userId),
      'Não foi possível rejeitar o utilizador'
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{activity.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{STATUS_LABELS[activity.status]}</ThemedText>

        {activity.description ? <ThemedText>{activity.description}</ThemedText> : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <Row label="Modalidade" value={sport?.name ?? activity.sportId} />
          <Row label="Dificuldade" value={DIFFICULTY_LABELS[activity.difficultyLevel]} />
          <Row
            label="Data"
            value={`${activityDate.toLocaleDateString()} ${activityDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
          />
          <Row label="Local" value={activity.location.name} />
          {activity.location.address ? <Row label="Morada" value={activity.location.address} /> : null}
          <Row
            label="Participantes"
            value={`${activity.participantsList.length}/${activity.maxParticipants}`}
          />
          {activity.waitlist.length > 0 && (
            <Row label="Lista de espera" value={String(activity.waitlist.length)} />
          )}
          {activity.requiresApproval && <Row label="Requer aprovação" value="Sim" />}
        </ThemedView>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {isCreator ? (
          <>
            <ThemedText themeColor="textSecondary" style={styles.note}>
              És o organizador desta atividade.
            </ThemedText>

            {canJoin && (
              <>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">Participantes</ThemedText>
                  {activity.participantsList
                    .filter((participantId) => participantId !== activity.createdBy)
                    .map((participantId) => (
                      <ThemedView key={participantId} type="backgroundElement" style={styles.memberRow}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {participantNames.get(participantId) ?? shortId(participantId)}
                        </ThemedText>
                        <Pressable
                          disabled={submitting}
                          onPress={() => handleRemoveParticipant(participantId)}>
                          <ThemedText type="smallBold">Remover</ThemedText>
                        </Pressable>
                      </ThemedView>
                    ))}
                  {activity.participantsList.length <= 1 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      Ainda só tu. Partilha a atividade!
                    </ThemedText>
                  )}
                </ThemedView>

                {activity.waitlist.length > 0 && (
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <ThemedText type="smallBold">Lista de espera</ThemedText>
                    {activity.waitlist.map((userId) => (
                      <ThemedView key={userId} type="backgroundElement" style={styles.memberRow}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {participantNames.get(userId) ?? shortId(userId)}
                        </ThemedText>
                        {activity.status === 'open' ? (
                          <ThemedView style={styles.waitlistActions}>
                            <Pressable disabled={submitting} onPress={() => handleAdmit(userId)}>
                              <ThemedText type="smallBold">Admitir</ThemedText>
                            </Pressable>
                            <Pressable disabled={submitting} onPress={() => handleReject(userId)}>
                              <ThemedText type="smallBold" style={styles.rejectText}>
                                {confirmingReject === userId ? 'Tens a certeza?' : 'Rejeitar'}
                              </ThemedText>
                            </Pressable>
                          </ThemedView>
                        ) : (
                          <ThemedText type="small" themeColor="textSecondary">
                            Atividade completa
                          </ThemedText>
                        )}
                      </ThemedView>
                    ))}
                  </ThemedView>
                )}

                {/* Link asChild drops the Pressable's style function on web, so the
                    visual styles live on an inner View instead. */}
                <Link
                  href={{ pathname: '/edit-activity/[id]', params: { id: activity.id } }}
                  asChild>
                  <Pressable style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.button, { backgroundColor: theme.text }]}>
                      <ThemedText style={{ color: theme.background }} type="smallBold">
                        Editar atividade
                      </ThemedText>
                    </View>
                  </Pressable>
                </Link>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                  disabled={submitting}
                  onPress={handleCancel}>
                  <ThemedText type="smallBold">
                    {confirmingCancel ? 'Tens a certeza? Toca para confirmar' : 'Cancelar atividade'}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </>
        ) : isParticipant || isWaitlisted ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleLeave}>
            <ThemedText type="smallBold">
              {isWaitlisted ? 'Sair da lista de espera' : 'Sair da atividade'}
            </ThemedText>
          </Pressable>
        ) : canJoin ? (
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleJoin}>
            <ThemedText style={{ color: theme.background }} type="smallBold">
              {isFull ? 'Entrar na lista de espera' : 'Participar'}
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.note}>
            Esta atividade já não aceita participantes.
          </ThemedText>
        )}
      </ThemedView>
    </ScrollView>
  );
}

// Fallback enquanto o nome carrega ou se o fetch falhar.
function shortId(uid: string) {
  return `Utilizador ${uid.slice(0, 6)}…`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    textAlign: 'center',
  },
  note: {
    textAlign: 'center',
  },
  waitlistActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rejectText: {
    color: '#FF6B6B',
  },
});
