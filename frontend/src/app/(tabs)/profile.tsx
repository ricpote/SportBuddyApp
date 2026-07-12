import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { BadgesSection } from '@/components/badges-section';
import { MaxContentWidth, Spacing, TopTabInset, BottomTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { usePendingWaitlist } from '@/contexts/pending-waitlist-context';
import { getMyActivities } from '@/services/activities';
import { uploadMyAvatar } from '@/services/users';
import { Activity } from '@/types/activity';
import { relativeDate } from '@/utils/date';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

async function compressImageDataUrl(dataUrl: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      const maxSize = 192;
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Nao foi possivel processar a imagem'));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };

    image.onerror = () => reject(new Error('Nao foi possivel processar a imagem'));
    image.src = dataUrl;
  });
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const safeAreaInsets = useSafeAreaInsets();
  const { pendingCount, refresh: refreshBadge } = usePendingWaitlist();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'past'>('all');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyActivities()
        .then((data) => { setActivities(data); refreshBadge(); })
        .catch(() => setActivities(null));
    }, [refreshBadge])
  );

  const myActivities = (activities ?? []).filter((a) => {
    if (activityFilter === 'active') return a.status === 'open' || a.status === 'full';
    if (activityFilter === 'past') return a.status === 'completed' || a.status === 'cancelled';
    return true;
  });

  const createdCount = profile?.stats.activitiesCreated ?? 0;
  const joinedCount = profile?.stats.activitiesJoined ?? 0;

  // Função para escolher imagem da galeria
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setUploadingAvatar(true);

        const mimeType = result.assets[0].mimeType ?? 'image/jpeg';
        const rawImageData = `data:${mimeType};base64,${result.assets[0].base64}`;
        const imageData = await compressImageDataUrl(rawImageData);
        await uploadMyAvatar(imageData);
        await refreshProfile();
      }
    } catch (error) {
      console.log('Erro ao selecionar imagem:', error);
      setUploadingAvatar(false);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: '#0a0a0b' }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: safeAreaInsets.top + TopTabInset + Spacing.four,
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
        },
      ]}>
      <View style={styles.container}>
        
        {/* CARTÃO PRINCIPAL DE PERFIL */}
        <View style={styles.profileMainCard}>
          
          {/* IMAGEM + INFO */}
          <View style={styles.profileHeaderRow}>
            {/* Imagem de Perfil Circular */}
            <Pressable onPress={handlePickImage} style={styles.imageWrapper} disabled={uploadingAvatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="person" size={36} color="#8f8b85" />
                </View>
              )}
              <View style={styles.onlineBadge} />
              <View style={styles.editImageBadge}>
                <Ionicons name="camera" size={12} color="#f4f2ef" />
              </View>
            </Pressable>

            {/* Nome e Detalhes */}
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <ThemedText style={styles.profileName} numberOfLines={1}>
                  {profile?.name ?? user?.displayName ?? '—'}
                </ThemedText>
                <Link href="/edit-profile" asChild>
                  <Pressable hitSlop={10}>
                    <Ionicons name="pencil" size={16} color="#c9c5bf" />
                  </Pressable>
                </Link>
              </View>

              <ThemedText style={styles.profileEmail}>{profile?.email ?? user?.email}</ThemedText>
              <ThemedText style={styles.profileRole}>
                Função: {profile?.role ?? 'participant'}
              </ThemedText>
              {uploadingAvatar && (
                <ThemedText style={styles.uploadingText}>A guardar foto...</ThemedText>
              )}
            </View>
          </View>

          {/* BIO (Se o utilizador tiver preenchido) */}
          {profile?.bio ? (
            <>
              <View style={styles.divider} />
              <ThemedText style={styles.bioText}>
                {profile.bio}
              </ThemedText>
            </>
          ) : null}

        </View>

        {/* ESTATÍSTICAS EM GRELHA (Cartões Individuais) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={20} color="#e8823f" />
            <ThemedText style={styles.statValue}>{joinedCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Participadas</ThemedText>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color="#9ccd6b" />
            <ThemedText style={styles.statValue}>{createdCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Organizadas</ThemedText>
          </View>
        </View>

        <BadgesSection />

        {/* ALERTAS */}
        {pendingCount > 0 && (
          <View style={[styles.card, styles.pendingCard]}>
            <ThemedText type="smallBold" style={styles.pendingText}>
              {pendingCount === 1 ? '1 atividade com pedidos na lista de espera' : `${pendingCount} atividades com pedidos na lista de espera`}
            </ThemedText>
            <ThemedText type="small" style={styles.pendingSubText}>Abre a atividade para admitir ou rejeitar.</ThemedText>
          </View>
        )}

        {/* TABS DE ATIVIDADES */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Histórico</ThemedText>
        <View style={styles.filterRow}>
          {(['all', 'active', 'past'] as const).map((f) => {
            const isActive = activityFilter === f;
            return (
              <Pressable key={f} onPress={() => setActivityFilter(f)}>
                <View style={[styles.filterChip, isActive && styles.filterChipActive]}>
                  <ThemedText type="small" style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Passadas'}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* LISTA DE ATIVIDADES */}
        {activities === null && (
          <ThemedText style={styles.emptyText}>A carregar...</ThemedText>
        )}

        {activities !== null && myActivities.length === 0 && (
          <ThemedText style={styles.emptyText}>
            Ainda não participas em nenhuma atividade.
          </ThemedText>
        )}

        <View style={styles.list}>
          {myActivities.map((activity) => (
            <Link
              key={activity.id}
              href={{ pathname: '/activity/[id]', params: { id: activity.id } }}
              asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.activityCard}>
                  <ThemedText type="smallBold" style={styles.activityTitle}>{activity.title}</ThemedText>
                  <ThemedText type="small" style={styles.activitySubText}>
                    {relativeDate(activity.date)} · {STATUS_LABELS[activity.status]}
                    {user && activity.createdBy === user.uid
                      ? ' · Organizador'
                      : user && activity.waitlist.includes(user.uid)
                        ? ' · Em lista de espera'
                        : ''}
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>

        {/* BOTÃO DE LOGOUT */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
          onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#eb8f84" style={{ marginRight: 6 }} />
          <ThemedText type="smallBold" style={{ color: '#eb8f84' }}>Terminar sessão</ThemedText>
        </Pressable>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#111012',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  
  /* ESTILOS DO CARTÃO PRINCIPAL */
  profileMainCard: {
    backgroundColor: '#111012',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#141315',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#9ccd6b',
    borderWidth: 2,
    borderColor: '#111012',
  },
  editImageBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e8823f',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111012',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    color: '#f4f2ef',
    fontSize: 22,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  profileEmail: {
    color: '#c9c5bf',
    fontSize: 14,
    marginBottom: 4,
  },
  profileRole: {
    color: '#e8823f',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  uploadingText: {
    color: '#8f8b85',
    fontSize: 12,
    marginTop: 4,
  },
  
  /* ESTILOS DA BIO */
  divider: {
    height: 1,
    backgroundColor: '#141315',
    marginTop: 16,
    marginBottom: 12,
  },
  bioText: {
    color: '#c9c5bf',
    fontSize: 14,
    lineHeight: 20,
  },

  /* ESTILOS DA GRELHA DE ESTATÍSTICAS */
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111012',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  statValue: {
    color: '#f4f2ef',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#c9c5bf',
    fontSize: 12,
  },

  /* RESTANTES ESTILOS */
  sectionTitle: {
    color: '#f4f2ef',
    marginTop: Spacing.two,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235,143,132,0.15)',
    borderWidth: 1,
    borderColor: '#eb8f84',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  pendingCard: {
    backgroundColor: 'rgba(232,130,63,0.12)',
    borderColor: '#e8823f',
    alignItems: 'center',
  },
  pendingText: {
    color: '#e8823f',
    textAlign: 'center',
  },
  pendingSubText: {
    color: '#e8823f',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterChip: {
    backgroundColor: '#111012',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChipActive: {
    backgroundColor: '#e8823f',
    borderColor: '#e8823f',
  },
  filterText: {
    color: '#c9c5bf',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#1a1005',
  },
  emptyText: {
    color: '#8f8b85',
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  activityCard: {
    backgroundColor: '#111012',
    borderRadius: 12,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  activityTitle: {
    color: '#e8823f',
    fontSize: 16,
  },
  activitySubText: {
    color: '#c9c5bf',
  },
});
