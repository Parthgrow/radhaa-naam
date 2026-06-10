"use client";

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Welcome to Radhe Radhe
          </h1>
          <p className="mb-8 text-gray-600">
            Sign in to sync your naam jaap across devices
          </p>

          <button
            onClick={() => signIn("google", { redirectTo: "/" })}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>

          <p className="mt-6 text-center text-sm text-gray-500">
            By signing in, you agree to our terms of service
          </p>
        </div>
      </div>
    </main>
  );
}
