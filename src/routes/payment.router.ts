import express, { Router } from "express";
import * as dotenv from "dotenv";
import Stripe from "stripe";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import PaymentModel from "../models/Payment.model";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;
const WEBHOOK_SECRET_KEY: string = process.env.WEBHOOK_SECRET_KEY as string;

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

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
  async (req, res) => {
    try {
      const data = req.body.data.object;
      if (!data) {
        return res.status(500).json({ message: "При оплате произошла ошибка" });
      }
      console.log("data: ", data, req.body.data);
      const { userId } = data.metadata;
      const amount = data.amount_total;

      const newPayment = await PaymentModel.create({
        userId,
        amount,
        items: [],
        status: data.payment_status,
      });

      res.status(200).json(newPayment);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
    }
  }
);

export default router;
