import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createActivity } from '@/services/activities';
import { listSports } from '@/services/sports';
import { SkillLevel } from '@/types/activity';
import { Sport, SportCategory } from '@/types/sport';

const DIFFICULTY_OPTIONS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'competitive'];
const DIFFICULTY_LABELS: Record<SkillLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

const CATEGORY_ORDER: SportCategory[] = ['team', 'individual'];
const CATEGORY_LABELS: Record<SportCategory, string> = {
  team: 'Equipa',
  individual: 'Individual',
};

function initialDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
}

export default function CreateActivityScreen() {
  const theme = useTheme();

  const [sports, setSports] = useState<Sport[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState<Date>(initialDate);
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

    // Regras alinhadas com a validação do backend (parseCreateActivityDto):
    // título, descrição, modalidade, nome e morada do local são obrigatórios.
    if (
      !title.trim() ||
      !description.trim() ||
      !sportId ||
      !locationName.trim() ||
      !address.trim()
    ) {
      setError('Preenche o título, descrição, modalidade, local e morada');
      return;
    }

    if (date.getTime() <= Date.now()) {
      setError('A data tem de ser no futuro');
      return;
    }

    const parsedMax = Number(maxParticipants);
    if (!Number.isInteger(parsedMax) || parsedMax < 2) {
      setError('O número máximo de participantes tem de ser pelo menos 2');
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
        date: date.toISOString(),
        difficultyLevel,
        requiresApproval,
      });
      router.replace({ pathname: '/activity/[id]', params: { id: activity.id } });
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
        {CATEGORY_ORDER.map((category) => {
          const group = sports.filter((sport) => sport.category === category);
          if (group.length === 0) return null;
          return (
            <ThemedView key={category} style={styles.categoryGroup}>
              <ThemedText type="small" themeColor="textSecondary">
                {CATEGORY_LABELS[category]}
              </ThemedText>
              <ThemedView style={styles.chipRow}>
                {group.map((sport) => (
                  <Pressable key={sport.id} onPress={() => setSportId(sport.id)}>
                    <ThemedView
                      type={sportId === sport.id ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.chip}>
                      <ThemedText type="small">{sport.name}</ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
          );
        })}
        {sports.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Sem modalidades disponíveis ainda.
          </ThemedText>
        )}

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
  categoryGroup: {
    gap: Spacing.one,
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
