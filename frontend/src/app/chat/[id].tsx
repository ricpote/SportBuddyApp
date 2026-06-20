import { useLocalSearchParams } from 'expo-router';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getMessages, sendMessage } from '@/services/messages';
import { Message } from '@/types/message';

const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const latestCountRef = useRef(0);

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

  function renderMessage({ item }: { item: Message }) {
    const isOwn = item.senderId === user?.uid;
    return (
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <ThemedView
          style={[
            styles.bubbleInner,
            { backgroundColor: isOwn ? theme.backgroundSelected : theme.backgroundElement },
          ]}>
          <ThemedText type="small">{item.text}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.bubbleTime}>
            {new Date(item.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </ThemedView>
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
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Sem mensagens ainda. Diz olá!
              </ThemedText>
            }
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {error && (
            <ThemedText style={styles.error}>{error}</ThemedText>
          )}

          <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.two, backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="Escreve uma mensagem..."
              placeholderTextColor={theme.textSecondary}
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
                { backgroundColor: theme.text, opacity: (!text.trim() || sending) ? 0.4 : pressed ? 0.7 : 1 },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}>
              <ThemedText style={{ color: theme.background }} type="smallBold">
                {sending ? '...' : '↑'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { alignItems: 'center' },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  bubble: {
    flexDirection: 'row',
  },
  bubbleOwn: {
    justifyContent: 'flex-end',
  },
  bubbleOther: {
    justifyContent: 'flex-start',
  },
  bubbleInner: {
    maxWidth: '75%',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    gap: 2,
  },
  bubbleTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#00000020',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#CF4444',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
