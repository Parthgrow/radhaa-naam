import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PaymentCard from '@/components/PaymentCard';
import { PAYMENT_PRODUCTS } from '@/lib/dodo-payments';

export default async function PaymentsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <main className="min-h-svh bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Premium
          </h1>
          <p className="text-gray-600 text-lg">
            Unlock premium features and enhance your experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.values(PAYMENT_PRODUCTS).map((product) => (
            <PaymentCard
              key={product.id}
              productId={product.id}
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What's included?
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Unlimited chanting sessions</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Advanced statistics and insights</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Premium meditation sounds</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Ad-free experience</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-3">✓</span>
              <span>Cloud backup and sync</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
