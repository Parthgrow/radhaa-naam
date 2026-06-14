import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const subscription = await kv.hgetall(
      `user:${session.user.id}:subscription`
    );

    return NextResponse.json({
      hasActiveSubscription: subscription && subscription.status === 'active',
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
