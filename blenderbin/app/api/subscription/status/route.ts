// app/api/subscription/status/route.ts
import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Check the customers collection where the extension stores subscription data
    const customerDoc = await db.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ isSubscribed: false });
    }

    // Get all active subscriptions for this customer
    const subscriptionsSnapshot = await db
      .collection('customers')
      .doc(userId)
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .get();

    if (subscriptionsSnapshot.empty) {
      return NextResponse.json({ isSubscribed: false });
    }

    // Get the first active subscription
    const subscription = subscriptionsSnapshot.docs[0].data();
    
    // Check if the subscription is set to cancel at the end of the period
    const isCanceling = subscription.cancel_at_period_end === true;
    
    return NextResponse.json({
      isSubscribed: true,
      priceId: subscription.price.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: isCanceling,
      currentPeriodEnd: subscription.current_period_end ? 
        new Date(subscription.current_period_end._seconds * 1000).toISOString() : 
        null
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}