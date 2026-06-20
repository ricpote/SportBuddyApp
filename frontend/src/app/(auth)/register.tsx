import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Preenche todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A palavra-passe tem de ter pelo menos 6 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* CABEÇALHO */}
        <ThemedText type="title" style={styles.title}>
          Criar conta
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Junta-te ao SportBuddy
        </ThemedText>

        {/* FORMULÁRIO */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor="#64748B"
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Palavra-passe"
            placeholderTextColor="#64748B"
            secureTextEntry
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
          />

          {/* MENSAGEM DE ERRO */}
          {error && (
            <ThemedText style={styles.error}>
              {error}
            </ThemedText>
          )}

          {/* BOTÃO DE REGISTO */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleSubmit}>
            <ThemedText style={styles.buttonText} type="smallBold">
              {submitting ? 'A criar conta...' : 'Criar conta'}
            </ThemedText>
          </Pressable>

          {/* LINK PARA LOGIN */}
          <Link href="/login" asChild>
            <Pressable style={styles.linkPressable}>
              <ThemedText style={styles.linkText}>
                Já tens conta? <ThemedText style={styles.linkHighlight}>Inicia sessão</ThemedText>
              </ThemedText>
            </Pressable>
          </Link>
        </View>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Fundo escuro principal
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    color: '#A0AEC0', // Texto secundário (cinzento)
    marginBottom: Spacing.four,
  },
  form: {
    gap: Spacing.three,
  },
  input: {
    height: 52, // Ligeiramente mais alto para ser mais fácil clicar no telemóvel
    backgroundColor: '#1E293B', // Fundo do input
    borderWidth: 1,
    borderColor: '#334155', // Borda subtil
    borderRadius: 12, // Cantos arredondados iguais aos da HomeScreen
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF', // Texto digitado a branco
  },
  button: {
    height: 52,
    backgroundColor: '#CF8444', // Laranja SportBuddy
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
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
    color: '#FF6B6B', // Vermelho suave para os erros
    marginTop: 4,
  },
  linkPressable: {
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
  },
  linkText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#CF8444', // Laranja no "Inicia sessão"
    fontWeight: 'bold',
  },
});