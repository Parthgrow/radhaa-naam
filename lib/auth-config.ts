import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { v4 as uuid } from "uuid";
import { findUserByEmail, createUser } from "@/lib/kv/users";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user.email) {
          console.error("No email provided by Google");
          return false;
        }

        const existingUser = await findUserByEmail(user.email);

        if (!existingUser) {
          const userId = uuid();
          await createUser(userId, user.name || null, user.email);
          user.id = userId;
        } else {
          user.id = existingUser.id;
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true;
      }
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
