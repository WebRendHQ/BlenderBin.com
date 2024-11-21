import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import cors from 'cors';
import { Request, Response } from 'express';

admin.initializeApp();

const stripeSecret = functions.config().stripe.secret;
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
});


const allowedOrigins = ['https://blenderbin.com', 'https://www.blenderbin.com'];
const corsHandler = cors({ origin: allowedOrigins });

export const cancelSubscription = functions.https.onRequest(
  (req: Request, res: Response) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }

      try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.split('Bearer ')[1];

        if (!idToken) {
          return res.status(401).send({ error: 'Unauthorized' });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const subscriptionId = req.body.subscriptionId as string;
        if (!subscriptionId) {
          return res
            .status(400)
            .send({ error: 'Subscription ID is required' });
        }

        console.log(`Canceling subscription ${subscriptionId} for user ${uid}`);

        // Using stripe.subscriptions.cancel instead of del
        const cancellation = await stripe.subscriptions.cancel(subscriptionId);

        const customerRef = admin
          .firestore()
          .collection('customers')
          .doc(uid);

        await customerRef
          .collection('subscriptions')
          .doc(subscriptionId)
          .update({
            status: 'canceled',
            canceled_at: admin.firestore.FieldValue.serverTimestamp(),
          });

        console.log(`Subscription ${subscriptionId} canceled successfully`);

        return res.status(200).send({
          message: 'Subscription canceled successfully',
          cancellation,
        });
      } catch (error) {
        console.error('Error canceling subscription:', error);
        return res
          .status(500)
          .send({ error: 'Failed to cancel subscription' });
      }
    });
  }
);
