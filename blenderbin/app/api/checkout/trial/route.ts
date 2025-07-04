import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { stripe } from '../../../lib/stripe';
import { getAuth } from 'firebase-admin/auth';

// BlenderBin price IDs
const BLENDERBIN_PRICE_IDS = [
  // BlenderBin Production Price IDs
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID, // Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID, // Yearly
  // BlenderBin Test Price IDs
  process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID, // Test Monthly
  process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID, // Test Yearly
].filter(Boolean); // Remove undefined values

// Helper function to check if user has existing BlenderBin subscription
async function checkExistingBlenderBinSubscription(userId: string): Promise<boolean> {
  const subscriptionsSnapshot = await db
    .collection('customers')
    .doc(userId)
    .collection('subscriptions')
    .where('status', 'in', ['active', 'trialing'])
    .get();

  if (subscriptionsSnapshot.empty) {
    return false;
  }

  // Filter subscriptions by BlenderBin price IDs
  for (const subDoc of subscriptionsSnapshot.docs) {
    const subData = subDoc.data();
    
    // Check if subscription has items with BlenderBin price IDs
    if (subData.items && subData.items.length > 0) {
      for (const item of subData.items) {
        const priceId = item.price?.id;
        if (priceId && BLENDERBIN_PRICE_IDS.includes(priceId)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

async function getOrCreateStripeCustomer(userId: string) {
  try {
    // First try to get existing customer
    const userDoc = await db.collection('customers').doc(userId).get();
    const existingStripeId = userDoc.data()?.stripeId;

    if (userDoc.exists && existingStripeId) {
      return existingStripeId;
    }

    // If no customer exists, create a new one
    const user = await getAuth().getUser(userId);
    
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.displayName || 'BlenderBin Customer',
      metadata: {
        firebaseUID: userId,
        productType: 'blenderbin'
      }
    });

    // Create the customer document
    await db.collection('customers').doc(userId).set({
      stripeId: customer.id,
      email: user.email,
      name: user.displayName || 'BlenderBin Customer',
      createdAt: new Date()
    }, { merge: true });

    return customer.id;
  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Check if we're in development mode for localhost
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const body = await request.json();
    const { userId, priceId } = body;

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify this is a BlenderBin price ID
    if (!BLENDERBIN_PRICE_IDS.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID for BlenderBin trial' },
        { status: 400 }
      );
    }

    console.log(`Processing BlenderBin trial checkout for user: ${userId}, price ID: ${priceId}`);

    // Check if user already has an active BlenderBin subscription
    const hasExistingSubscription = await checkExistingBlenderBinSubscription(userId);
    
    if (hasExistingSubscription) {
      console.log(`User ${userId} already has an active BlenderBin subscription`);
      return NextResponse.json(
        { error: 'User already has an active BlenderBin subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId);
    
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve Stripe customer' },
        { status: 400 }
      );
    }

    // Map the price ID based on environment
    let actualPriceId = priceId;
    
    // In development, use test price IDs
    if (isDevelopment) {
      const priceIdMap: Record<string, string> = {
        [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID || '',
        [process.env.NEXT_PUBLIC_YEARLY_STRIPE_PRICE_ID || '']: process.env.NEXT_PUBLIC_YEARLY_STRIPE_TEST_PRICE_ID || ''
      };
      
      actualPriceId = priceIdMap[priceId] || priceId;
      console.log(`Mapped BlenderBin price ID ${priceId} to test price ID ${actualPriceId}`);
    }

    // Verify the price ID exists
    try {
      const price = await stripe.prices.retrieve(actualPriceId);
      console.log(`Retrieved BlenderBin price: ${price.id}, amount: ${price.unit_amount}, currency: ${price.currency}`);
    } catch (error) {
      console.error('Error retrieving price:', error);
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Set appropriate success and cancel URLs
    const baseUrl = isDevelopment
      ? process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
      : 'https://blenderbin.com';

    const successUrl = `${baseUrl}/download?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&trial=true`;
    const cancelUrl = `${baseUrl}?trial_cancelled=true`;
      
    // Create checkout session with BlenderBin trial setup
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: actualPriceId,
        quantity: 1
      }],
      subscription_data: {
        trial_period_days: 7, // 7-day free trial for BlenderBin
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel' // Cancel if no payment method after trial
          }
        },
        metadata: {
          firebaseUID: userId,
          productType: 'blenderbin',
          environment: isDevelopment ? 'development' : 'production',
          trialEnabled: 'true',
          trialType: 'blenderbin_trial',
          originalPriceId: priceId
        }
      },
      payment_method_collection: 'always', // Always collect payment method for trials
      // Removed invoice_creation - invoices are created automatically in subscription mode
      // Ensure automatic payment after trial
      automatic_tax: { enabled: true },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: {
        name: 'auto',
        address: 'auto'
      },
      client_reference_id: userId, // Critical for webhooks
      metadata: {
        firebaseUID: userId,
        productType: 'blenderbin',
        environment: isDevelopment ? 'development' : 'production',
        originalPriceId: priceId,
        mappedPriceId: actualPriceId,
        trialEnabled: 'true',
        trialType: 'blenderbin_trial',
        createdAt: new Date().toISOString()
      }
    });

    // Store checkout session info
    await db.collection('customers').doc(userId).collection('checkout_sessions').doc(session.id).set({
      sessionId: session.id,
      created: new Date(),
      priceId: priceId,
      actualPriceId: actualPriceId,
      productType: 'blenderbin',
      status: 'created',
      environment: isDevelopment ? 'development' : 'production',
      trialEnabled: true,
      trialType: 'blenderbin_trial'
    });

    console.log(`Created BlenderBin trial checkout session ${session.id} for user ${userId}`);
    
    return NextResponse.json({ 
      sessionId: session.id, 
      productType: 'blenderbin',
      trialEnabled: true,
      url: session.url
    });
  } catch (error: unknown) {
    console.error('BlenderBin trial checkout error:', error);
    
    if (error instanceof Error && 'type' in error && error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 