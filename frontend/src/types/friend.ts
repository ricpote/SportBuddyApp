// Utilizador "leve" mostrado nas listas de amigos/pedidos.
export type FriendUser = {
  id: string;
  name: string;
  avatarUrl?: string;
};

// Uma amizade aceite (o `friendshipId` é o id do documento de amizade no backend).
export type Friend = {
  friendshipId: string;
  user: FriendUser;
};

// Um pedido de amizade que EU recebi e ainda não respondi.
export type FriendRequest = {
  friendshipId: string;
  from: FriendUser;
  createdAt: string;
};
