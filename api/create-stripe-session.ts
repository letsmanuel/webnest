import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe("rk_test_51Q2J0f004F5mp0OHYPL5qJepmVy53LTZLAXK4NokxgByS4kzDj8kzhxYxzdFrtmFMKHx5UDYLPiFDQxrbQDgEO4000ozgvRwMb");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, packageLabel, tokensLabel, tokens, price } = req.body;

  if (!userId || !packageLabel || !tokensLabel || !tokens || !price) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${packageLabel} (${tokensLabel})`,
              description: `Webnest: ${tokens} Tokens für dein Konto`,
              images: ['https://webnest.app/logo.png'],
              metadata: { userId, tokens },
            },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { userId, tokens, packageLabel },
      success_url: `https://webnest-hosting.vercel.app/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://webnest-hosting.vercel.app/payment-cancel`,
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      // `custom_text` ist nicht offiziell von Stripe SDK unterstützt und kann entfernt werden
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe create session error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
