import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import Stripe from "stripe";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Load Firebase config
  let firebaseConfig;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Failed to load firebase-applet-config.json:", err);
  }

  let firebaseApp;
  let db: any;
  if (firebaseConfig) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      console.log("Firebase initialized for DB ID:", firebaseConfig.firestoreDatabaseId);
    } catch (err) {
      console.error("Error initializing Firebase:", err);
    }
  }

  // ======================= M-PESA DARAJA API =======================
  const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
  const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
  const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '';
  const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
  const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback';

  function getMpesaTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  function getMpesaPassword(): string {
    const timestamp = getMpesaTimestamp();
    const str = MPESA_SHORTCODE + MPESA_PASSKEY + timestamp;
    return Buffer.from(str).toString('base64');
  }

  async function getMpesaToken(): Promise<string> {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const resp = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const data: any = await resp.json();
    return data.access_token;
  }

  app.post("/api/mpesa/stkpush", async (req, res) => {
    try {
      const { phoneNumber, amount, bookingId, accountReference } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({ success: false, error: "phoneNumber and amount are required" });
      }

      const formattedPhone = phoneNumber.replace(/^0+/, '254').replace(/^\+/, '');
      const token = await getMpesaToken();
      const timestamp = getMpesaTimestamp();
      const password = getMpesaPassword();

      const stkPayload = {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: accountReference || `TRIP-${bookingId?.slice(-8) || 'NEST'}`,
        TransactionDesc: "Tripnest Ride Payment",
      };

      const stkResp = await fetch(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stkPayload),
        }
      );

      const stkData: any = await stkResp.json();
      console.log("M-Pesa STK response:", stkData);

      if (stkData.ResponseCode === '0') {
        if (db && bookingId) {
          await updateDoc(doc(db, 'bookings', bookingId), {
            paymentStatus: 'pending',
            paymentMethod: 'mpesa',
            mpesaPhone: formattedPhone,
          });
          await setDoc(doc(db, 'transactions', `txn-mpesa-${Date.now()}`), {
            id: `txn-mpesa-${Date.now()}`,
            bookingId,
            userId: req.body.userId || '',
            amount: Math.round(amount),
            currency: 'KES',
            method: 'mpesa',
            status: 'pending',
            description: `M-Pesa STK Push to ${formattedPhone}`,
            createdAt: new Date().toISOString(),
          });
        }

        return res.json({
          success: true,
          merchantRequestId: stkData.MerchantRequestID,
          checkoutRequestId: stkData.CheckoutRequestID,
          message: "STK Push sent to phone. Approve on M-Pesa.",
        });
      } else {
        return res.status(400).json({
          success: false,
          error: stkData.errorMessage || "M-Pesa STK Push failed",
        });
      }
    } catch (error: any) {
      console.error("M-Pesa STK error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const body = req.body;
      console.log("M-Pesa Callback received:", JSON.stringify(body));

      const stkCallback = body?.Body?.stkCallback;
      if (!stkCallback) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid callback" });
      }

      const { ResultCode, ResultDesc, MerchantRequestID, CheckoutRequestID, CallbackMetadata } = stkCallback;
      const success = ResultCode === 0;

      if (success && CallbackMetadata?.Item) {
        const items = CallbackMetadata.Item;
        const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;
        const mpesaReceiptCode = getItem('MpesaReceiptNumber');
        const phoneNumber = getItem('PhoneNumber');
        const amount = getItem('Amount');
        const transactionDate = getItem('TransactionDate');

        console.log(`M-Pesa payment successful: ${mpesaReceiptCode}, KES ${amount}, from ${phoneNumber}`);

        if (db) {
          const txnQuery = query(
            collection(db, 'transactions'),
            where('checkoutRequestId', '==', CheckoutRequestID),
            limit(1)
          );
          const txnSnap = await getDocs(txnQuery);
          if (!txnSnap.empty) {
            const txnDoc = txnSnap.docs[0];
            const txnData = txnDoc.data();
            await updateDoc(doc(db, 'transactions', txnDoc.id), {
              status: 'completed',
              mpesaReceiptCode,
              completedAt: new Date().toISOString(),
            });

            if (txnData.bookingId) {
              await updateDoc(doc(db, 'bookings', txnData.bookingId), {
                paymentStatus: 'paid',
                transactionId: txnDoc.id,
              });
            }
          }
        }

        return res.json({ ResultCode: 0, ResultDesc: "Success" });
      } else {
        console.warn("M-Pesa payment failed:", ResultDesc);
        if (db) {
          const txnQuery = query(
            collection(db, 'transactions'),
            where('checkoutRequestId', '==', CheckoutRequestID),
            limit(1)
          );
          const txnSnap = await getDocs(txnQuery);
          if (!txnSnap.empty) {
            await updateDoc(doc(db, 'transactions', txnSnap.docs[0].id), {
              status: 'failed',
              completedAt: new Date().toISOString(),
            });
          }
        }
        return res.json({ ResultCode: 1, ResultDesc });
      }
    } catch (error: any) {
      console.error("M-Pesa callback error:", error);
      return res.json({ ResultCode: 1, ResultDesc: "Internal server error" });
    }
  });

  app.post("/api/mpesa/query", async (req, res) => {
    try {
      const { checkoutRequestId } = req.body;
      if (!checkoutRequestId) {
        return res.status(400).json({ success: false, error: "checkoutRequestId required" });
      }

      const token = await getMpesaToken();
      const timestamp = getMpesaTimestamp();
      const password = getMpesaPassword();

      const queryResp = await fetch(
        'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
          }),
        }
      );

      const data: any = await queryResp.json();
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // ======================= STRIPE PAYMENTS =======================
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  let stripeClient: Stripe | null = null;
  if (stripeSecretKey) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  app.post("/api/payments/create-intent", async (req, res) => {
    try {
      if (!stripeClient) {
        return res.status(500).json({ success: false, error: "Stripe not configured" });
      }
      const { amount, currency, bookingId, paymentMethodId } = req.body;
      if (!amount) {
        return res.status(400).json({ success: false, error: "amount is required" });
      }

      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100),
        currency: currency || 'usd',
        metadata: { bookingId: bookingId || '' },
      };
      if (paymentMethodId) {
        intentParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await stripeClient.paymentIntents.create(intentParams);

      if (db && bookingId) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          paymentStatus: 'pending',
          paymentMethod: 'card',
        });
      }

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error("Stripe create intent error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    if (!stripeClient || !stripeWebhookSecret) {
      return res.status(500).json({ error: "Stripe not configured" });
    }
    try {
      const sig = req.headers['stripe-signature'] as string;
      let event: Stripe.Event;
      try {
        const rawBody = JSON.stringify(req.body);
        const buf = Buffer.from(rawBody);
        event = stripeClient.webhooks.constructEvent(buf, sig, stripeWebhookSecret);
      } catch (err: any) {
        console.error("Stripe webhook signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        const bookingId = intent.metadata?.bookingId;
        console.log(`Stripe payment succeeded: ${intent.id}, booking: ${bookingId}`);

        if (db && bookingId) {
          await updateDoc(doc(db, 'bookings', bookingId), { paymentStatus: 'paid' });
          await setDoc(doc(db, 'transactions', `txn-stripe-${intent.id}`), {
            id: `txn-stripe-${intent.id}`,
            bookingId,
            userId: '',
            amount: (intent.amount || 0) / 100,
            currency: intent.currency.toUpperCase() as 'USD' | 'KES',
            method: 'card',
            stripePaymentIntentId: intent.id,
            status: 'completed',
            description: 'Stripe card payment',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });
        }
      }

      if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object as Stripe.PaymentIntent;
        console.error(`Stripe payment failed: ${intent.id}, last error: ${intent.last_payment_error?.message}`);
        if (db) {
          const bookingId = intent.metadata?.bookingId;
          if (bookingId) {
            await updateDoc(doc(db, 'bookings', bookingId), { paymentStatus: 'failed' });
          }
        }
      }

      return res.json({ received: true });
    } catch (error: any) {
      console.error("Stripe webhook error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // ======================= EXISTING ROUTES =======================
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { bookingId, otpCode } = req.body;
      if (!bookingId || !otpCode) {
        return res.status(400).json({ success: false, error: "Missing required params: bookingId and otpCode" });
      }
      console.log(`OTP verify: booking ${bookingId}, OTP: ${otpCode}`);

      if (!db) {
        if (otpCode.trim() === "5813") {
          return res.json({ success: true, message: "Mock backend validation succeeded." });
        } else {
          return res.status(400).json({ success: false, error: "Mock backend: Incorrect OTP." });
        }
      }

      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        return res.status(404).json({ success: false, error: `Booking ${bookingId} not found.` });
      }
      const bookingData = bookingSnap.data();
      const actualOtp = (bookingData.otpCode || "5813").toString().trim();
      if (otpCode.toString().trim() === actualOtp) {
        await updateDoc(bookingRef, { status: "en_route", isStarted: true });
        return res.json({ success: true, message: "OTP verified. Trip started." });
      } else {
        return res.status(400).json({ success: false, error: "Incorrect OTP." });
      }
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mpesa: Boolean(MPESA_CONSUMER_KEY),
      stripe: Boolean(stripeSecretKey),
    });
  });

  // Get transaction history for a user
  app.get("/api/transactions/:userId", async (req, res) => {
    try {
      if (!db) return res.json({ transactions: [] });
      const { userId } = req.params;
      const txnQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(txnQuery);
      const transactions = snap.docs.map(d => d.data());
      return res.json({ transactions });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ======================= VITE / STATIC SERVING =======================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tripnest server running on port ${PORT}`);
  });
}

startServer();
