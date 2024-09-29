import express, { Router } from "express";
import GameModel from "../models/Game.model";
import ServiceModel from "../models/Service.model";
import adminMiddleware from "../middleware/admin.middleware";

const router: Router = express.Router({ mergeParams: true });

router.get("/all", async (req, res) => {
  try {
    const games = await GameModel.find().select("_id title image");

    res.status(200).json({ games });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/withServices", async (req, res) => {
  try {
    const games = await GameModel.find().select("_id title");

    const gamesWithServices = await Promise.all(
      games.map(async (game: any) => {
        try {
          const services = await ServiceModel.find({ gameId: game._id }).select(
            "_id name"
          );
          return {
            ...game.toObject(),
            services,
          };
        } catch (error) {
          return { ...game.toObject(), services: [] };
        }
      })
    );

    res.status(200).json({ games: gamesWithServices });
  } catch (error) {
    res.status(500).json({
      message: "На сервере произошла ошибка. Попробуйте позже",
    });
  }
});

router.get("/by_id/:gameId", async (req, res) => {
  try {
    const gameId: string | undefined = req.params.gameId;

    const game = await GameModel.findOne({ _id: gameId }).select("-services");
    if (!game) {
      return res.status(500).json({ message: "Игра не найдена" });
    }

    res.status(200).json({ game });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.post("/create", adminMiddleware, async (req, res) => {
  try {
    const { title, description, image } = req.body;
    if (!title || !description || !image) {
      return res.status(500).json({ message: "Не все поля заполнены" });
    }

    const newGame = await GameModel.create({
      title,
      description,
      image,
      services: [],
    });
    await newGame.save();

    res.status(200).json({ game: newGame });
  } catch {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
