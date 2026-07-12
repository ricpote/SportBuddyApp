import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import LocationPicker, { PickedLocation } from '@/components/location-picker';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { createActivity } from '@/services/activities';
import { listSports } from '@/services/sports';
import { SkillLevel } from '@/types/activity';
import { Sport, SportCategory } from '@/types/sport';
import { SportIcon } from '@/utils/sport-icon';

const DIFFICULTY_OPTIONS: SkillLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'competitive',
];

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
  const [sports, setSports] = useState<Sport[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sportId, setSportId] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('10');

  const [location, setLocation] = useState<PickedLocation>({
    name: '',
    address: '',
    lat: 38.7223,
    lng: -9.1393,
  });

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

    if (
      !title.trim() ||
      !description.trim() ||
      !sportId ||
      !location.name.trim() ||
      !location.address.trim()
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

    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      setError('Seleciona uma localização válida no mapa');
      return;
    }

    setSubmitting(true);

    try {
      const activity = await createActivity({
        title: title.trim(),
        description: description.trim(),
        sportId,
        maxParticipants: parsedMax,
        location: {
          name: location.name.trim(),
          address: location.address.trim(),
          lat: location.lat,
          lng: location.lng,
        },
        date: date.toISOString(),
        difficultyLevel,
        requiresApproval,
      });

      router.replace({
        pathname: '/activity/[id]',
        params: { id: activity.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a atividade');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView 
      style={{ backgroundColor: '#0a0a0b' }} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        
        {/* TÍTULO E DESCRIÇÃO */}
        <TextInput
          style={styles.input}
          placeholder="Título da atividade"
          placeholderTextColor="#8f8b85"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Descrição (ex: Vamos jogar um 5 para 5 amigável. Levem bola se tiverem!)"
          placeholderTextColor="#8f8b85"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* MODALIDADE */}
        <ThemedText style={styles.sectionLabel}>Modalidade</ThemedText>

        {CATEGORY_ORDER.map((category) => {
          const group = sports.filter((sport) => sport.category === category);

          if (group.length === 0) return null;

          return (
            <View key={category} style={styles.categoryGroup}>
              <ThemedText style={styles.categoryLabel}>
                {CATEGORY_LABELS[category]}
              </ThemedText>

              <View style={styles.chipRow}>
                {group.map((sport) => {
                  const isActive = sportId === sport.id;
                  return (
                    <Pressable key={sport.id} onPress={() => setSportId(sport.id)}>
                      <View style={[styles.chip, isActive && styles.chipActive]}>
                        <SportIcon
                          sportName={sport.name}
                          size={16}
                          color={isActive ? '#0a0a0b' : '#c9c5bf'}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {sport.name}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {sports.length === 0 && (
          <ThemedText style={styles.emptyText}>
            Sem modalidades disponíveis ainda.
          </ThemedText>
        )}

        {/* DIFICULDADE */}
        <ThemedText style={styles.sectionLabel}>Dificuldade</ThemedText>

        <View style={styles.chipRow}>
          {DIFFICULTY_OPTIONS.map((level) => {
            const isActive = difficultyLevel === level;
            return (
              <Pressable key={level} onPress={() => setDifficultyLevel(level)}>
                <View style={[styles.chip, isActive && styles.chipActive]}>
                  <ThemedText style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {DIFFICULTY_LABELS[level]}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* LOCALIZAÇÃO (Componente externo, poderá necessitar de ajustes no seu próprio ficheiro se tiver fundo branco) */}
        <ThemedText style={styles.sectionLabel}>Localização</ThemedText>
        <LocationPicker value={location} onChange={setLocation} />

        {/* DATA E HORA */}
        <DateTimeField label="Data e hora" value={date} onChange={setDate} />

        {/* MÁXIMO DE PARTICIPANTES */}
        <ThemedText style={styles.sectionLabel}>Lotação</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Máximo de participantes"
          placeholderTextColor="#8f8b85"
          keyboardType="number-pad"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
        />

        {/* APROVAÇÃO */}
        <View style={styles.switchRow}>
          <View>
            <ThemedText style={{ color: '#f4f2ef', fontWeight: 'bold' }}>Requer aprovação</ThemedText>
            <ThemedText style={{ color: '#c9c5bf', fontSize: 12 }}>Aceitar manualmente quem entra</ThemedText>
          </View>
          <Switch 
            value={requiresApproval} 
            onValueChange={setRequiresApproval} 
            trackColor={{ false: '#141315', true: '#e8823f' }}
            thumbColor={requiresApproval ? '#f4f2ef' : '#c9c5bf'}
          />
        </View>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {/* BOTÃO CRIAR */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
          disabled={submitting}
          onPress={handleSubmit}
        >
          <ThemedText style={styles.buttonText} type="smallBold">
            {submitting ? 'A criar...' : 'Criar atividade'}
          </ThemedText>
        </Pressable>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    height: 52,
    backgroundColor: '#111012',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#f4f2ef',
  },
  multiline: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    color: '#f4f2ef',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: Spacing.two,
  },
  categoryGroup: {
    gap: Spacing.one,
  },
  categoryLabel: {
    color: '#8f8b85',
    fontSize: 14,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111012',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: '#e8823f',
    borderColor: '#e8823f',
  },
  chipText: {
    color: '#c9c5bf',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#1a1005',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111012',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: Spacing.two,
  },
  button: {
    height: 52,
    backgroundColor: '#e8823f',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
    marginBottom: Spacing.six,
  },
  buttonText: {
    color: '#f4f2ef',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    textAlign: 'center',
    color: '#eb8f84',
    marginTop: Spacing.two,
  },
  emptyText: {
    color: '#8f8b85',
    fontSize: 14,
  },
});