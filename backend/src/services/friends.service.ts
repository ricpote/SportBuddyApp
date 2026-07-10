import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { notificationsService } from "./notifications.service";
import {
  FriendRequest,
  FriendDto,
  FriendRequestDto,
  createFriendRequestObject,
} from "../models/friendship.model";

const REQUESTS_COLLECTION = "friendRequests";

export class FriendsService {
  private requestsRef = db.collection(REQUESTS_COLLECTION);

  async sendRequest(requesterId: string, addresseeId: string): Promise<void> {
    if (requesterId === addresseeId) {
      throw new Error("Não podes adicionar-te a ti próprio");
    }

    const requesterDoc = await db.collection("users").doc(requesterId).get();
    if (!requesterDoc.exists) throw new Error("Utilizador não encontrado");

    const addresseeDoc = await db.collection("users").doc(addresseeId).get();
    if (!addresseeDoc.exists) throw new Error("Utilizador não encontrado");
    if (addresseeDoc.data()!.status !== "active") {
      throw new Error("Não é possível adicionar este utilizador");
    }

    const requester = requesterDoc.data()!;
    if (((requester.friends ?? []) as string[]).includes(addresseeId)) {
      throw new Error("Já são amigos");
    }

    const existingRequest = await this.requestsRef
      .where("requesterId", "==", requesterId)
      .where("addresseeId", "==", addresseeId)
      .get();

    if (!existingRequest.empty) {
      throw new Error("Já enviaste um pedido a este utilizador");
    }

    const reverseRequest = await this.requestsRef
      .where("requesterId", "==", addresseeId)
      .where("addresseeId", "==", requesterId)
      .get();

    if (!reverseRequest.empty) {
      throw new Error("Este utilizador já te enviou um pedido");
    }

    const ref = this.requestsRef.doc();
    await ref.set(createFriendRequestObject(ref.id, requesterId, addresseeId));

    await notificationsService.createNotification(
      addresseeId,
      "friend_request",
      `${requester.name} enviou-te um pedido de amizade.`
    );
  }

  async getPendingRequests(userId: string): Promise<FriendRequestDto[]> {
    const snapshot = await this.requestsRef
      .where("addresseeId", "==", userId)
      .get();

    const results: FriendRequestDto[] = [];

    for (const doc of snapshot.docs) {
      const request = doc.data() as FriendRequest;

      const requesterDoc = await db.collection("users").doc(request.requesterId).get();
      if (!requesterDoc.exists) continue;

      const requester = requesterDoc.data()!;
      results.push({
        requestId: doc.id,
        from: {
          id: requesterDoc.id,
          name: requester.name,
          avatarUrl: requester.avatarUrl,
        },
        createdAt: request.createdAt instanceof Date
          ? request.createdAt.toISOString()
          : (request.createdAt as any).toDate().toISOString(),
      });
    }

    return results;
  }

  async acceptRequest(requestId: string, userId: string): Promise<void> {
    const requestDoc = await this.requestsRef.doc(requestId).get();
    if (!requestDoc.exists) throw new Error("Pedido não encontrado");

    const request = requestDoc.data() as FriendRequest;
    if (request.addresseeId !== userId) throw new Error("Não tens permissão para aceitar este pedido");

    const batch = db.batch();
    batch.update(db.collection("users").doc(request.requesterId), {
      friends: FieldValue.arrayUnion(request.addresseeId),
    });
    batch.update(db.collection("users").doc(request.addresseeId), {
      friends: FieldValue.arrayUnion(request.requesterId),
    });
    batch.delete(this.requestsRef.doc(requestId));
    await batch.commit();

    const addresseeDoc = await db.collection("users").doc(request.addresseeId).get();
    const addresseeName = addresseeDoc.data()?.name ?? "Alguém";
    await notificationsService.createNotification(
      request.requesterId,
      "friend_request_accepted",
      `${addresseeName} aceitou o teu pedido de amizade.`
    );
  }

  async rejectRequest(requestId: string, userId: string): Promise<void> {
    const requestDoc = await this.requestsRef.doc(requestId).get();
    if (!requestDoc.exists) throw new Error("Pedido não encontrado");

    const request = requestDoc.data() as FriendRequest;
    if (request.addresseeId !== userId) throw new Error("Não tens permissão para rejeitar este pedido");

    await this.requestsRef.doc(requestId).delete();
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const batch = db.batch();
    batch.update(db.collection("users").doc(userId), {
      friends: FieldValue.arrayRemove(friendId),
    });
    batch.update(db.collection("users").doc(friendId), {
      friends: FieldValue.arrayRemove(userId),
    });
    await batch.commit();
  }

  async getFriends(userId: string): Promise<FriendDto[]> {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) throw new Error("Utilizador não encontrado");

    const friendIds: string[] = userDoc.data()!.friends ?? [];
    const results: FriendDto[] = [];

    for (const friendId of friendIds) {
      const friendDoc = await db.collection("users").doc(friendId).get();
      if (!friendDoc.exists) continue;

      const friend = friendDoc.data()!;
      results.push({
        userId: friendId,
        user: {
          id: friendId,
          name: friend.name,
          avatarUrl: friend.avatarUrl,
        },
      });
    }

    return results;
  }
}

export const friendsService = new FriendsService();
