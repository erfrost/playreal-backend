import express, { Request, Response, Router } from "express";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import UserModel from "../models/User.model";
import OfferModel from "../models/Offer.model";
import ServiceModel from "../models/Service.model";
import GameModel from "../models/Game.model";
import {
  calculateRangeDays,
  calculateRangePrice,
} from "../utils/calculateRangeInput";
import ChatModel from "../models/Chat.model";

const router: Router = express.Router({ mergeParams: true });

interface Additional {
  title: string;
  price: number;
  days: number;
}
interface CreateOfferPayload {
  serviceId: string;
  ratingRange: number[];
  additionals: Additional[];
}
interface Offer {
  _id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  gameId: string;
  gameName: string;
  serviceId: string;
  title: string;
  serviceImage: string;
  ratingRange: number[];
  additionals: Additional[];
  status: "Pending" | "AtWork" | "Already";
  createdAt: string;
  updatedAt: string;
  __v: number;
}

router.post("/all", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const selectedGames: string[] = req.body.selectedGames;

    const currentUser = await UserModel.findOne({ _id: user._id });

    if (!currentUser) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (currentUser.role !== "booster") {
      return res.status(404).json({ message: "Ошибка доступа" });
    }

    const offers = await OfferModel.find({
      gameId: { $in: selectedGames },
      status: "Pending",
    });

    const formattedOffers = await Promise.all(
      offers.map(async (offer) => {
        const offerUser = await UserModel.findOne({ _id: offer.userId }).select(
          "nickname avatar_url"
        );

        const currentService = await ServiceModel.findOne({
          _id: offer.serviceId,
        }).select(
          "gameId name backgroundCard baseMmrPrice coefficientMmr baseMmrDays basePrice"
        );

        const price: number = Math.ceil(
          calculateRangePrice(
            offer.ratingRange[0],
            offer.ratingRange[1],
            currentService!.baseMmrPrice,
            currentService!.coefficientMmr
          ) + currentService!.basePrice
        );
        const days: number = Math.ceil(
          calculateRangeDays(offer.ratingRange, currentService!.baseMmrDays)
        );

        const currentGame = await GameModel.findOne({
          _id: currentService?.gameId,
        }).select("title");

        return {
          ...offer.toObject(),
          gameId: currentGame?._id,
          gameName: currentGame?.title,
          title: currentService?.name,
          serviceImage: currentService?.backgroundCard,
          userName: offerUser?.nickname,
          userAvatar: offerUser?.avatar_url,
          boosterName: currentUser?.nickname,
          boosterAvatar: currentUser?.avatar_url,
          price,
          days,
        };
      })
    );
    res.status(200).json({
      offers: formattedOffers,
    });
  } catch (error: any) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/personal", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findOne({ _id: user._id });

    if (!currentUser) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    let offers;

    if (currentUser.role === "booster") {
      offers = await OfferModel.find({ boosterId: currentUser._id });
    } else {
      offers = await OfferModel.find({ userId: currentUser._id });
    }

    const formattedOffers = await Promise.all(
      offers.map(async (offer) => {
        const offerUser = await UserModel.findOne({ _id: offer.userId }).select(
          "nickname avatar_url"
        );

        const currentService = await ServiceModel.findOne({
          _id: offer.serviceId,
        }).select(
          "gameId name backgroundCard baseMmrPrice coefficientMmr baseMmrDays basePrice"
        );

        const price: number = Math.ceil(
          calculateRangePrice(
            offer.ratingRange[0],
            offer.ratingRange[1],
            currentService!.baseMmrPrice,
            currentService!.coefficientMmr
          ) + currentService!.basePrice
        );
        const days: number = Math.ceil(
          calculateRangeDays(offer.ratingRange, currentService!.baseMmrDays)
        );

        const currentGame = await GameModel.findOne({
          _id: currentService?.gameId,
        }).select("title");

        if (offer.boosterId) {
          const currentBooster = await UserModel.findById(
            offer.boosterId
          ).select("nickname avatar_url");

          return {
            ...offer.toObject(),
            gameId: currentGame?._id,
            gameName: currentGame?.title,
            title: currentService?.name,
            serviceImage: currentService?.backgroundCard,
            userName: offerUser?.nickname,
            userAvatar: offerUser?.avatar_url,
            boosterName: currentBooster?.nickname,
            boosterAvatar: currentBooster?.avatar_url,
            price,
            days,
          };
        }

        return {
          ...offer.toObject(),
          gameId: currentGame?._id,
          gameName: currentGame?.title,
          title: currentService?.name,
          serviceImage: currentService?.backgroundCard,
          userName: offerUser?.nickname,
          userAvatar: offerUser?.avatar_url,
          price,
          days,
        };
      })
    );
    res.status(200).json({
      offers: formattedOffers,
    });
  } catch (error: any) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/create", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const services: CreateOfferPayload[] = req.body.services;

    const currentUser = await UserModel.findOne({ _id: user._id });

    if (!currentUser) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (currentUser.role !== "user") {
      return res
        .status(403)
        .json({ message: "Бустер не может создавать заказы" });
    }

    for (const service of services) {
      const isExistService = await ServiceModel.findOne({
        _id: service.serviceId,
      });

      if (!isExistService) {
        return res.status(404).json({ message: "Услуга не найдена" });
      }

      if (!(service.ratingRange[0] < service.ratingRange[1])) {
        return res.status(400).json({ message: "Неверный диапазон рейтинга" });
      }
    }

    const newOffers = await Promise.all(
      services.map(async (service) => {
        const currentService = await ServiceModel.findOne({
          _id: service.serviceId,
        }).select("gameId");

        await OfferModel.create({
          userId: currentUser._id,
          serviceId: service.serviceId,
          gameId: currentService?.gameId,
          ratingRange: service.ratingRange,
          additionals: service.additionals || [],
          status: "Pending",
        });
      })
    );

    res.status(200).json({
      offers: newOffers,
    });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/accept", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const offer: Offer = req.body.offer;

    const booster = await UserModel.findById(user._id);
    const client = await UserModel.findById(offer.userId);
    if (!booster || !client) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (!(booster.role === "booster" && client.role === "user")) {
      return res.status(404).json({ message: "Ошибка доступа" });
    }

    const currentOffer = await OfferModel.findById(offer._id);
    if (!currentOffer) {
      return res.status(404).json({ message: "Заказ не найден" });
    }

    const currentGame = await GameModel.findById(currentOffer.gameId);
    const currentService = await ServiceModel.findById(currentOffer.serviceId);
    if (!currentGame || !currentService) {
      return res.status(404).json({ message: "Игра или услуга не найдены" });
    }

    currentOffer.status = "AtWork";
    currentOffer.boosterId = booster._id;
    await currentOffer.save();

    let chatId: string;

    const isExistingChat = await ChatModel.findOne({
      users: { $all: [client._id, booster._id] },
    }).select("_id");
    if (isExistingChat) {
      chatId = isExistingChat._id.toString();
    } else {
      const newChat = await ChatModel.create({
        users: [client._id, booster._id],
        unreadMessagesCount: 0,
      });

      chatId = newChat._id.toString();
    }

    res.status(200).json({
      offer: {
        ...offer,
        status: currentOffer.status,
        boosterId: currentOffer.boosterId,
      },
      chatId,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
