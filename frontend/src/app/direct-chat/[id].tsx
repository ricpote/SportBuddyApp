import { Stack, useLocalSearchParams } from 'expo-router';
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
import { AvatarCircle } from '@/components/avatar-circle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useChatBadge } from '@/contexts/chat-badge-context';
import { getDirectMessages, sendDirectMessage } from '@/services/conversations';
import { DirectMessage } from '@/types/message';

const POLL_INTERVAL_MS = 4000;

export default function DirectChatScreen() {
  const { id, name, avatarUrl } = useLocalSearchParams<{ id: string; name?: string; avatarUrl?: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { markRead } = useChatBadge();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<DirectMessage>>(null);
  const latestCountRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    markRead(id);
  }, [id, markRead]);

  useEffect(() => {
    if (!id) return;

    function fetchMessages() {
      getDirectMessages(id!)
        .then((data) => {
          setMessages(data);
          if (data.length > latestCountRef.current) {
            latestCountRef.current = data.length;
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
            // Estamos com o chat aberto, por isso o que chega fica logo visto
            markRead(id!);
          }
        })
        .catch(() => {});
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id, markRead]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !id) return;

    setSending(true);
    setError(null);
    try {
      const msg = await sendDirectMessage(id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText('');
      latestCountRef.current += 1;
      markRead(id);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  }

  function renderMessage({ item }: { item: DirectMessage }) {
    const isOwn = item.senderId === user?.uid;

    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
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
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Nome (e foto) do amigo no topo em vez de "Chat" genérico */}
      {name ? (
        <Stack.Screen
          options={{
            headerTitle: () => (
              <View style={styles.headerTitle}>
                <AvatarCircle name={name} avatarUrl={avatarUrl} size={32} />
                <ThemedText type="smallBold" style={styles.headerTitleText} numberOfLines={1}>
                  {name}
                </ThemedText>
              </View>
            ),
          }}
        />
      ) : null}
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
    backgroundColor: '#0F172A',
  },
  centered: {
    alignItems: 'center',
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitleText: {
    color: '#FFFFFF',
    maxWidth: 180,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubbleInner: {
    maxWidth: '75%',
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
});
