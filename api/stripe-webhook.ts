// /api/stripe-webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { userService } from '../src/services/userService';

export const config = {
  api: {
    bodyParser: false, // Wichtig: raw body für Stripe Webhooks
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).send('Missing Stripe signature');
    }

    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const tokens = parseInt(session.metadata?.tokens || '0', 10);

    if (userId && tokens > 0) {
      try {
        await userService.addTokens(userId, tokens, 'Stripe payment');
        console.log(`Granted ${tokens} tokens to user ${userId}`);
      } catch (err) {
        console.error('Failed to grant tokens:', err);
      }
    } else {
      console.warn('Missing userId or tokens in metadata:', session.metadata);
    }
  }

  return res.status(200).json({ received: true });
}
