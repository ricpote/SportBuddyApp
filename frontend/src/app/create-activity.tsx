import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createActivity } from '@/services/activities';
import { listSports } from '@/services/sports';
import { SkillLevel } from '@/types/activity';
import { Sport } from '@/types/sport';

const DIFFICULTY_OPTIONS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competitive'];
const DIFFICULTY_LABELS: Record<SkillLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

export default function CreateActivityScreen() {
  const theme = useTheme();

  const [sports, setSports] = useState<Sport[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<SkillLevel>('beginner');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listSports()
      .then(setSports)
      .catch(() => setSports([]));
  }, []);

  async function handleSubmit() {
    setError(null);

    if (!title.trim() || !sportId || !date || !time || !locationName.trim()) {
      setError('Preenche o título, modalidade, data/hora e local');
      return;
    }

    const parsedDate = new Date(`${date}T${time}`);
    if (Number.isNaN(parsedDate.getTime())) {
      setError('Data ou hora inválida (usa AAAA-MM-DD e HH:MM)');
      return;
    }

    const parsedMax = Number(maxParticipants);
    if (!Number.isInteger(parsedMax) || parsedMax < 1) {
      setError('Número máximo de participantes inválido');
      return;
    }

    setSubmitting(true);
    try {
      const activity = await createActivity({
        title: title.trim(),
        description: description.trim(),
        sportId,
        maxParticipants: parsedMax,
        location: { name: locationName.trim(), address: address.trim(), lat: 0, lng: 0 },
        date: parsedDate.toISOString(),
        difficultyLevel,
        requiresApproval,
      });
      router.replace({ pathname: '/activity/[id]', params: { id: activity.activityId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a atividade');
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

        <ThemedText type="smallBold">Modalidade</ThemedText>
        <ThemedView style={styles.chipRow}>
          {sports.map((sport) => (
            <Pressable key={sport.id} onPress={() => setSportId(sport.id)}>
              <ThemedView
                type={sportId === sport.id ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.chip}>
                <ThemedText type="small">{sport.name}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
          {sports.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Sem modalidades disponíveis ainda.
            </ThemedText>
          )}
        </ThemedView>

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

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Local (nome)"
          placeholderTextColor={theme.textSecondary}
          value={locationName}
          onChangeText={setLocationName}
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Morada"
          placeholderTextColor={theme.textSecondary}
          value={address}
          onChangeText={setAddress}
        />

        <ThemedView style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Data (AAAA-MM-DD)"
            placeholderTextColor={theme.textSecondary}
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            style={[styles.input, styles.flex1, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Hora (HH:MM)"
            placeholderTextColor={theme.textSecondary}
            value={time}
            onChangeText={setTime}
          />
        </ThemedView>

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
            {submitting ? 'A criar...' : 'Criar atividade'}
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
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
