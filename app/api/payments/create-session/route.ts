import { auth } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/dodo-payments-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    const checkoutUrl = new URL(request.url);
    const returnUrl = `${checkoutUrl.protocol}//${checkoutUrl.host}/payments/success`;

    const checkoutSession = await createCheckoutSession({
      productId,
      email: session.user.email,
      name: session.user.name || 'User',
      userId: session.user.id as string,
      returnUrl,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.checkout_url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
