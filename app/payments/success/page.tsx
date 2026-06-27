import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RefreshSubscriptionOnMount from '@/components/RefreshSubscriptionOnMount';

export default async function SuccessPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="min-h-svh bg-gray-50 flex items-center justify-center px-4">
      <RefreshSubscriptionOnMount />
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for upgrading to Premium. You now have access to all
          premium features.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Go to Home
          </Link>
          <Link
            href="/payments"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            View Plans
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-8">
          A confirmation email has been sent to {session.user?.email}
        </p>
      </div>
    </main>
  );
}
