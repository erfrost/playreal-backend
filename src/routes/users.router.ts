import bcrypt from "bcryptjs";
import express, { Router, Request, Response } from "express";
import * as dotenv from "dotenv";
import UserModel from "../models/User.model";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import { isValidNickname, isValidPassword } from "../utils/validation";
import { Types } from "mongoose";
import GameModel from "../models/Game.model";
dotenv.config();

interface ProfileUpdate {
  nickname: string;
  description: string;
  avatar_url: string;
  password?: string;
  games: Types.ObjectId[];
}

const router: Router = express.Router({ mergeParams: true });

router.get("/all", async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select("_id");
    const idsArray = users.map((user) => ({
      params: { userId: user._id },
    }));

    res.status(200).json({ ids: idsArray });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/by_id/:userId", async (req: Request, res: Response) => {
  try {
    const userId: string = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "_id пользователя не указано" });
    }

    const currentUser = await UserModel.findOne({
      _id: userId,
    }).select("-password");

    if (!currentUser) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    res.status(200).json({ user: currentUser });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/boosters/:gameId", async (req: Request, res: Response) => {
  try {
    const gameId: string = req.params.gameId;

    if (!gameId) {
      return res.status(400).json({ message: "Игра не указана" });
    }

    const currentGame = await GameModel.findById(gameId);

    if (!currentGame) {
      return res.status(404).json({ message: "Игра не найдена" });
    }

    const boosters = await UserModel.find({
      games: { $in: [gameId] },
      role: "booster",
    });

    res.status(200).json({ boosters });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findOne({ _id: user._id }).select(
      "-password"
    );
    if (!currentUser) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    res.status(200).json({ user: currentUser });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/role", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findOne({ _id: user._id }).select(
      "role"
    );
    if (!currentUser) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    res.status(200).json({ role: currentUser.role });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.get(
  "/base-info",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as RequestWithUser).user;

      const currentUser = await UserModel.findOne({
        _id: user._id,
      }).select("_id nickname avatar_url role");

      if (!currentUser) {
        return res.status(400).json({ message: "Пользователь не найден" });
      }

      res.status(200).json({ user: currentUser });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error });
    }
  }
);

router.get("/userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findOne({
      _id: user._id,
    }).select("_id");

    if (!currentUser) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    res.status(200).json({ user_id: currentUser._id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

router.get("/balance", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findOne({
      _id: user._id,
    }).select("role balance");

    if (!currentUser) {
      return res.status(400).json({ message: "Пользователь не найден" });
    }

    if (currentUser.role !== "booster") {
      return res.status(400).json({ message: "Ошибка доступа" });
    }

    res.status(200).json({ balance: currentUser.balance });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error });
  }
});

router.post(
  "/profile/update",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as RequestWithUser).user;

      const {
        nickname,
        description,
        avatar_url,
        password,
        games,
      }: ProfileUpdate = req.body;
      if (!nickname) {
        return res.status(400).json({
          message: "Не все поля заполнены",
        });
      }

      if (!isValidNickname(nickname)) {
        return res.status(400).json({
          message:
            "Никнейм может содержать только буквы и цифры. Минимальная длина - 3 символов. Максимальная - 15",
        });
      }

      const currentUser = await UserModel.findOne({ _id: user._id });
      if (!currentUser) {
        return res.status(400).json({ message: "Пользователь не найден" });
      }

      currentUser.nickname = nickname;
      currentUser.description = description;
      currentUser.avatar_url = avatar_url;
      currentUser.games = games;

      if (password) {
        if (!isValidPassword(password)) {
          return res.status(400).json({
            message:
              "Пароль может содержать только латинские символы, цифры и специальные знаки. Минимальная длина - 7 символов. Максимальная - 20",
          });
        }

        const hashedPassword: string = await bcrypt.hash(password, 12);
        currentUser.password = hashedPassword;
      }

      await currentUser.save();

      res.status(200).json({ user: currentUser });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error });
    }
  }
);

export default router;
