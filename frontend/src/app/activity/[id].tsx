import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import {
  admitFromWaitlist,
  cancelActivity,
  getActivity,
  joinActivity,
  leaveActivity,
  rejectFromWaitlist,
  removeParticipant,
  voteMvp,
} from '@/services/activities';
import { getSport } from '@/services/sports';
import { getUserProfile } from '@/services/users';
import { Activity } from '@/types/activity';
import { Sport } from '@/types/sport';

const STATUS_LABELS: Record<Activity['status'], string> = {
  open: 'Aberta',
  full: 'Completa',
  cancelled: 'Cancelada',
  completed: 'Terminada',
};

// Cores dinâmicas para o estado da atividade
const STATUS_COLORS: Record<Activity['status'], string> = {
  open: '#10B981',      // Verde
  full: '#CF8444',      // Laranja
  cancelled: '#FF6B6B', // Vermelho
  completed: '#64748B', // Cinzento
};

const DIFFICULTY_LABELS: Record<Activity['difficultyLevel'], string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  competitive: 'Competitivo',
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);
  const [sport, setSport] = useState<Sport | null>(null);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
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
    const uids = [...new Set([...activity.participantsList, ...activity.waitlist])];
    if (uids.length === 0) return;
    Promise.allSettled(uids.map((uid) => getUserProfile(uid).then((u) => [uid, u.name] as const)))
      .then((results) => {
        const names = new Map<string, string>();
        for (const r of results) {
          if (r.status === 'fulfilled') names.set(r.value[0], r.value[1]);
        }
        setParticipantNames(names);
      });
  }, [activity]);

  if (activity === undefined) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0F172A' }]}>
        <ThemedText style={{ color: '#64748B' }}>A carregar detalhes...</ThemedText>
      </View>
    );
  }

  if (activity === null) {
    return (
      <View style={[styles.centered, { backgroundColor: '#0F172A' }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#334155" style={{ marginBottom: 8 }} />
        <ThemedText style={{ color: '#64748B' }}>Atividade não encontrada.</ThemedText>
      </View>
    );
  }

  const isParticipant = !!user && activity.participantsList.includes(user.uid);
  const isWaitlisted = !!user && activity.waitlist.includes(user.uid);
  const isCreator = !!user && activity.createdBy === user.uid;
  const isFull = activity.participantsList.length >= activity.maxParticipants;
  const canJoin = activity.status === 'open' || activity.status === 'full';
  const activityDate = new Date(activity.date);

  // --- Votação de MVP (só faz sentido em atividades terminadas) ---
  // Guardamos defesas com `?? {}`/`?? []` porque atividades antigas, criadas
  // antes desta funcionalidade, podem não ter estes campos na base de dados.
  const mvpVotes = activity.mvpVotes ?? {};
  const mvpWinners = activity.mvpWinners ?? [];
  const votingClosed = !!activity.votingClosedAt;
  const myVote = user ? mvpVotes[user.uid] : undefined;
  const hasVoted = !!myVote;
  const canVoteMvp = activity.status === 'completed' && isParticipant && !votingClosed && !hasVoted;
  const otherParticipants = activity.participantsList.filter((pid) => pid !== user?.uid);

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
    // Primeiro toque só marca; segundo toque confirma e envia o voto.
    if (confirmingVote !== votedForId) {
      setConfirmingVote(votedForId);
      return;
    }
    setConfirmingVote(null);
    setError(null);
    setSubmitting(true);
    try {
      await voteMvp(activity!.id, votedForId);
      // O endpoint só devolve uma mensagem, por isso recarregamos a atividade
      // para obter o mvpVotes atualizado (e o vencedor, se a votação fechar).
      const updated = await getActivity(activity!.id);
      setActivity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registar o voto');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView 
      style={{ backgroundColor: '#0F172A' }} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        
        {/* CABEÇALHO */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>{activity.title}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[activity.status] }]}>
              <ThemedText style={styles.statusText}>{STATUS_LABELS[activity.status]}</ThemedText>
            </View>
          </View>
          {activity.description ? (
            <ThemedText style={styles.descriptionText}>{activity.description}</ThemedText>
          ) : null}
        </View>

        {/* CARTÃO DE DETALHES */}
        <View style={styles.card}>
          <Row icon="person-outline" label="Organizador" value={participantNames.get(activity.createdBy) ?? shortId(activity.createdBy)} />
          <Row icon="football-outline" label="Modalidade" value={sport?.name ?? activity.sportId} />
          <Row icon="speedometer-outline" label="Dificuldade" value={DIFFICULTY_LABELS[activity.difficultyLevel]} />
          <Row
            icon="calendar-outline"
            label="Data"
            value={`${activityDate.toLocaleDateString()} às ${activityDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`}
          />
          <Row icon="location-outline" label="Local" value={activity.location.name} />
          {activity.location.address ? <Row icon="map-outline" label="Morada" value={activity.location.address} /> : null}
          <Row
            icon="people-outline"
            label="Vagas"
            value={`${activity.participantsList.length} de ${activity.maxParticipants} preenchidas`}
          />
          {activity.waitlist.length > 0 && (
            <Row icon="time-outline" label="Em espera" value={`${activity.waitlist.length} pessoa(s)`} highlightValue />
          )}
          {activity.requiresApproval && <Row icon="lock-closed-outline" label="Acesso" value="Requer aprovação" />}
        </View>

        {/* AÇÕES PRINCIPAIS */}
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {/* VOTAÇÃO DE MVP (só em atividades terminadas, para participantes) */}
        {activity.status === 'completed' && isParticipant && (
          <View style={styles.card}>
            <View style={styles.voteHeader}>
              <Ionicons name="trophy" size={20} color="#CF8444" />
              <ThemedText style={styles.sectionTitle}>MVP da atividade</ThemedText>
            </View>
            <View style={styles.divider} />

            {votingClosed ? (
              mvpWinners.length > 0 ? (
                <View style={styles.winnerBox}>
                  <ThemedText style={styles.winnerLabel}>
                    {mvpWinners.length === 1 ? 'Vencedor' : 'Empate entre'}
                  </ThemedText>
                  {mvpWinners.map((wid) => (
                    <View key={wid} style={styles.winnerRow}>
                      <Ionicons name="trophy" size={18} color="#CF8444" />
                      <ThemedText style={styles.winnerName}>
                        {participantNames.get(wid) ?? shortId(wid)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <ThemedText style={styles.emptyListText}>A votação terminou sem votos.</ThemedText>
              )
            ) : hasVoted ? (
              <ThemedText style={styles.emptyListText}>
                Já votaste em {participantNames.get(myVote!) ?? shortId(myVote!)}. À espera dos restantes participantes.
              </ThemedText>
            ) : (
              <>
                <ThemedText style={styles.voteHint}>Escolhe o melhor jogador da atividade:</ThemedText>
                {otherParticipants.map((pid) => (
                  <View key={pid} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <Ionicons name="person-circle-outline" size={24} color="#64748B" />
                      <ThemedText style={styles.memberName}>
                        {participantNames.get(pid) ?? shortId(pid)}
                      </ThemedText>
                    </View>
                    <Pressable
                      disabled={submitting}
                      style={styles.voteButton}
                      onPress={() => handleVoteMvp(pid)}>
                      <ThemedText style={styles.voteButtonText}>
                        {confirmingVote === pid ? 'Confirmar' : 'Votar'}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
                {otherParticipants.length === 0 && (
                  <ThemedText style={styles.emptyListText}>Não há outros participantes para votar.</ThemedText>
                )}
              </>
            )}
          </View>
        )}

        {isCreator ? (
          <>
            <ThemedText style={styles.note}>
              És o organizador desta atividade.
            </ThemedText>

            {/* LISTA DE PARTICIPANTES (CRIADOR) */}
            {canJoin && (
              <>
                <View style={styles.card}>
                  <ThemedText style={styles.sectionTitle}>Participantes ({activity.participantsList.length})</ThemedText>
                  <View style={styles.divider} />
                  
                  {activity.participantsList
                    .filter((participantId) => participantId !== activity.createdBy)
                    .map((participantId) => (
                      <View key={participantId} style={styles.memberRow}>
                        <View style={styles.memberInfo}>
                          <Ionicons name="person-circle-outline" size={24} color="#64748B" />
                          <ThemedText style={styles.memberName}>
                            {participantNames.get(participantId) ?? shortId(participantId)}
                          </ThemedText>
                        </View>
                        <Pressable
                          disabled={submitting}
                          style={styles.removeButton}
                          onPress={() => handleRemoveParticipant(participantId)}>
                          <ThemedText style={styles.removeButtonText}>Remover</ThemedText>
                        </Pressable>
                      </View>
                    ))}
                  
                  {activity.participantsList.length <= 1 && (
                    <ThemedText style={styles.emptyListText}>
                      Ainda só tu. Partilha a atividade!
                    </ThemedText>
                  )}
                </View>

                {/* LISTA DE ESPERA */}
                {activity.waitlist.length > 0 && (
                  <View style={styles.card}>
                    <ThemedText style={styles.sectionTitle}>Lista de Espera ({activity.waitlist.length})</ThemedText>
                    <View style={styles.divider} />

                    {activity.waitlist.map((userId) => (
                      <View key={userId} style={styles.memberRow}>
                        <View style={styles.memberInfo}>
                          <Ionicons name="time-outline" size={24} color="#CF8444" />
                          <ThemedText style={styles.memberName}>
                            {participantNames.get(userId) ?? shortId(userId)}
                          </ThemedText>
                        </View>
                        {activity.status === 'open' ? (
                          <View style={styles.waitlistActions}>
                            <Pressable 
                              disabled={submitting} 
                              style={styles.admitButton}
                              onPress={() => handleAdmit(userId)}>
                              <ThemedText style={styles.admitButtonText}>Admitir</ThemedText>
                            </Pressable>
                            <Pressable 
                              disabled={submitting} 
                              style={styles.rejectButton}
                              onPress={() => handleReject(userId)}>
                              <ThemedText style={styles.rejectButtonText}>
                                {confirmingReject === userId ? 'Confirmar' : 'Rejeitar'}
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <ThemedText style={styles.emptyListText}>Atividade completa</ThemedText>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* BOTÕES DO CRIADOR */}
                <Link
                  href={{ pathname: '/edit-activity/[id]', params: { id: activity.id } }}
                  asChild>
                  <Pressable style={({ pressed }) => [styles.button, styles.primaryButton, pressed && styles.pressed]}>
                    <Ionicons name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.primaryButtonText} type="smallBold">
                      Editar atividade
                    </ThemedText>
                  </Pressable>
                </Link>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.dangerButton,
                    pressed && styles.pressed,
                  ]}
                  disabled={submitting}
                  onPress={handleCancel}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" style={{ marginRight: 8 }} />
                  <ThemedText style={styles.dangerButtonText} type="smallBold">
                    {confirmingCancel ? 'Tens a certeza? Toca para confirmar' : 'Cancelar atividade'}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </>
        ) : isParticipant || isWaitlisted ? (
          /* BOTÃO PARA SAIR (PARTICIPANTE) */
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.dangerButton,
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleLeave}>
            <ThemedText style={styles.dangerButtonText} type="smallBold">
              {isWaitlisted ? 'Sair da lista de espera' : 'Sair da atividade'}
            </ThemedText>
          </Pressable>
        ) : canJoin ? (
          /* BOTÃO PARA ENTRAR */
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            disabled={submitting}
            onPress={handleJoin}>
            <ThemedText style={styles.primaryButtonText} type="smallBold">
              {isFull ? 'Entrar na lista de espera' : 'Participar'}
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={styles.note}>
            Esta atividade já não aceita participantes.
          </ThemedText>
        )}

        {/* BOTÕES UTILITÁRIOS */}
        <View style={styles.utilityButtonsRow}>
          {activity.location.lat !== 0 && activity.location.lng !== 0 && (
            <Pressable
              style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${activity.location.lat},${activity.location.lng}`)}>
              <Ionicons name="map-outline" size={20} color="#A0AEC0" />
              <ThemedText style={styles.utilityButtonText}>Ver Mapa</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]}
            onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#A0AEC0" />
            <ThemedText style={styles.utilityButtonText}>Partilhar</ThemedText>
          </Pressable>
        </View>

      </View>
    </ScrollView>
  );
}

// Fallback enquanto o nome carrega ou se o fetch falhar.
function shortId(uid: string) {
  return `Utilizador ${uid.slice(0, 6)}…`;
}

// Componente Row melhorado com ícone
function Row({ icon, label, value, highlightValue = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; highlightValue?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelContainer}>
        <Ionicons name={icon} size={16} color="#64748B" />
        <ThemedText style={styles.rowLabelText}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.rowValueText, highlightValue && { color: '#CF8444', fontWeight: 'bold' }]}>
        {value}
      </ThemedText>
    </View>
  );
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
  headerContainer: {
    marginBottom: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  descriptionText: {
    color: '#CBD5E1',
    fontSize: 15,
    marginTop: Spacing.two,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#334155',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabelText: {
    color: '#A0AEC0',
    fontSize: 14,
  },
  rowValueText: {
    color: '#FFFFFF',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
    paddingLeft: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    color: '#E2E8F0',
    fontSize: 15,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF6B6B20',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyListText: {
    color: '#64748B',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteHint: {
    color: '#A0AEC0',
    fontSize: 14,
    marginBottom: 4,
  },
  voteButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#CF844420',
    borderWidth: 1,
    borderColor: '#CF8444',
  },
  voteButtonText: {
    color: '#CF8444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  winnerBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  winnerLabel: {
    color: '#A0AEC0',
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitlistActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  admitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B98120',
  },
  admitButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rejectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF6B6B20',
  },
  rejectButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: {
    height: 52,
    flexDirection: 'row',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#CF8444',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: '#FF6B6B20',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  dangerButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  utilityButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  utilityButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  utilityButtonText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    textAlign: 'center',
    color: '#FF6B6B',
    marginVertical: 8,
  },
  note: {
    textAlign: 'center',
    color: '#CF8444',
    marginBottom: Spacing.two,
  },
});