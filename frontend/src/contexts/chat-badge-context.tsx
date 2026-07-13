import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { getDirectMessages } from '@/services/conversations';
import { getMessages } from '@/services/messages';

const STORAGE_KEY = '@chat_last_seen_v1';

type ChatBadgeContextValue = {
  unreadCount: number;
  unreadIds: string[];
  unreadConversationIds: string[];
  unreadCounts: Record<string, number>;
  unreadConversationCounts: Record<string, number>;
  markRead: (activityId: string) => Promise<void>;
  checkUnread: (activityIds: string[], currentUserId?: string) => Promise<void>;
  checkUnreadConversations: (conversationIds: string[], currentUserId?: string) => Promise<void>;
};

const ChatBadgeContext = createContext<ChatBadgeContextValue | undefined>(undefined);

async function findUnreadCounts(
  ids: string[],
  fetchMessages: (id: string) => Promise<{ senderId: string; createdAt: string }[]>,
  currentUserId?: string
): Promise<Map<string, number>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const lastSeenMap: Record<string, number> = raw ? JSON.parse(raw) : {};

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const messages = await fetchMessages(id);
      const fromOthers = currentUserId
        ? messages.filter((m) => m.senderId !== currentUserId)
        : messages;
      if (fromOthers.length === 0) return { id, count: 0 };
      const lastSeen = lastSeenMap[id] ?? 0;
      const count = fromOthers.filter(
        (m) => new Date(m.createdAt).getTime() > lastSeen
      ).length;
      return { id, count };
    })
  );

  const counts = new Map<string, number>();
  results.forEach((r) => {
    if (r.status === 'fulfilled') counts.set(r.value.id, r.value.count);
  });
  return counts;
}

export function ChatBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unreadConversationCounts, setUnreadConversationCounts] = useState<Record<string, number>>({});

  const markRead = useCallback(async (chatId: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[chatId] = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    setUnreadConversationCounts((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  }, []);

  const checkUnread = useCallback(async (activityIds: string[], currentUserId?: string) => {
    if (activityIds.length === 0) { setUnreadCounts({}); return; }
    try {
      const counts = await findUnreadCounts(activityIds, getMessages, currentUserId);
      const obj: Record<string, number> = {};
      counts.forEach((v, k) => { if (v > 0) obj[k] = v; });
      setUnreadCounts(obj);
    } catch {}
  }, []);

  const checkUnreadConversations = useCallback(
    async (conversationIds: string[], currentUserId?: string) => {
      if (conversationIds.length === 0) { setUnreadConversationCounts({}); return; }
      try {
        const counts = await findUnreadCounts(conversationIds, getDirectMessages, currentUserId);
        const obj: Record<string, number> = {};
        counts.forEach((v, k) => { if (v > 0) obj[k] = v; });
        setUnreadConversationCounts(obj);
      } catch {}
    },
    []
  );

  const unreadIds = Object.keys(unreadCounts);
  const unreadConversationIds = Object.keys(unreadConversationCounts);

  return (
    <ChatBadgeContext.Provider
      value={{
        unreadCount: unreadIds.length + unreadConversationIds.length,
        unreadIds,
        unreadConversationIds,
        unreadCounts,
        unreadConversationCounts,
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
