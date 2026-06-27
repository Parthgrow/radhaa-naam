import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getAccessState } from '@/lib/subscription/access';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const state = await getAccessState(session.user.id);

    return NextResponse.json({
      status: state.status,
      trialEndsAt: state.trialEndsAt,
      currentPeriodEnd: state.currentPeriodEnd,
      productId: state.productId,
      // Back-compat for any older client still reading this field.
      hasActiveSubscription: state.hasAccess,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
