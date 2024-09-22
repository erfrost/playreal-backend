import express, { Router } from "express";
import * as dotenv from "dotenv";
import Stripe from "stripe";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import PaymentModel from "../models/Payment.model";
import { calculateRangePrice } from "../utils/calculateRangeInput";
import ServiceModel from "../models/Service.model";
import OfferModel from "../models/Offer.model";
import UserModel from "../models/User.model";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;
    const { items } = req.body;

    const currentUser = await UserModel.findById(user._id);
    if (!currentUser) {
      return res.status(500).json({ message: "Пользователь не найден" });
    }
    if (currentUser.role !== "user") {
      return res
        .status(500)
        .json({ message: "Создавать заказы бустеры не могут" });
    }

    const formattedItems = await Promise.all(
      items.map(async (item: any) => {
        const currentService = await ServiceModel.findById(item.serviceId);
        if (!currentService) return null;

        const ratingRangePrice: number = Math.ceil(
          currentService.basePrice +
            calculateRangePrice(
              item.ratingRange[0],
              item.ratingRange[1],
              currentService.baseMmrPrice,
              currentService.coefficientMmr
            )
        );
        const additionalsPrice: number = Math.ceil(
          item.additionals.reduce(
            (acc: number, additional: any) => acc + additional.price,
            0
          )
        );

        const totalAmount: number = ratingRangePrice + additionalsPrice;

        // const description: string = `${item.ratingRange[0]} - ${
        //   item.ratingRange[1]
        // } ${item.additionals.map((additional: any) => " " + additional.title)}`;
        const description: string = `${item.ratingRange[0]} - ${
          item.ratingRange[1]
        } \n
        ${item.additionals.map((additional: any) => additional.title + "\n")}`;

        return {
          serviceId: item.serviceId,
          name: currentService.name,
          description,
          image: currentService.backgroundCard,
          ratingRange: item.ratingRange,
          additionals: item.additionals,
          amount: totalAmount,
        };
      })
    );

    const amount: number = formattedItems.reduce(
      (acc: number, item: any) => acc + item.amount,
      0
    );

    console.log(formattedItems, amount);

    const newPayment = await PaymentModel.create({
      userId: user._id,
      amount,
      items: formattedItems,
      status: "Waiting for payment",
    });

    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: formattedItems.map((item: any) => ({
          price_data: {
            currency: "rub",
            product_data: {
              name: item.name,
              description: item.description,
              images: [item.image],
            },
            unit_amount: item.amount * 100,
          },
          quantity: 1,
        })),
        mode: "payment",
        success_url: "http://147.45.168.75:3000/profile",
        cancel_url: "http://147.45.168.75:3000",
        metadata: {
          userId: user._id.toString(),
          paymentId: newPayment._id.toString(),
        },
      });

    console.log(session);

    res.status(200).send({ payment_url: session.url });
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

      const { userId, paymentId } = data.metadata;

      const currentPayment = await PaymentModel.findById(paymentId);
      if (!currentPayment) {
        return res
          .status(500)
          .json({ message: "Транзакция не найдена, обратитесь в поддержку" });
      }

      currentPayment.status = data.payment_status;
      await currentPayment.save();

      const newOffers = await Promise.all(
        currentPayment.items.map(async (item: any) => {
          const currentService = await ServiceModel.findOne({
            _id: item.serviceId,
          }).select("gameId");

          await OfferModel.create({
            userId,
            serviceId: item.serviceId,
            gameId: currentService?.gameId,
            ratingRange: item.ratingRange,
            additionals: item.additionals || [],
            status: "Pending",
          });
        })
      );

      console.log(newOffers);

      res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
    }
  }
);

export default router;
