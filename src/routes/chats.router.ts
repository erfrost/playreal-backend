import express, { Router } from "express";
import authMiddleware from "../middleware/auth.middleware";
import { RequestWithUser } from "../interfaces";
import ChatModel from "../models/Chat.model";
import UserModel from "../models/User.model";
import MessageModel from "../models/Message.model";

const router: Router = express.Router({ mergeParams: true });

router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;
    const currentUser = await UserModel.findById(user._id).select(
      "nickname avatar_url"
    );
    if (!currentUser) {
      return res.status(500).json({ message: "Пользователь не найден" });
    }

    const chats = await ChatModel.find({
      users: { $all: [user._id] },
    });

    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        const recipientId = chat.users.filter(
          (id) => id.toString() !== user._id.toString()
        );

        const recipient = await UserModel.findById(recipientId).select(
          "nickname avatar_url onlineStatus lastOnlineDate"
        );

        const resultChat = {
          ...chat.toObject(),
          user: recipient,
        };

        return resultChat;
      })
    );

    res.status(200).json({ chats: formattedChats });
  } catch (error) {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/chatId", authMiddleware, async (req, res) => {
  try {
    const user = (req as RequestWithUser).user;
    const { boosterId } = req.query;

    const currentChat = await ChatModel.findOne({
      users: { $all: [user._id, boosterId] },
    }).select("_id");
    if (!currentChat) {
      return res.status(500).json({ message: "Чат не существует" });
    }

    res.status(200).json({ chatId: currentChat._id });
  } catch (error) {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

router.get("/messages/:chatId", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const currentUser = await UserModel.findById(user._id).select(
      "nickname avatar_url"
    );
    if (!currentUser) {
      return res.status(500).json({ message: "Пользователь не найден" });
    }

    const chatId: string | undefined = req.params.chatId as string | undefined;
    if (!chatId) {
      return res.status(500).json({ message: "Чат не найден" });
    }

    const currentChat = await ChatModel.findById(chatId);
    if (!currentChat) {
      return res.status(500).json({ message: "Чат не найден" });
    }

    const messages = await MessageModel.find({ chatId: currentChat._id });

    res.status(200).json({ messages });
  } catch (error) {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
