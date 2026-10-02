"use client";

import { SessionProvider } from "next-auth/react";
import { JaapProvider } from "@/lib/state";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <JaapProvider>{children}</JaapProvider>
    </SessionProvider>
  );
}
