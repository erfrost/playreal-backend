import express, { Router } from "express";
import ServiceModel from "../models/Service.model";
import GameModel from "../models/Game.model";
import { calculateRangePrice } from "../utils/calculateRangeInput";

const router: Router = express.Router({ mergeParams: true });

router.get("/all", async (req, res) => {
  try {
    const services = await ServiceModel.find().select("_id");

    res.status(200).json({ services });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/by_gameId/:gameId", async (req, res) => {
  try {
    const gameId: string | undefined = req.params.gameId;
    if (!gameId) {
      return res.status(500).json({ message: "Не указан _id игры" });
    }

    const services = await ServiceModel.find({ gameId }).select(
      "_id name params backgroundCard basePrice"
    );

    res.status(200).json({ services });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/by_gameId/additional/:gameId", async (req, res) => {
  try {
    const gameId: string | undefined = req.params.gameId;
    const currentServiceId: string | undefined = req.query.currentServiceId as
      | string
      | undefined;

    if (!gameId) {
      return res.status(500).json({ message: "Не указан _id игры" });
    }
    if (!currentServiceId) {
      return res.status(500).json({ message: "Не указан _id текущей услуги" });
    }

    const services = await ServiceModel.find({
      _id: { $ne: currentServiceId },
      gameId,
    }).select("_id name params backgroundCard basePrice");

    res.status(200).json({ services });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/by_id/:serviceId", async (req, res) => {
  try {
    const serviceId: string | undefined = req.params.serviceId;
    if (!serviceId) {
      return res.status(500).json({ message: "Не указан _id услуги" });
    }

    const service = await ServiceModel.findOne({ _id: serviceId });

    res.status(200).json({ service });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/cartItemPrice", async (req, res) => {
  try {
    const cartService = req.body.service;

    if (!cartService) {
      return res.status(500).json({ message: "Не передана услуга" });
    }

    const currentService = await ServiceModel.findOne({
      _id: cartService.serviceId,
    });
    if (!currentService) {
      return res.status(500).json({ message: "Услуга не найдена" });
    }

    const rangePrice: number = Math.ceil(
      calculateRangePrice(
        cartService.ratingRange[0],
        cartService.ratingRange[1],
        currentService.baseMmrPrice,
        currentService.coefficientMmr
      )
    );

    const additionalPrice: number = cartService.additionals.reduce(
      (acc: number, additional: any) => acc + additional.price,
      0
    );

    const totalPrice: number = Math.ceil(
      currentService.basePrice + rangePrice + additionalPrice
    );

    res.status(200).json({ price: totalPrice, title: currentService.name });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/create/:gameId", async (req, res) => {
  try {
    const gameId: string | undefined = req.params.gameId;
    const {
      name,
      params,
      basePrice,
      coefficientMmr,
      baseMmrPrice,
      baseMmrDays,
      title,
      backgroundCard,
      backgroundHeader,
      images,
      requirementsTitle,
      requirements,
      ratingRange,
      boosterLink,
      additionals,
    } = req.body;

    if (!gameId) {
      return res.status(500).json({ message: "Не указан _id игры" });
    }
    if (
      !name ||
      !params.length ||
      !basePrice ||
      !coefficientMmr ||
      !baseMmrPrice ||
      !baseMmrDays ||
      !title ||
      !backgroundCard ||
      !backgroundHeader ||
      ratingRange.length !== 2 ||
      !boosterLink
    ) {
      return res.status(500).json({ message: "Не все поля заполнены" });
    }

    const isExistingGame = await GameModel.findOne({ _id: gameId });
    if (!isExistingGame) {
      return res.status(500).json({ message: "Игра не найдена" });
    }

    const newService = await ServiceModel.create({
      gameId,
      name,
      basePrice,
      coefficientMmr,
      params: params || [],
      baseMmrPrice,
      baseMmrDays,
      title,
      backgroundCard,
      backgroundHeader,
      images: images || [],
      requirementsTitle: requirementsTitle || "",
      requirements: requirements || [],
      ratingRange,
      boosterLink,
      additionals: additionals || [],
    });
    await newService.save();

    res.status(200).json({ service: newService });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
