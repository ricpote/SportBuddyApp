export type Message = {
  id: string;
  activityId: string;
  senderId: string;
  text: string;
  createdAt: Date;
};

export type CreateMessageDto = {
  text: string;
};

export function createMessageObject(id: string, activityId: string, senderId: string, data: CreateMessageDto): Message {
  return {
    id,
    activityId,
    senderId,
    text: data.text,
    createdAt: new Date(),
  };
}
