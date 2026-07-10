import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

const BG = '#0F172A';
const ORANGE = '#CF8444';
const TEXT = '#FFFFFF';
const TEXT_SEC = '#A0AEC0';
const ERROR = '#FF6B6B';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.orb, styles.orb1, { filter: 'blur(120px)' } as any]} />
        <View style={[styles.orb, styles.orb2, { filter: 'blur(140px)' } as any]} />
        <View style={[styles.orb, styles.orb3, { filter: 'blur(100px)' } as any]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navbar}>
          <View style={styles.navBrand}>
            <Image
              source={require('../../../assets/images/sportbuddyIcon.png')}
              style={styles.navLogo}
              resizeMode="contain"
            />
            <ThemedText style={styles.navTitle}>SportBuddy</ThemedText>
          </View>
          <View style={styles.navLinks}>
            <Pressable style={styles.navLinkPressable}>
              <ThemedText style={styles.navLink}>Sobre</ThemedText>
            </Pressable>
            <Pressable style={styles.navLinkPressable}>
              <ThemedText style={styles.navLink}>Contacto</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.center}>
          <View style={[styles.card, { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any]}>
            <Image
              source={require('../../../assets/images/sportbuddyIcon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText type="title" style={styles.title}>SportBuddy</ThemedText>
            <ThemedText style={styles.subtitle}>Cria a tua conta</ThemedText>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={TEXT_SEC} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { outline: 'none' } as any]}
                  placeholder="Nome"
                  placeholderTextColor={TEXT_SEC}
                  autoCapitalize="words"
                  autoComplete="name"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={TEXT_SEC} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { outline: 'none' } as any]}
                  placeholder="Email"
                  placeholderTextColor={TEXT_SEC}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={TEXT_SEC} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { outline: 'none' } as any]}
                  placeholder="Palavra-passe"
                  placeholderTextColor={TEXT_SEC}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={TEXT_SEC} />
                </Pressable>
              </View>

              {error && <ThemedText style={styles.error}>{error}</ThemedText>}

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                disabled={submitting}
                onPress={handleSubmit}>
                <ThemedText style={styles.buttonText} type="smallBold">
                  {submitting ? 'A criar conta...' : 'Criar conta'}
                </ThemedText>
              </Pressable>

              <Link href="/login" asChild>
                <Pressable style={styles.linkPressable}>
                  <ThemedText style={styles.linkText}>
                    Já tens conta?{' '}
                    <ThemedText style={styles.linkHighlight}>Inicia sessão</ThemedText>
                  </ThemedText>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>© 2026 SportBuddy · Termos · Privacidade</ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  safeArea: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: 500,
    height: 500,
    top: -180,
    left: -180,
    backgroundColor: ORANGE,
    opacity: 0.18,
  },
  orb2: {
    width: 600,
    height: 600,
    bottom: -220,
    right: -220,
    backgroundColor: ORANGE,
    opacity: 0.14,
  },
  orb3: {
    width: 350,
    height: 350,
    top: '35%',
    right: -120,
    backgroundColor: '#6366F1',
    opacity: 0.1,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  navLogo: {
    width: 32,
    height: 32,
  },
  navTitle: {
    color: ORANGE,
    fontWeight: 'bold',
    fontSize: 18,
  },
  navLinks: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  navLinkPressable: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  navLink: {
    color: TEXT_SEC,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
    color: ORANGE,
  },
  subtitle: {
    textAlign: 'center',
    color: TEXT_SEC,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  form: {
    gap: Spacing.three,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: TEXT,
    height: '100%',
    outlineWidth: 0,
  },
  button: {
    height: 52,
    backgroundColor: ORANGE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: BG,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.75,
  },
  error: {
    textAlign: 'center',
    color: ERROR,
  },
  linkPressable: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  linkText: {
    color: TEXT_SEC,
    fontSize: 14,
  },
  linkHighlight: {
    color: ORANGE,
    fontWeight: 'bold',
  },
  footer: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  footerText: {
    color: TEXT_SEC,
    fontSize: 12,
    opacity: 0.5,
  },
});
