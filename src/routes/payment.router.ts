import express, { Router } from "express";
import * as dotenv from "dotenv";
import Stripe from "stripe";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET_KEY: string = process.env.WEBHOOK_SECRET_KEY as string;

const stripe = new Stripe(STRIPE_SECRET_KEY as string);
//
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;

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
        success_url: "http://147.45.168.75:3000/complete",
        cancel_url: "http://147.45.168.75:3000/cancel",
        metadata: {
          userId: user._id,
        },
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

router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  (req, res) => {
    const event = req.body;

    console.log("event: ", event, " :event");

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        break;
      case "payment_method.attached":
        const paymentMethod = event.data.object;
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);
export default router;
