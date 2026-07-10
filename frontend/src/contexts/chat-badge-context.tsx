import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { getDirectMessages } from '@/services/conversations';
import { getMessages } from '@/services/messages';

const STORAGE_KEY = '@chat_last_seen_v1';

type ChatBadgeContextValue = {
  unreadCount: number;
  unreadIds: string[];
  unreadConversationIds: string[];
  markRead: (activityId: string) => Promise<void>;
  checkUnread: (activityIds: string[], currentUserId?: string) => Promise<void>;
  checkUnreadConversations: (conversationIds: string[], currentUserId?: string) => Promise<void>;
};

const ChatBadgeContext = createContext<ChatBadgeContextValue | undefined>(undefined);

// Compara a última mensagem de outros com o momento em que abrimos o chat
// (guardado localmente), para saber se há algo por ler.
async function findUnread(
  ids: string[],
  fetchMessages: (id: string) => Promise<{ senderId: string; createdAt: string }[]>,
  currentUserId?: string
): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const lastSeenMap: Record<string, number> = raw ? JSON.parse(raw) : {};

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const messages = await fetchMessages(id);
      // As nossas próprias mensagens não contam como "por ler"
      const fromOthers = currentUserId
        ? messages.filter((m) => m.senderId !== currentUserId)
        : messages;
      if (fromOthers.length === 0) return { id, unread: false };
      const lastMsgTime = new Date(fromOthers[fromOthers.length - 1].createdAt).getTime();
      const lastSeen = lastSeenMap[id] ?? 0;
      return { id, unread: lastMsgTime > lastSeen };
    })
  );

  const unread = new Set<string>();
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value.unread) unread.add(r.value.id);
  });
  return unread;
}

export function ChatBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());

  // Funciona tanto para chats de atividades como para conversas diretas:
  // a chave no storage é o id do chat em ambos os casos.
  const markRead = useCallback(async (chatId: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[chatId] = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });
    setUnreadConversationIds((prev) => {
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });
  }, []);

  const checkUnread = useCallback(async (activityIds: string[], currentUserId?: string) => {
    if (activityIds.length === 0) { setUnreadIds(new Set()); return; }
    try {
      setUnreadIds(await findUnread(activityIds, getMessages, currentUserId));
    } catch {}
  }, []);

  const checkUnreadConversations = useCallback(
    async (conversationIds: string[], currentUserId?: string) => {
      if (conversationIds.length === 0) { setUnreadConversationIds(new Set()); return; }
      try {
        setUnreadConversationIds(await findUnread(conversationIds, getDirectMessages, currentUserId));
      } catch {}
    },
    []
  );

  return (
    <ChatBadgeContext.Provider
      value={{
        unreadCount: unreadIds.size + unreadConversationIds.size,
        unreadIds: [...unreadIds],
        unreadConversationIds: [...unreadConversationIds],
        markRead,
        checkUnread,
        checkUnreadConversations,
      }}>
      {children}
    </ChatBadgeContext.Provider>
  );
}

export function useChatBadge() {
  const ctx = useContext(ChatBadgeContext);
  if (!ctx) throw new Error('useChatBadge must be used within ChatBadgeProvider');
  return ctx;
}
