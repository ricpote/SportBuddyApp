import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getActivity, joinActivity, leaveActivity } from '@/services/activities';
import { getSport } from '@/services/sports';
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadActivity = useCallback(() => {
    if (!id) return;
    getActivity(id)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!activity) return;
    getSport(activity.sportId)
      .then(setSport)
      .catch(() => setSport(null));
  }, [activity?.sportId]);

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

  async function handleJoin() {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await joinActivity(activity!.activityId);
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar na atividade');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave() {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await leaveActivity(activity!.activityId);
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível sair da atividade');
    } finally {
      setSubmitting(false);
    }
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
          <ThemedText themeColor="textSecondary" style={styles.note}>
            És o organizador desta atividade.
          </ThemedText>
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
});
