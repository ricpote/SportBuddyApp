export type NotificationType =
  | "activity_joined"
  | "activity_join_request"
  | "activity_left"
  | "activity_full"
  | "waitlist_admitted"
  | "participant_removed"
  | "activity_cancelled"
  | "activity_reminder"
  | "activity_auto_cancelled"
  | "new_message"
  | "badge_earned";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  activityId?: string;
  read: boolean;
  createdAt: Date;
};

export function createNotificationObject(
  id: string,
  userId: string,
  type: NotificationType,
  message: string,
  activityId?: string
): Notification {
  return {
    id,
    userId,
    type,
    message,
    ...(activityId !== undefined ? { activityId } : {}),
    read: false,
    createdAt: new Date(),
  };
}
