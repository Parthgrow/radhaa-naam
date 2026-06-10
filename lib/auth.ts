import { getServerSession } from "next-auth/next";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { authOptions } from "@/lib/auth-config";

export async function auth() {
  return await getServerSession(authOptions);
}

export { nextAuthSignOut as signOut };
