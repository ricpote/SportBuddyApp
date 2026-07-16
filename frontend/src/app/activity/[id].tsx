import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AvatarCircle } from '@/components/avatar-circle';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  admitFromWaitlist,
  cancelActivity,
  getActivity,
  joinActivity,
  leaveActivity,
  rateActivity,
  rejectFromWaitlist,
  removeParticipant,
  voteMvp,
} from '@/services/activities';
import { getSport } from '@/services/sports';
import { getUserProfile } from '@/services/users';
import { Activity } from '@/types/activity';
import { Sport } from '@/types/sport';
import { SportIcon } from '@/utils/sport-icon';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Open',
  full: 'Full',
  cancelled: 'Cancelled',
  completed: 'Ended',
};

const STATUS_COLORS: Record<Activity['status'], string> = {
  open: '#9ccd6b',
  full: '#e8823f',
  cancelled: '#eb8f84',
  completed: '#8f8b85',
};

const DIFFICULTY_LABELS: Record<Activity['difficultyLevel'], string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

type MiniProfile = { name: string; avatarUrl?: string };

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [sport, setSport] = useState<Sport | null>(null);
  const [profiles, setProfiles] = useState<Map<string, MiniProfile>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState<string | null>(null);
  const [confirmingVote, setConfirmingVote] = useState<string | null>(null);

  const loadActivity = useCallback(() => {
    if (!id) return;
    getActivity(id)
      .then(setActivity)
      .catch(() => setActivity(null));
  }, [id]);

  useFocusEffect(loadActivity);

  const sportId = activity?.sportId;

  useEffect(() => {
    if (!sportId) return;
    getSport(sportId)
      .then(setSport)
      .catch(() => setSport(null));
  }, [sportId]);

  useEffect(() => {
    if (!activity) return;
    const uids = [...new Set([activity.createdBy, ...activity.participantsList, ...activity.waitlist])];
    if (uids.length === 0) return;
    Promise.allSettled(
      uids.map((uid) =>
        getUserProfile(uid).then((u) => [uid, { name: u.name, avatarUrl: u.avatarUrl }] as const)
      )
    ).then((results) => {
      const map = new Map<string, MiniProfile>();
      for (const r of results) {
        if (r.status === 'fulfilled') map.set(r.value[0], r.value[1]);
      }
      setProfiles(map);
    });
  }, [activity]);

  if (activity === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0a0a0b' }]}>
        <ThemedText style={{ color: '#8f8b85' }}>A carregar detalhes...</ThemedText>
      </View>
    );
  }

  if (activity === null) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0a0a0b' }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#141315" style={{ marginBottom: 8 }} />
        <ThemedText style={{ color: '#8f8b85' }}>Atividade não encontrada.</ThemedText>
      </View>
    );
  }

  const isParticipant = !!user && activity.participantsList.includes(user.uid);
  const isWaitlisted = !!user && activity.waitlist.includes(user.uid);
  const isCreator = !!user && activity.createdBy === user.uid;
  const isFull = activity.participantsList.length >= activity.maxParticipants;
  const canJoin = activity.status === 'open' || activity.status === 'full';
  const activityDate = new Date(activity.date);
  const freeSpots = Math.max(0, activity.maxParticipants - activity.participantsList.length);
  const fillPercent = Math.min(100, (activity.participantsList.length / activity.maxParticipants) * 100);
  const organizerName = profiles.get(activity.createdBy)?.name ?? shortId(activity.createdBy);

  const dateLabel = activityDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  const timeLabel = activityDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  // --- Votação de MVP (só faz sentido em atividades terminadas) ---
  const mvpVotes = activity.mvpVotes ?? {};
  const mvpWinners = activity.mvpWinners ?? [];
  const votingClosed = !!activity.votingClosedAt;
  const myVote = user ? mvpVotes[user.uid] : undefined;
  const hasVoted = !!myVote;
  const otherParticipants = activity.participantsList.filter((pid) => pid !== user?.uid);

  // --- Avaliação da atividade (só faz sentido em atividades terminadas) ---
  const myRating = user ? activity.ratings?.[user.uid] : undefined;

  async function handleShare() {
    const url =
      Platform.OS === 'web'
        ? `${window.location.origin}/activity/${activity!.id}`
        : `sportbuddy://activity/${activity!.id}`;

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: activity!.title, url }).catch(() => {});
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setError('Link copiado para a área de transferência!');
        setTimeout(() => setError(null), 2500);
      }
    } else {
      await Share.share({ message: `${activity!.title}\n${url}` });
    }
  }

  function openDirections() {
    const { lat, lng } = activity!.location;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  }

  async function runAction(action: () => Promise<Activity>, fallbackMessage: string) {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await action();
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function handleJoin() {
    return runAction(() => joinActivity(activity!.id), 'Não foi possível entrar na atividade');
  }

  function handleLeave() {
    if (!confirmingLeave) {
      setConfirmingLeave(true);
      return;
    }
    setConfirmingLeave(false);
    return runAction(() => leaveActivity(activity!.id), 'Não foi possível sair da atividade');
  }

  function handleCancel() {
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      return;
    }
    setConfirmingCancel(false);
    return runAction(() => cancelActivity(activity!.id), 'Não foi possível cancelar a atividade');
  }

  function handleRemoveParticipant(participantId: string) {
    return runAction(
      () => removeParticipant(activity!.id, participantId),
      'Não foi possível remover o participante'
    );
  }

  function handleAdmit(userId: string) {
    setConfirmingReject(null);
    return runAction(
      () => admitFromWaitlist(activity!.id, userId),
      'Não foi possível admitir o utilizador'
    );
  }

  function handleReject(userId: string) {
    if (confirmingReject !== userId) {
      setConfirmingReject(userId);
      return;
    }
    setConfirmingReject(null);
    return runAction(
      () => rejectFromWaitlist(activity!.id, userId),
      'Não foi possível rejeitar o utilizador'
    );
  }

  async function handleVoteMvp(votedForId: string) {
    if (confirmingVote !== votedForId) {
      setConfirmingVote(votedForId);
      return;
    }
    setConfirmingVote(null);
    setError(null);
    setSubmitting(true);
    try {
      await voteMvp(activity!.id, votedForId);
      const updated = await getActivity(activity!.id);
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registar o voto');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRateActivity(rating: number) {
    setError(null);
    setSubmitting(true);
    try {
      await rateActivity(activity!.id, rating);
      const updated = await getActivity(activity!.id);
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registar a avaliação');
    } finally {
      setSubmitting(false);
    }
  }

  function renderParticipantRow(pid: string) {
    const p = profiles.get(pid);
    const isOrganizer = pid === activity!.createdBy;
    return (
      <View key={pid} style={styles.participantRow}>
        <Pressable
          style={({ pressed }) => [styles.participantInfo, pressed && styles.pressed]}
          onPress={() => goToUserProfile(pid)}>
          <AvatarCircle name={p?.name ?? '?'} avatarUrl={p?.avatarUrl} size={36} />
          <ThemedText style={styles.participantName}>{p?.name ?? shortId(pid)}</ThemedText>
          {isOrganizer && <ThemedText style={styles.organizerTag}>· organizador</ThemedText>}
        </Pressable>
        {isCreator && !isOrganizer && canJoin && (
          <Pressable
            disabled={submitting}
            style={styles.removeButton}
            onPress={() => handleRemoveParticipant(pid)}>
            <ThemedText style={styles.removeButtonText}>Remover</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />

      <ScrollView
        style={{ backgroundColor: '#0a0a0b' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>

          {/* HERO: ícone do desporto + título + descrição */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <SportIcon sportName={sport?.name} size={30} color="#1a1005" />
            </View>
            <View style={styles.heroText}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.title}>{activity.title}</ThemedText>
                <View style={styles.pillRow}>
                  {(activity.status === 'open' || activity.status === 'full') ? (
                    <>
                      {activity.requiresApproval ? (
                        <View style={[styles.statusPill, { borderColor: '#8f8b85' }]}>
                          <Ionicons name="lock-closed" size={10} color="#8f8b85" />
                          <ThemedText style={[styles.statusPillText, { color: '#8f8b85' }]}>PRIVATE</ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.statusPill, { borderColor: STATUS_COLORS['open'] }]}>
                          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS['open'] }]} />
                          <ThemedText style={[styles.statusPillText, { color: STATUS_COLORS['open'] }]}>OPEN</ThemedText>
                        </View>
                      )}
                      {activity.status === 'full' && (
                        <View style={[styles.statusPill, { borderColor: '#8f8b85' }]}>
                          <View style={[styles.statusDot, { backgroundColor: '#8f8b85' }]} />
                          <ThemedText style={[styles.statusPillText, { color: '#8f8b85' }]}>FULL</ThemedText>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={[styles.statusPill, { borderColor: STATUS_COLORS[activity.status] }]}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[activity.status] }]} />
                      <ThemedText style={[styles.statusPillText, { color: STATUS_COLORS[activity.status] }]}>
                        {STATUS_LABELS[activity.status].toUpperCase()}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
              {activity.description ? (
                <ThemedText style={styles.descriptionText}>{activity.description}</ThemedText>
              ) : null}
            </View>
          </View>

          {/* BARRA DE INFO: data · dificuldade · vagas */}
          <View style={styles.infoBar}>
            <View style={styles.infoCol}>
              <Ionicons name="calendar-outline" size={18} color="#e8823f" />
              <ThemedText style={styles.infoValue}>{dateLabel}</ThemedText>
              <ThemedText style={styles.infoLabel}>{timeLabel}</ThemedText>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoCol}>
              <Ionicons name="speedometer-outline" size={18} color="#e8823f" />
              <ThemedText style={styles.infoValue}>{DIFFICULTY_LABELS[activity.difficultyLevel]}</ThemedText>
              <ThemedText style={styles.infoLabel}>Dificuldade</ThemedText>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoCol}>
              <Ionicons name="people-outline" size={18} color="#e8823f" />
              <ThemedText style={styles.infoValue}>
                {activity.participantsList.length} / {activity.maxParticipants}
              </ThemedText>
              <ThemedText style={styles.infoLabel}>Vagas</ThemedText>
            </View>
          </View>

          {/* PROGRESSO DAS VAGAS */}
          {canJoin && (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabels}>
                <ThemedText style={styles.progressLeft}>
                  {freeSpots > 0 ? (
                    <>Ainda há <ThemedText style={styles.progressBold}>{freeSpots} vagas</ThemedText></>
                  ) : (
                    'Atividade completa'
                  )}
                </ThemedText>
                <ThemedText style={styles.progressRight}>
                  {activity.participantsList.length} de {activity.maxParticipants} preenchidas
                </ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${fillPercent}%` }]} />
              </View>
            </View>
          )}

          {/* ORGANIZADOR */}
          <Pressable
            onPress={() => goToUserProfile(activity.createdBy)}
            style={({ pressed }) => [styles.organizerCard, pressed && styles.pressed]}>
            <AvatarCircle
              name={organizerName}
              avatarUrl={profiles.get(activity.createdBy)?.avatarUrl}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.organizerLabel}>ORGANIZADOR</ThemedText>
              <View style={styles.organizerNameRow}>
                <ThemedText style={styles.organizerName}>{organizerName}</ThemedText>
                {isCreator && (
                  <View style={styles.youChip}>
                    <ThemedText style={styles.youChipText}>és tu</ThemedText>
                  </View>
                )}
              </View>
            </View>
            {!isCreator && <Ionicons name="chevron-forward" size={20} color="#8f8b85" />}
          </Pressable>

          {/* LOCAL: mini-mapa decorativo + morada + direções */}
          <View style={styles.locationCard}>
            <View style={styles.mapPreview}>
              <View style={styles.mapLine1} />
              <View style={styles.mapLine2} />
              <View style={styles.mapPin}>
                <SportIcon sportName={sport?.name} size={16} color="#1a1005" />
              </View>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={18} color="#e8823f" />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.locationName}>{activity.location.name}</ThemedText>
                {activity.location.address ? (
                  <ThemedText style={styles.locationAddress}>{activity.location.address}</ThemedText>
                ) : null}
              </View>
              {activity.location.lat !== 0 && activity.location.lng !== 0 && (
                <Pressable
                  onPress={openDirections}
                  style={({ pressed }) => [styles.directionsBtn, pressed && styles.pressed]}>
                  <Ionicons name="navigate-outline" size={14} color="#f4f2ef" />
                  <ThemedText style={styles.directionsText}>Direções</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* PARTICIPANTES */}
          <View style={styles.participantsHeader}>
            <ThemedText style={styles.sectionTitle}>
              Participantes <ThemedText style={styles.sectionCount}>{activity.participantsList.length}</ThemedText>
            </ThemedText>
            {freeSpots > 0 && canJoin && (
              <ThemedText style={styles.freeSpotsText}>+ {freeSpots} lugares livres</ThemedText>
            )}
          </View>

          <View style={styles.participantsList}>
            {activity.participantsList.map(renderParticipantRow)}

            {freeSpots > 0 && canJoin && (
              <View style={styles.emptySlotRow}>
                <View style={styles.emptySlotIcon}>
                  <Ionicons name="person-add-outline" size={16} color="#6b6862" />
                </View>
                <ThemedText style={styles.emptySlotText}>
                  {freeSpots} {freeSpots === 1 ? 'lugar à espera' : 'lugares à espera'} de jogadores
                </ThemedText>
              </View>
            )}
          </View>

          {/* LISTA DE ESPERA (organizador) */}
          {isCreator && canJoin && activity.waitlist.length > 0 && (
            <>
              <View style={styles.participantsHeader}>
                <ThemedText style={styles.sectionTitle}>
                  Lista de espera <ThemedText style={styles.sectionCount}>{activity.waitlist.length}</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.participantsList}>
                {activity.waitlist.map((userId) => {
                  const p = profiles.get(userId);
                  return (
                    <View key={userId} style={styles.participantRow}>
                      <Pressable
                        style={({ pressed }) => [styles.participantInfo, pressed && styles.pressed]}
                        onPress={() => goToUserProfile(userId)}>
                        <AvatarCircle name={p?.name ?? '?'} avatarUrl={p?.avatarUrl} size={36} />
                        <ThemedText style={styles.participantName}>{p?.name ?? shortId(userId)}</ThemedText>
                      </Pressable>
                      {activity.status === 'open' && (
                        <View style={styles.waitlistActions}>
                          <Pressable
                            disabled={submitting}
                            style={styles.admitButton}
                            onPress={() => handleAdmit(userId)}>
                            <ThemedText style={styles.admitButtonText}>Admitir</ThemedText>
                          </Pressable>
                          <Pressable
                            disabled={submitting}
                            style={styles.removeButton}
                            onPress={() => handleReject(userId)}>
                            <ThemedText style={styles.removeButtonText}>
                              {confirmingReject === userId ? 'Confirmar' : 'Rejeitar'}
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* VOTAÇÃO DE MVP (atividades terminadas, para participantes) */}
          {activity.status === 'completed' && isParticipant && (
            <View style={styles.mvpCard}>
              <View style={styles.mvpHeader}>
                <Ionicons name="trophy" size={20} color="#e8823f" />
                <ThemedText style={styles.sectionTitle}>MVP da atividade</ThemedText>
              </View>

              {votingClosed ? (
                mvpWinners.length > 0 ? (
                  <View style={styles.winnerBox}>
                    <ThemedText style={styles.winnerLabel}>
                      {mvpWinners.length === 1 ? 'Vencedor' : 'Empate entre'}
                    </ThemedText>
                    {mvpWinners.map((wid) => (
                      <View key={wid} style={styles.winnerRow}>
                        <Ionicons name="trophy" size={18} color="#e8823f" />
                        <ThemedText style={styles.winnerName}>
                          {profiles.get(wid)?.name ?? shortId(wid)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <ThemedText style={styles.emptyListText}>A votação terminou sem votos.</ThemedText>
                )
              ) : hasVoted ? (
                <ThemedText style={styles.emptyListText}>
                  Já votaste em {profiles.get(myVote!)?.name ?? shortId(myVote!)}. À espera dos restantes participantes.
                </ThemedText>
              ) : (
                <>
                  <ThemedText style={styles.voteHint}>Escolhe o melhor jogador da atividade:</ThemedText>
                  {otherParticipants.map((pid) => {
                    const p = profiles.get(pid);
                    return (
                      <View key={pid} style={styles.participantRow}>
                        <Pressable
                          style={({ pressed }) => [styles.participantInfo, pressed && styles.pressed]}
                          onPress={() => goToUserProfile(pid)}>
                          <AvatarCircle name={p?.name ?? '?'} avatarUrl={p?.avatarUrl} size={36} />
                          <ThemedText style={styles.participantName}>{p?.name ?? shortId(pid)}</ThemedText>
                        </Pressable>
                        <Pressable
                          disabled={submitting}
                          style={styles.voteButton}
                          onPress={() => handleVoteMvp(pid)}>
                          <ThemedText style={styles.voteButtonText}>
                            {confirmingVote === pid ? 'Confirmar' : 'Votar'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    );
                  })}
                  {otherParticipants.length === 0 && (
                    <ThemedText style={styles.emptyListText}>Não há outros participantes para votar.</ThemedText>
                  )}
                </>
              )}
            </View>
          )}

          {/* AVALIAÇÃO DA ATIVIDADE (atividades terminadas, para participantes) */}
          {activity.status === 'completed' && isParticipant && (
            <View style={styles.mvpCard}>
              <View style={styles.mvpHeader}>
                <Ionicons name="star" size={20} color="#e8823f" />
                <ThemedText style={styles.sectionTitle}>Avaliar a atividade</ThemedText>
              </View>

              {myRating ? (
                <ThemedText style={styles.emptyListText}>
                  Já avaliaste esta atividade com {myRating} {myRating === 1 ? 'estrela' : 'estrelas'}. Obrigado!
                </ThemedText>
              ) : (
                <>
                  <ThemedText style={styles.voteHint}>Como avalias esta atividade?</ThemedText>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable
                        key={n}
                        disabled={submitting}
                        style={({ pressed }) => [pressed && styles.pressed]}
                        onPress={() => handleRateActivity(n)}>
                        <Ionicons name="star-outline" size={32} color="#e8823f" />
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {/* AÇÕES PRINCIPAIS */}
          <View style={styles.actionsDivider} />

          {isParticipant || isWaitlisted ? (
            <>
              <View style={styles.actionsRow}>
                {isParticipant && activity.status !== 'cancelled' && (
                  <Pressable
                    onPress={() => router.push({ pathname: '/chat/[id]', params: { id: activity.id } })}
                    style={({ pressed }) => [styles.chatButton, pressed && styles.pressed]}>
                    <Ionicons name="chatbubble-outline" size={18} color="#1a1005" />
                    <ThemedText style={styles.chatButtonText}>Abrir chat</ThemedText>
                  </Pressable>
                )}

                {isCreator && canJoin && (
                  <Pressable
                    onPress={() => router.push({ pathname: '/edit-activity/[id]', params: { id: activity.id } })}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <Ionicons name="pencil-outline" size={16} color="#f4f2ef" />
                    <ThemedText style={styles.secondaryButtonText}>Editar</ThemedText>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Ionicons name="share-outline" size={16} color="#f4f2ef" />
                  <ThemedText style={styles.secondaryButtonText}>Partilhar</ThemedText>
                </Pressable>
              </View>

              {canJoin && (
                isCreator ? (
                  <Pressable
                    disabled={submitting}
                    onPress={handleCancel}
                    style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
                    <Ionicons name="trash-outline" size={16} color="#eb8f84" />
                    <ThemedText style={styles.dangerButtonText}>
                      {confirmingCancel ? 'Are you sure? Tap to confirm' : 'Cancel activity'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    disabled={submitting}
                    onPress={handleLeave}
                    style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
                    <Ionicons name="exit-outline" size={16} color="#eb8f84" />
                    <ThemedText style={styles.dangerButtonText}>
                      {confirmingLeave
                        ? 'Are you sure? Tap to confirm'
                        : isWaitlisted
                          ? (activity.requiresApproval ? 'Cancel request' : 'Leave waitlist')
                          : 'Leave activity'}
                    </ThemedText>
                  </Pressable>
                )
              )}
            </>
          ) : canJoin ? (
            <View style={styles.actionsRow}>
              <Pressable
                disabled={submitting}
                onPress={handleJoin}
                style={({ pressed }) => [styles.chatButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={20} color="#1a1005" />
                <ThemedText style={styles.chatButtonText}>
                  {activity.requiresApproval ? 'Request to Join' : isFull ? 'Join Waitlist' : 'Join'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Ionicons name="share-outline" size={16} color="#f4f2ef" />
                <ThemedText style={styles.secondaryButtonText}>Partilhar</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ThemedText style={styles.note}>Esta atividade já não aceita participantes.</ThemedText>
          )}
        </View>
      </ScrollView>
    </>
  );
}

// Fallback enquanto o nome carrega ou se o fetch falhar.
function shortId(uid: string) {
  return `Utilizador ${uid.slice(0, 6)}…`;
}

function goToUserProfile(userId: string) {
  router.push({ pathname: '/user/[id]', params: { id: userId } });
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.six,
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

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: Spacing.two,
    backgroundColor: '#111012',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },

  hero: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#e8823f',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  title: {
    color: '#f4f2ef',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  descriptionText: {
    color: '#c9c5bf',
    fontSize: 14,
    lineHeight: 20,
  },

  infoBar: {
    flexDirection: 'row',
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.three,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  infoValue: { color: '#f4f2ef', fontSize: 15, fontWeight: 'bold' },
  infoLabel: { color: '#8f8b85', fontSize: 12 },

  progressBlock: { gap: 6 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLeft: { color: '#c9c5bf', fontSize: 13 },
  progressBold: { color: '#f4f2ef', fontSize: 13, fontWeight: 'bold' },
  progressRight: { color: '#8f8b85', fontSize: 12 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1c1a1d',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#e8823f',
  },

  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
  },
  organizerLabel: { color: '#8f8b85', fontSize: 11, letterSpacing: 1 },
  organizerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  organizerName: { color: '#e8823f', fontSize: 16, fontWeight: 'bold' },
  youChip: {
    backgroundColor: 'rgba(232,130,63,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youChipText: { color: '#e8823f', fontSize: 11, fontWeight: 'bold' },

  locationCard: {
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  mapPreview: {
    height: 110,
    backgroundColor: '#0d120e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Linhas decorativas a sugerir um campo/mapa
  mapLine1: {
    position: 'absolute',
    width: 380,
    height: 200,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: 'rgba(156,205,107,0.12)',
    top: 40,
    left: -60,
  },
  mapLine2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(156,205,107,0.10)',
    top: -120,
    right: -40,
  },
  mapPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderBottomRightRadius: 4,
    backgroundColor: '#e8823f',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  locationName: { color: '#f4f2ef', fontSize: 14, fontWeight: 'bold' },
  locationAddress: { color: '#8f8b85', fontSize: 12 },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  directionsText: { color: '#f4f2ef', fontSize: 13, fontWeight: 'bold' },

  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  sectionTitle: { color: '#f4f2ef', fontSize: 17, fontWeight: 'bold' },
  sectionCount: { color: '#8f8b85', fontSize: 17, fontWeight: 'bold' },
  freeSpotsText: { color: '#8f8b85', fontSize: 12 },

  participantsList: { gap: Spacing.two },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111012',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  participantName: { color: '#f4f2ef', fontSize: 15, fontWeight: '600' },
  organizerTag: { color: '#8f8b85', fontSize: 12 },

  emptySlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  emptySlotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141315',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: { color: '#6b6862', fontSize: 13 },

  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(235,143,132,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(235,143,132,0.4)',
  },
  removeButtonText: { color: '#eb8f84', fontSize: 12, fontWeight: 'bold' },
  waitlistActions: { flexDirection: 'row', gap: Spacing.two },
  admitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(156,205,107,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(156,205,107,0.4)',
  },
  admitButtonText: { color: '#9ccd6b', fontSize: 12, fontWeight: 'bold' },

  mvpCard: {
    backgroundColor: '#111012',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  mvpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 4 },
  voteHint: { color: '#c9c5bf', fontSize: 14 },
  voteButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(232,130,63,0.12)',
    borderWidth: 1,
    borderColor: '#e8823f',
  },
  voteButtonText: { color: '#e8823f', fontSize: 12, fontWeight: 'bold' },
  winnerBox: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  winnerLabel: {
    color: '#c9c5bf',
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winnerName: { color: '#f4f2ef', fontSize: 18, fontWeight: 'bold' },
  emptyListText: {
    color: '#8f8b85',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  actionsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  chatButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 140,
    height: 52,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8823f',
  },
  chatButtonText: { color: '#1a1005', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    height: 52,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: '#111012',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  secondaryButtonText: { color: '#f4f2ef', fontSize: 14, fontWeight: 'bold' },
  dangerButton: {
    height: 52,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(235,143,132,0.10)',
    borderWidth: 1,
    borderColor: '#eb8f84',
  },
  dangerButtonText: { color: '#eb8f84', fontSize: 15, fontWeight: 'bold' },
  dangerLink: {
    color: '#eb8f84',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  note: {
    textAlign: 'center',
    color: '#8f8b85',
  },
  error: {
    textAlign: 'center',
    color: '#eb8f84',
  },
  pressed: { opacity: 0.7 },
});
