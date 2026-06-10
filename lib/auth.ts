import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";

export const { auth, signIn, signOut } = NextAuth(authOptions);
