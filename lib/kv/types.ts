export interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  allowRecommendations: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySync {
  userId: string;
  weekStart: string;
  totalBeads: number;
  totalMalas: number;
  syncedAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted";
  createdAt: string;
}

export interface Session {
  sessionToken: string;
  userId: string;
  expires: string;
}

export interface JWTPayload {
  userId?: string;
  iat?: number;
  exp?: number;
}
