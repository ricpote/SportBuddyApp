import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyProfile, updateMyProfile } from '@/services/users';
import { UserProfile } from '@/types/user';

export default function EditProfileScreen() {
  const theme = useTheme();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setBio(data.bio ?? '');
      })
      .catch(() => setProfile(null));
  }, []);

  if (profile === undefined) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">A carregar...</ThemedText>
      </ThemedView>
    );
  }

  if (profile === null) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Não foi possível carregar o perfil.</ThemedText>
      </ThemedView>
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('O nome não pode ficar vazio.');
      return;
    }
    setSubmitting(true);
    try {
      await updateMyProfile({ name: name.trim(), bio: bio.trim() || undefined });
      router.back();
    } catch {
      setError('Erro ao guardar. Tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Editar perfil</ThemedText>

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Nome"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          placeholder="Bio (opcional)"
          placeholderTextColor={theme.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          style={({ pressed }) => [styles.button, { backgroundColor: theme.text }, pressed && styles.pressed]}
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
