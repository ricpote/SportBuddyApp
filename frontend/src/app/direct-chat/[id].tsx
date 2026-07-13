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

type ListItem =
  | { type: 'message'; data: DirectMessage }
  | { type: 'date'; id: string; label: string };

function dateLabelFor(d: Date): string {
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (key(d) === key(today)) return 'Hoje';
  if (key(d) === key(yest)) return 'Ontem';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });
}

export default function DirectChatScreen() {
  const { id, name, avatarUrl } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatarUrl?: string;
  }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const uid = user?.uid;

  const { markRead } = useChatBadge();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ListItem>>(null);
  const latestCountRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const handleSendRef = useRef<() => void>(() => {});

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
            markRead(id!);
          }
        })
        .catch(() => {});
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [id, markRead]);

  handleSendRef.current = handleSend;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (inputRef.current as any)?._node as HTMLTextAreaElement | null;
    if (!node) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendRef.current();
      }
    };
    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, []);

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

  // Build list items with date separators injected between days
  const items: ListItem[] = [];
  let lastDateKey = '';
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== lastDateKey) {
      items.push({ type: 'date', id: `date-${key}`, label: dateLabelFor(d) });
      lastDateKey = key;
    }
    items.push({ type: 'message', data: m });
  }

  function renderItem({ item }: { item: ListItem }) {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSep}>
          <ThemedText style={styles.dateSepText}>{item.label}</ThemedText>
        </View>
      );
    }

    const msg = item.data;
    const isOwn = msg.senderId === uid;

    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <ThemedText style={styles.bubbleText}>{msg.text}</ThemedText>
          <View style={styles.bubbleMeta}>
            <ThemedText
              style={[
                styles.bubbleTime,
                { color: isOwn ? 'rgba(255,255,255,0.6)' : '#8f8b85' },
              ]}>
              {new Date(msg.createdAt).toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
            {isOwn && (
              <Ionicons name="checkmark-done-outline" size={14} color="rgba(255,255,255,0.5)" />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <AvatarCircle name={name ?? '?'} avatarUrl={avatarUrl} size={36} />
              <View>
                <ThemedText style={styles.headerName} numberOfLines={1}>
                  {name ?? 'Chat'}
                </ThemedText>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <ThemedText style={styles.onlineText}>online</ThemedText>
                </View>
              </View>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.flex, styles.centered]}>
          <View style={[styles.flex, { width: '100%', maxWidth: MaxContentWidth }]}>

            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(item) => (item.type === 'date' ? item.id : item.data.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <ThemedText style={styles.empty}>Sem mensagens ainda. Diz olá! 👋</ThemedText>
              }
              onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            />

            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

            <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.two }]}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Mensagem..."
                placeholderTextColor="#8f8b85"
                value={text}
                onChangeText={setText}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  { opacity: !text.trim() || sending ? 0.4 : pressed ? 0.75 : 1 },
                ]}
                onPress={handleSend}
                disabled={!text.trim() || sending}>
                <Ionicons name="send" size={20} color="#f4f2ef" style={{ marginLeft: 4 }} />
              </Pressable>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0a0a0b' },
  centered: { alignItems: 'center' },

  // Header
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 15, fontWeight: '600', color: '#f4f2ef' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
  onlineText: { fontSize: 12, color: '#4ade80' },

  // List
  listContent: { padding: Spacing.three, gap: 2, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#8f8b85', marginTop: 40 },

  // Date separator
  dateSep: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  dateSepText: {
    fontSize: 12,
    color: '#8f8b85',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Message rows
  row: { flexDirection: 'row', marginVertical: 2 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  bubbleOwn: { backgroundColor: '#e8823f', borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#111012',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: '#f4f2ef', fontSize: 15 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  bubbleTime: { fontSize: 11 },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    gap: 6,
    backgroundColor: '#0a0a0b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: '#111012',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    color: '#f4f2ef',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8823f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#eb8f84', textAlign: 'center', paddingHorizontal: Spacing.three, paddingBottom: 6 },
});
