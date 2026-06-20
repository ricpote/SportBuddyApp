import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getUserProfile } from '@/services/users';
import { PublicUser } from '@/types/user';

function avatarColor(userId: string): string {
  const colors = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const theme = useTheme();
  const [profile, setProfile] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getUserProfile(id).then(setProfile).catch(() => setProfile(null));
  }, [id]);

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
        <ThemedText themeColor="textSecondary">Utilizador não encontrado.</ThemedText>
      </ThemedView>
    );
  }

  const isMe = me?.uid === id;
  const initial = profile.name.trim().charAt(0).toUpperCase();
  const color = avatarColor(id!);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <ThemedText style={styles.avatarText}>{initial}</ThemedText>
          </View>
          <ThemedText type="title">{profile.name}</ThemedText>
          {profile.bio ? (
            <ThemedText themeColor="textSecondary" style={styles.bio}>{profile.bio}</ThemedText>
          ) : null}
        </View>

        <ThemedView type="backgroundElement" style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText type="smallBold">{profile.stats.activitiesCreated}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Criadas</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText type="smallBold">{profile.stats.activitiesJoined}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Participadas</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText type="smallBold">{profile.stats.mvpVotesReceived}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">MVPs</ThemedText>
          </View>
        </ThemedView>

        {!isMe && (
          <ThemedView
            type="backgroundElement"
            style={[styles.friendBtn, { borderColor: theme.backgroundSelected }]}>
            <Ionicons name="person-add-outline" size={18} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" type="smallBold">
              Adicionar amigo (em breve)
            </ThemedText>
          </ThemedView>
        )}
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
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bio: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#00000020',
    marginVertical: Spacing.one,
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
