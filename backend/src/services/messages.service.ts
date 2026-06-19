import { db } from "../config/firebase";
import { Message, CreateMessageDto, createMessageObject } from "../models/message.model";
import { activitiesService } from "./activities.service";

const ACTIVITIES_COLLECTION = "activities";

export class MessagesService {
  private messagesRef(activityId: string) {
    return db.collection(ACTIVITIES_COLLECTION).doc(activityId).collection("messages");
  }

  async sendMessage(activityId: string, senderId: string, data: CreateMessageDto): Promise<Message> {
    const activity = await activitiesService.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (!activity.participantsList.includes(senderId)) {
      throw new Error("Only participants can send messages");
    }

    if (activity.status === "cancelled" || activity.status === "completed") {
      throw new Error("Cannot send messages to a cancelled or completed activity");
    }

    const docRef = this.messagesRef(activityId).doc();
    const message = createMessageObject(docRef.id, activityId, senderId, data);

    await docRef.set(message);

    return message;
  }

  async getMessages(activityId: string, requesterId: string): Promise<Message[]> {
    const activity = await activitiesService.getActivityById(activityId);

    if (!activity) {
      throw new Error("Activity not found");
    }

    if (!activity.participantsList.includes(requesterId)) {
      throw new Error("Only participants can read messages");
    }

    const snapshot = await this.messagesRef(activityId)
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      } as Message;
    });
  }
}

export const messagesService = new MessagesService();
