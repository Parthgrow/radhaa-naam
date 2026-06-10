export interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
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
