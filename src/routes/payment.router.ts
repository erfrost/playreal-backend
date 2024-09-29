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
import axios, { AxiosResponse } from "axios";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

const STRIPE_SECRET_KEY: string = process.env.STRIPE_SECRET_KEY as string;
const PAYPAL_CLIENT_ID: string = process.env.PAYPAL_CLIENT_ID as string;
const PAYPAL_SECRET_KEY: string = process.env.PAYPAL_SECRET_KEY as string;

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

router.get("/all", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findById(user._id);
    if (!currentUser) {
      return res.status(500).json({ message: "Пользователь не найден" });
    }

    const payments = await PaymentModel.find({
      userId: currentUser._id,
    });

    res.status(200).send({ payments });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/stripe", authMiddleware, async (req, res) => {
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

        const description: string = `${item.ratingRange[0]} - ${
          item.ratingRange[1]
        } ${item.additionals.map((additional: any) => " " + additional.title)}`;

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
      type: "payment",
      items: formattedItems,
      status: "cancelled",
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
  "/stripe/webhook",
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

      if (data.payment_status === "paid") {
        currentPayment.status = "success";
        await currentPayment.save();

        await Promise.all(
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
      }

      res.status(200).json({ status: "success" });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
    }
  }
);

router.post("/paypal", authMiddleware, async (req, res) => {
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

        const description: string = `${item.ratingRange[0]} - ${
          item.ratingRange[1]
        } ${item.additionals.map((additional: any) => " " + additional.title)}`;

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

    const newPayment = await PaymentModel.create({
      userId: user._id,
      amount,
      type: "payment",
      items: formattedItems,
      status: "cancelled",
    });

    const response: AxiosResponse = await axios.post(
      "https://api.sandbox.paypal.com/v1/payments/payment",
      {
        intent: "sale",
        payer: {
          payment_method: "paypal",
        },
        transactions: [
          {
            amount: {
              total: amount.toFixed(2),
              currency: "RUB",
            },
            description: `${formattedItems
              .map((item) => item.name)
              .join(", ")}`,
            custom: JSON.stringify({
              userId: user._id.toString(),
              paymentId: newPayment._id.toString(),
            }),
          },
        ],
        redirect_urls: {
          return_url: "http://147.45.168.75:3000/profile",
          cancel_url: "http://147.45.168.75:3000",
        },
      },
      {
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_SECRET_KEY,
        },
      }
    );

    const approvalUrl = response.data.links.find(
      (link: any) => link.rel === "approval_url"
    );

    if (approvalUrl) {
      console.log(approvalUrl.href);
      return res.status(200).send({ payment_url: approvalUrl.href });
    } else {
      return res
        .status(500)
        .json({ message: "Ошибка создания ссылки на оплату" });
    }
  } catch (error: any) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/paypal/webhook", authMiddleware, async (req, res) => {
  try {
    const eventType = req.body.event_type;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const orderApproved = req.body.resource;
      const { userId, paymentId } = JSON.parse(orderApproved.custom);

      const currentPayment = await PaymentModel.findById(paymentId);
      if (!currentPayment) {
        return res
          .status(500)
          .json({ message: "Произошла ошибка при проверка транзакции" });
      }

      currentPayment.status = "success";
      await currentPayment.save();

      console.log(currentPayment.items);
      await Promise.all(
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
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "На сервере произошла ошибка. Попробуйте позже",
    });
  }
});

// router.post("/paypal/check", authMiddleware, async (req, res) => {
//   try {
//     const { paymentId, token, payerId } = req.body;
//     if (!paymentId || !token || !payerId) {
//       return res.status(500).json({ message: "Не переданы данные" });
//     }

//     // получение access токена paypal
//     const authString: string = Buffer.from(
//       `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`
//     ).toString("base64");

//     const tokenResponse: AxiosResponse = await axios.post(
//       "https://api.sandbox.paypal.com/v1/oauth2/token",
//       null,
//       {
//         headers: {
//           Authorization: `Basic ${authString}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         params: { grant_type: "client_credentials" },
//       }
//     );

//     const accessToken: string = tokenResponse.data.access_token;

//     // получения информации о транзакции
//     const executeResponse: AxiosResponse = await axios.post(
//       `https://api.sandbox.paypal.com/v1/payments/payment/${paymentId}/execute`,
//       { payer_id: payerId },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const paymentData = executeResponse.data;

//     const parsedMetadata = await JSON.parse(paymentData.transactions[0].custom);
//     const { userId: userModelId, paymentId: paymentModelId } = parsedMetadata;

//     console.log(userModelId, paymentModelId);

//     const currentPayment = await PaymentModel.findById(paymentModelId);
//     if (!currentPayment) {
//       return res
//         .status(500)
//         .json({ message: "Транзакция не найдена, обратитесь в поддержку" });
//     }

//     if (paymentData.state === "approved") {
//       currentPayment.status = "success";
//       await currentPayment.save();
//     }

//     console.log(currentPayment.items);
//     await Promise.all(
//       currentPayment.items.map(async (item: any) => {
//         const currentService = await ServiceModel.findOne({
//           _id: item.serviceId,
//         }).select("gameId");

//         await OfferModel.create({
//           userId: userModelId,
//           serviceId: item.serviceId,
//           gameId: currentService?.gameId,
//           ratingRange: item.ratingRange,
//           additionals: item.additionals || [],
//           status: "Pending",
//         });
//       })
//     );

//     res.status(200).send({ status: "success" });
//   } catch (error: any) {
//     console.log(error);
//     res
//       .status(500)
//       .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
//   }
// });

export default router;
