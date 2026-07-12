import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications';
import { Notification, NotificationType } from '@/types/notification';
import { relativeDate } from '@/utils/date';

// Ícone (e cor) por tipo de notificação.
const TYPE_ICON: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  activity_joined: { icon: 'person-add-outline', color: '#9ccd6b' },
  activity_join_request: { icon: 'hand-left-outline', color: '#e8823f' },
  activity_left: { icon: 'exit-outline', color: '#c9c5bf' },
  activity_full: { icon: 'people-outline', color: '#e8823f' },
  waitlist_admitted: { icon: 'checkmark-circle-outline', color: '#9ccd6b' },
  participant_removed: { icon: 'person-remove-outline', color: '#eb8f84' },
  activity_cancelled: { icon: 'close-circle-outline', color: '#eb8f84' },
  activity_reminder: { icon: 'alarm-outline', color: '#e8823f' },
  activity_auto_cancelled: { icon: 'close-circle-outline', color: '#eb8f84' },
  new_message: { icon: 'chatbubble-ellipses-outline', color: '#60A5FA' },
  mvp_result: { icon: 'trophy-outline', color: '#e8823f' },
  friend_request: { icon: 'person-add-outline', color: '#60A5FA' },
  friend_request_accepted: { icon: 'people-outline', color: '#9ccd6b' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  useFocusEffect(load);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  async function handleMarkAll() {
    if (submitting || unreadCount === 0) return;
    setSubmitting(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    } catch {
      // silencioso: se falhar, o utilizador pode tentar de novo
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpen(notification: Notification) {
    // Marca como lida localmente e no backend (otimista) e abre a atividade.
    if (!notification.read) {
      setNotifications((prev) =>
        prev ? prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)) : prev
      );
      markNotificationAsRead(notification.id).catch(() => {});
    }
    if (notification.type === 'friend_request' || notification.type === 'friend_request_accepted') {
      router.push('/friends');
    } else if (notification.activityId) {
      router.push({ pathname: '/activity/[id]', params: { id: notification.activityId } });
    }
  }

  if (notifications === null) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.muted}>A carregar...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {unreadCount > 0 && (
          <Pressable
            style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]}
            disabled={submitting}
            onPress={handleMarkAll}
          >
            <Ionicons name="checkmark-done-outline" size={18} color="#e8823f" style={{ marginRight: 6 }} />
            <ThemedText style={styles.markAllText}>Marcar todas como lidas</ThemedText>
          </Pressable>
        )}

        {notifications.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={48} color="#141315" style={{ marginBottom: 8 }} />
            <ThemedText style={styles.muted}>Ainda não tens notificações.</ThemedText>
          </View>
        )}

        {notifications.map((n) => {
          const meta = TYPE_ICON[n.type] ?? { icon: 'notifications-outline', color: '#c9c5bf' };
          return (
            <Pressable
              key={n.id}
              onPress={() => handleOpen(n)}
              style={({ pressed }) => [
                styles.notificationRow,
                !n.read && styles.notificationUnread,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: meta.color + '20' }]}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.notificationBody}>
                <ThemedText style={[styles.notificationText, !n.read && styles.notificationTextUnread]}>
                  {n.message}
                </ThemedText>
                <ThemedText style={styles.notificationDate}>{relativeDate(n.createdAt)}</ThemedText>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    backgroundColor: '#0a0a0b',
  },
  muted: {
    color: '#8f8b85',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(232,130,63,0.12)',
    marginBottom: Spacing.one,
  },
  markAllText: {
    color: '#e8823f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111012',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  notificationUnread: {
    borderColor: '#e8823f',
    backgroundColor: '#111012',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
    gap: 2,
  },
  notificationText: {
    color: '#c9c5bf',
    fontSize: 14,
    lineHeight: 19,
  },
  notificationTextUnread: {
    color: '#f4f2ef',
  },
  notificationDate: {
    color: '#8f8b85',
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e8823f',
  },
  pressed: {
    opacity: 0.7,
  },
});
