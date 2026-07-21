import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { getMessages } from '@/services/messages';

const STORAGE_KEY_PREFIX = '@chat_last_seen_v2_';

type ConversationMeta = {
  id: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
};

type ChatBadgeContextValue = {
  unreadCount: number;
  unreadIds: string[];
  unreadConversationIds: string[];
  markRead: (chatId: string, asOfServerTime?: number) => Promise<void>;
  checkUnread: (activityIds: string[], currentUserId?: string) => Promise<void>;
  checkUnreadConversations: (conversations: ConversationMeta[], currentUserId?: string) => Promise<void>;
};

const ChatBadgeContext = createContext<ChatBadgeContextValue | undefined>(undefined);

async function findUnreadActivities(
  ids: string[],
  currentUserId?: string,
  storageKey?: string
): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(storageKey ?? '');
  const lastSeenMap: Record<string, number> = raw ? JSON.parse(raw) : {};

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const messages = await getMessages(id);
      const fromOthers = currentUserId
        ? messages.filter((m) => m.senderId !== currentUserId)
        : messages;
      if (fromOthers.length === 0) return { id, unread: false };
      const lastMsgTime = Math.max(...fromOthers.map((m) => new Date(m.createdAt).getTime()));
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
  const { user } = useAuth();
  const storageKey = STORAGE_KEY_PREFIX + (user?.uid ?? 'anon');

  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [unreadConversationIds, setUnreadConversationIds] = useState<Set<string>>(new Set());

  const markRead = useCallback(async (chatId: string, asOfServerTime?: number) => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[chatId] = asOfServerTime ?? Date.now();
      await AsyncStorage.setItem(storageKey, JSON.stringify(map));
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
  }, [storageKey]);

  const checkUnread = useCallback(async (activityIds: string[], currentUserId?: string) => {
    if (activityIds.length === 0) { setUnreadIds(new Set()); return; }
    try {
      setUnreadIds(await findUnreadActivities(activityIds, currentUserId, storageKey));
    } catch {}
  }, [storageKey]);

  const checkUnreadConversations = useCallback(
    async (conversations: ConversationMeta[], currentUserId?: string) => {
      if (conversations.length === 0) { setUnreadConversationIds(new Set()); return; }
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const lastSeenMap: Record<string, number> = raw ? JSON.parse(raw) : {};

        const unread = new Set<string>();
        for (const conv of conversations) {
          if (!conv.lastMessageAt) continue;
          if (conv.lastMessageSenderId === currentUserId) continue;
          const lastMsgTime = new Date(conv.lastMessageAt).getTime();
          if (isNaN(lastMsgTime)) continue;
          const lastSeen = lastSeenMap[conv.id] ?? 0;
          if (lastMsgTime > lastSeen) unread.add(conv.id);
        }
        setUnreadConversationIds(unread);
      } catch {}
    },
    [storageKey]
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
