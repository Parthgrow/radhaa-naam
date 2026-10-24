import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import { getAccess } from "@/lib/billing/access";
import { getSevaToday } from "@/lib/seva/today";
import Paywall from "@/components/billing/Paywall";
import Darshan from "@/components/seva/darshan/Darshan";

export const metadata = { title: "Shri Radha Rani Darshan — Radhe Radhe" };

export default async function DarshanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const access = await getAccess(session.user.id);
  if (!access.hasAccess) return <Paywall access={access} />;

  return <Darshan initial={await getSevaToday(session.user.id)} />;
}
