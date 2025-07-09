import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(bodyParser.json());

// For __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Optionally set projectId if needed
    // projectId: 'webnest-df2cc',
  });
}
const firestore = admin.firestore();

// Serve static files (your Vite build) if needed
app.use(express.static(path.join(__dirname, 'dist')));

// Stripe webhook endpoint
app.post('stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const tokens = parseInt(session.metadata?.tokens, 10);
    if (userId && tokens) {
      try {
        const userRef = firestore.collection('users').doc(userId);
        await firestore.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          const currentTokens = userDoc.exists ? (userDoc.data().tokens || 0) : 0;
          transaction.update(userRef, { tokens: currentTokens + tokens });
        });
        console.log(`Credited ${tokens} tokens to user ${userId} after Stripe payment.`);
      } catch (e) {
        console.error('Failed to credit tokens:', e);
      }
    }
  }
  res.json({ received: true });
});

app.post('create-stripe-session', async (req, res) => {
  try {
    const { userId, packageLabel, tokensLabel, tokens, price } = req.body;
    if (!userId || !packageLabel || !tokensLabel || !tokens || !price) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }
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
      success_url: `http://webnest-hosting.vercel.app:8080/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://webnest-hosting.vercel.app:8080/payment-cancel`,
      billing_address_collection: 'auto',
      allow_promotion_codes: false,
      custom_text: {
        submit: { message: 'Danke für deine Unterstützung! Die Tokens werden nach erfolgreicher Zahlung automatisch gutgeschrieben.' },
      },
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Catch-all for non-POST requests
app.all('create-stripe-session', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

app.get('fetch-stripe-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const tokens = session.metadata?.tokens;
    return res.status(200).json({ tokens });
  } catch (err) {
    console.error('Error fetching Stripe session:', err);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server running on http://webnest-hosting.vercel.app:${PORT}`);
}); 