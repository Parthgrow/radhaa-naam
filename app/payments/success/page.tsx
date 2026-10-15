import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-config";
import PaymentConfirmation from "@/components/billing/PaymentConfirmation";

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  return (
    <main className="flex min-h-svh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <PaymentConfirmation
          subscriptionId={first(params.subscription_id)}
          status={first(params.status)}
        />
      </div>
    </main>
  );
}
