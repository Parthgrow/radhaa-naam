"use client";

import { useState, useMemo } from "react";
import { signOut } from "next-auth/react";

interface UserProfileProps {
  email?: string | null;
  name?: string | null;
}

export default function UserProfile({ email, name }: UserProfileProps) {
  const [open, setOpen] = useState(false);

  const gravatarUrl = useMemo(() => {
    if (!email) return "";
    // Simple MD5 hash for gravatar (using a simpler approach)
    // For production, consider using a library or server-side generation
    return `https://www.gravatar.com/avatar/${email.toLowerCase()}?d=identicon&s=32`;
  }, [email]);

  if (!email) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full p-1 hover:bg-ring/30 transition flex items-center"
        aria-label="User menu"
      >
        <img
          src={gravatarUrl}
          alt={name || email}
          className="w-8 h-8 rounded-full"
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{name || email}</p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut({ callbackUrl: "/login", redirect: true });
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
