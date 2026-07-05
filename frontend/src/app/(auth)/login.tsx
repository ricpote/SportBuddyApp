import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar sessão');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      <SafeAreaView style={styles.safeArea}>

        {/* O teu Logótipo Personalizado */}
        <Image
          source={require('../../../assets/images/sportbuddyIcon.png')}
          style={styles.logoIcon}
          resizeMode="contain"
        />

        <ThemedText type="title" style={styles.title}>
          SportBuddy
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Inicia sessão para continuar
        </ThemedText>

        <View style={styles.form}>

          {/* Caixa do Email com Ícone */}
          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Caixa da Palavra-passe com Ícone */}
          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Palavra-passe"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && (
            <ThemedText themeColor="text" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {/* Botão com o teu Laranja Principal */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: '#CF8444' },
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleSubmit}>
            <ThemedText style={{ color: '#0F172A' }} type="smallBold">
              {submitting ? 'A entrar...' : 'Entrar'}
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.pressed,
            ]}
            onPress={signInWithGoogle}>
            <Ionicons name="logo-google" size={20} color="#0F172A" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: '#0F172A' }} type="smallBold">
              Entrar com Google
            </ThemedText>
          </Pressable>

          <Link href="/register" asChild>
            <Pressable style={styles.linkPressable}>
              <ThemedText type="link" themeColor="textSecondary">
                Não tens conta? <ThemedText style={{ color: '#CF8444' }}>Regista-te</ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  logoIcon: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    color: '#CF8444', // Laranja do teu logótipo
  },
  subtitle: {
    textAlign: 'center',
    color: '#A0AEC0', // Um cinzento claro para se ver bem no fundo escuro
    marginBottom: Spacing.four,
  },
  form: {
    gap: Spacing.three,
  },
  /* Nova estrutura para as caixas de texto com ícones */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%', // Garante que a zona de clique ocupa toda a caixa
  },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.8,
  },
  googleButton: {
    height: 48,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  error: {
    textAlign: 'center',
    color: '#FF6B6B',
  },
  linkPressable: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});