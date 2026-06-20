import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { getActivity } from '@/services/activities';
import { getMessages, sendMessage } from '@/services/messages';
import { getUserProfile } from '@/services/users';
import { Activity } from '@/types/activity';
import { Message } from '@/types/message';
import { PublicUser } from '@/types/user';

const POLL_INTERVAL_MS = 4000;

function avatarColor(userId: string): string {
  const colors = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { markRead } = useChatBadge();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [profiles, setProfiles] = useState<Map<string, PublicUser>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const latestCountRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    markRead(id);
  }, [id, markRead]);

  useEffect(() => {
    if (!id) return;
    getActivity(id)
      .then((a) => {
        setActivity(a);
        Promise.allSettled(a.participantsList.map((uid) => getUserProfile(uid))).then((results) => {
          const map = new Map<string, PublicUser>();
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') map.set(a.participantsList[i], r.value);
          });
          setProfiles(map);
        });
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;

    function fetchMessages() {
      getMessages(id!)
        .then((data) => {
          setMessages(data);
          if (data.length > latestCountRef.current) {
            latestCountRef.current = data.length;
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          }
        })
        .catch(() => {});
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !id) return;

    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText('');
      latestCountRef.current += 1;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isOwn = item.senderId === user?.uid;
    const profile = profiles.get(item.senderId);
    const initial = (profile?.name ?? '?').charAt(0).toUpperCase();
    const color = avatarColor(item.senderId);

    const prev = messages[index - 1];
    const showAvatar = !isOwn && item.senderId !== prev?.senderId;
    const showName = !isOwn && item.senderId !== prev?.senderId;

    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        {!isOwn && (
          <Pressable
            style={[styles.avatar, { backgroundColor: showAvatar ? color : 'transparent' }]}
            onPress={() => showAvatar && router.push({ pathname: '/user/[id]', params: { id: item.senderId } })}>
            {showAvatar && (
              <ThemedText style={styles.avatarText}>{initial}</ThemedText>
            )}
          </Pressable>
        )}

        <View style={[styles.bubbleCol, isOwn && { alignItems: 'flex-end' }]}>
          {showName && profile && (
            <ThemedText style={styles.senderName}>
              {profile.name}
            </ThemedText>
          )}
          <View
            style={[
              styles.bubbleInner,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
            ]}>
            <ThemedText style={{ color: isOwn ? '#FFFFFF' : '#E2E8F0', fontSize: 15 }}>
              {item.text}
            </ThemedText>
            <ThemedText style={[styles.bubbleTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : '#94A3B8' }]}>
              {new Date(item.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={[styles.flex, styles.centered]}>
        <View style={[styles.flex, { width: '100%', maxWidth: MaxContentWidth }]}>
          
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText style={styles.empty}>
                Sem mensagens ainda. Diz olá! 👋
              </ThemedText>
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {error && (
            <ThemedText style={styles.error}>{error}</ThemedText>
          )}

          {activity?.status === 'completed' && (
            <View style={styles.completedBanner}>
              <ThemedText type="small" style={styles.completedText}>
                Atividade terminada — podes continuar a conversar com o grupo.
              </ThemedText>
            </View>
          )}

          <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.two }]}>
            <TextInput
              style={styles.input}
              placeholder="Escreve uma mensagem..."
              placeholderTextColor="#64748B"
              value={text}
              onChangeText={setText}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                { opacity: (!text.trim() || sending) ? 0.4 : pressed ? 0.7 : 1 },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}>
              <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
          
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    backgroundColor: '#0F172A' 
  },
  centered: { 
    alignItems: 'center' 
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginVertical: 4,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2, // Alinhar ligeiramente com a base do balão
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bubbleCol: {
    maxWidth: '75%',
    gap: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#A0AEC0',
    marginLeft: 4,
  },
  bubbleInner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: '#CF8444', // Laranja do utilizador
    borderBottomRightRadius: 4, // Cauda do balão à direita
  },
  bubbleOther: {
    backgroundColor: '#1E293B', // Cinzento escuro do remetente
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomLeftRadius: 4, // Cauda do balão à esquerda
  },
  bubbleTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
    backgroundColor: '#0F172A', // Garante que a zona do input não é transparente
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 20,
    paddingTop: 14, // Alinha verticalmente com o botão de enviar
    paddingBottom: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#CF8444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#FF6B6B',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  completedBanner: {
    backgroundColor: '#10B98120',
    borderTopWidth: 1,
    borderTopColor: '#10B981',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  completedText: {
    color: '#10B981',
    textAlign: 'center',
    fontSize: 13,
  },
});