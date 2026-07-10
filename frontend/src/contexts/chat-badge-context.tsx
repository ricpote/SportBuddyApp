import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { getMessages } from '@/services/messages';

const STORAGE_KEY = '@chat_last_seen_v1';

type ChatBadgeContextValue = {
  unreadCount: number;
  unreadIds: string[];
  markRead: (activityId: string) => Promise<void>;
  checkUnread: (activityIds: string[], currentUserId?: string) => Promise<void>;
};

const ChatBadgeContext = createContext<ChatBadgeContextValue | undefined>(undefined);

export function ChatBadgeProvider({ children }: { children: ReactNode }) {
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const markRead = useCallback(async (activityId: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[activityId] = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {}
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(activityId);
      return next;
    });
  }, []);

  const checkUnread = useCallback(async (activityIds: string[], currentUserId?: string) => {
    if (activityIds.length === 0) { setUnreadIds(new Set()); return; }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const lastSeenMap: Record<string, number> = raw ? JSON.parse(raw) : {};

      const results = await Promise.allSettled(
        activityIds.map(async (activityId) => {
          const messages = await getMessages(activityId);
          // As nossas próprias mensagens não contam como "por ler"
          const fromOthers = currentUserId
            ? messages.filter((m) => m.senderId !== currentUserId)
            : messages;
          if (fromOthers.length === 0) return { activityId, unread: false };
          const lastMsgTime = new Date(fromOthers[fromOthers.length - 1].createdAt).getTime();
          const lastSeen = lastSeenMap[activityId] ?? 0;
          return { activityId, unread: lastMsgTime > lastSeen };
        })
      );

      const newUnread = new Set<string>();
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.unread) newUnread.add(r.value.activityId);
      });
      setUnreadIds(newUnread);
    } catch {}
  }, []);

  return (
    <ChatBadgeContext.Provider
      value={{
        unreadCount: unreadIds.size,
        unreadIds: [...unreadIds],
        markRead,
        checkUnread,
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
