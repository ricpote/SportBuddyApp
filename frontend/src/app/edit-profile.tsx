import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getMyProfile, updateMyProfile } from '@/services/users';
import { UserProfile } from '@/types/user';

export default function EditProfileScreen() {
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
      <View style={styles.centered}>
        <ThemedText style={styles.loadingText}>A carregar...</ThemedText>
      </View>
    );
  }

  if (profile === null) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.loadingText}>Não foi possível carregar o perfil.</ThemedText>
      </View>
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
    <ScrollView 
      style={styles.scrollView} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        
        <ThemedText style={styles.sectionLabel}>Nome</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="O teu nome"
          placeholderTextColor="#64748B"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <ThemedText style={styles.sectionLabel}>Bio (Opcional)</ThemedText>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Fala um pouco sobre ti e os teus desportos favoritos..."
          placeholderTextColor="#64748B"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed
          ]}
          disabled={submitting}
          onPress={handleSubmit}>
          <ThemedText style={styles.buttonText} type="smallBold">
            {submitting ? 'A guardar...' : 'Guardar alterações'}
          </ThemedText>
        </Pressable>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#0F172A', // Fundo escuro principal
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#64748B',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: Spacing.two,
  },
  input: {
    minHeight: 52, // Mais alto para toque confortável
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12, // Cantos redondos Premium
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  multiline: {
    height: 120,
    paddingTop: 16, // Para o texto não ficar colado ao topo
    textAlignVertical: 'top',
  },
  button: {
    height: 52,
    backgroundColor: '#CF8444', // Laranja de destaque
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    textAlign: 'center',
    color: '#FF6B6B', // Vermelho para erros
    marginTop: Spacing.two,
  },
});