import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getActivity, updateActivity } from '@/services/activities';
import { Activity, SkillLevel } from '@/types/activity';

const DIFFICULTY_OPTIONS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competitive'];
const DIFFICULTY_LABELS: Record<SkillLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();

  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [difficultyLevel, setDifficultyLevel] = useState<SkillLevel>('beginner');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getActivity(id)
      .then((data) => {
        setActivity(data);
        setTitle(data.title);
        setDescription(data.description);
        setMaxParticipants(String(data.maxParticipants));
        setDate(new Date(data.date));
        setDifficultyLevel(data.difficultyLevel);
        setRequiresApproval(data.requiresApproval);
      })
      .catch(() => setActivity(null));
  }, [id]);

  if (activity === undefined) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
      </ThemedView>
    );
  }

  if (activity === null || !user || activity.createdBy !== user.uid) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">
          Só o organizador pode editar esta atividade.
        </ThemedText>
      </ThemedView>
    );
  }

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError('O título não pode ficar vazio');
      return;
    }

    if (date.getTime() <= Date.now()) {
      setError('A data tem de ser no futuro');
      return;
    }

    const parsedMax = Number(maxParticipants);
    if (!Number.isInteger(parsedMax) || parsedMax < 1) {
      setError('Número máximo de participantes inválido');
      return;
    }

    if (parsedMax < activity!.participantsList.length) {
      setError(
        `Já existem ${activity!.participantsList.length} participantes — o máximo não pode ser menor`
      );
      return;
    }

    setSubmitting(true);
    try {
      await updateActivity(activity!.activityId, {
        title: title.trim(),
        description: description.trim(),
        maxParticipants: parsedMax,
        date: date.toISOString(),
        difficultyLevel,
        requiresApproval,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar as alterações');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Título"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Descrição"
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <ThemedText type="smallBold">Dificuldade</ThemedText>
        <ThemedView style={styles.chipRow}>
          {DIFFICULTY_OPTIONS.map((level) => (
            <Pressable key={level} onPress={() => setDifficultyLevel(level)}>
              <ThemedView
                type={difficultyLevel === level ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.chip}>
                <ThemedText type="small">{DIFFICULTY_LABELS[level]}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>

        <DateTimeField label="Data e hora" value={date} onChange={setDate} />

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Máximo de participantes"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
        />

        <ThemedView style={styles.switchRow}>
          <ThemedText>Requer aprovação para participar</ThemedText>
          <Switch value={requiresApproval} onValueChange={setRequiresApproval} />
        </ThemedView>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
          disabled={submitting}
          onPress={handleSubmit}>
          <ThemedText style={{ color: theme.background }} type="smallBold">
            {submitting ? 'A guardar...' : 'Guardar alterações'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
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
    gap: Spacing.two,
  },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  multiline: {
    height: 96,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  error: {
    textAlign: 'center',
  },
});
