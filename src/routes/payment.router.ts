import express, { Router } from "express";
import * as dotenv from "dotenv";
import Stripe from "stripe";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET_KEY: string = process.env.WEBHOOK_SECRET_KEY as string;

const stripe = new Stripe(STRIPE_SECRET_KEY as string);
//
router.post("/", async (req, res) => {
  try {
    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "rub",
              product_data: {
                name: "product name",
              },
              unit_amount: 5000,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "rub",
              product_data: {
                name: "product name",
              },
              unit_amount: 5000,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: "http://localhost:3000/complete",
        cancel_url: "http://localhost:3000/cancel",
      });

    console.log(session);

    res.status(200).send({ status: "success" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

// Webhook endpoint
router.post("/webhook", async (req, res) => {
  const sig: string = req.headers["stripe-signature"] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      WEBHOOK_SECRET_KEY as string
    );
  } catch (err: any) {
    console.log(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Payment was successful!", session);
  }

  res.status(200).json({ received: true });
});

export default router;
