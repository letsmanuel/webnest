import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session_id = Array.isArray(req.query.session_id) ? req.query.session_id[0] : req.query.session_id;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const tokens = session.metadata?.tokens;
    return res.status(200).json({ tokens });
  } catch (error) {
    console.error('Error fetching Stripe session:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
}
