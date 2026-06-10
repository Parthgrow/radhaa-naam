import { auth } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function AuthBar() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          {session.user.name || session.user.email}
        </span>
      </div>

      <LogoutButton />
    </div>
  );
}
