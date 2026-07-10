export type NotificationType =
  | 'activity_joined'
  | 'activity_join_request'
  | 'activity_left'
  | 'activity_full'
  | 'waitlist_admitted'
  | 'participant_removed'
  | 'activity_cancelled'
  | 'activity_reminder'
  | 'activity_auto_cancelled'
  | 'new_message'
  | 'mvp_result'
  | 'friend_request'
  | 'friend_request_accepted';

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  activityId?: string;
  read: boolean;
  createdAt: string;
};
