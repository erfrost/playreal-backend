import express, { Router } from "express";
import * as dotenv from "dotenv";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import UserModel from "../models/User.model";
import SupportMessageModel from "../models/SupportMessage.model";
import SupportChatModel from "../models/SupportChat.model";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

router.get("/messages", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;

    const currentUser = await UserModel.findById(user._id);
    if (!currentUser) {
      return res.status(500).json({ message: "Пользователь не найден" });
    }

    const currentSupportChat = await SupportChatModel.findOne({
      userId: currentUser._id,
    });
    if (!currentSupportChat) {
      return res.status(200).send({ messages: [] });
    }

    const supportMessages = await SupportMessageModel.find({
      supportChatId: currentSupportChat._id,
    });

    res.status(200).send({ messages: supportMessages });
  } catch (error) {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
