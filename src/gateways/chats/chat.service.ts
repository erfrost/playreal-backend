import { Namespace, Server, Socket } from "socket.io";
import { MessageDto, ReadDto } from "../../interfaces";
import ChatModel from "../../models/Chat.model";
import MessageModel from "../../models/Message.model";
import UserModel from "../../models/User.model";

interface Client {
  socket_id: string;
  user_id: string;
}

export class ChatService {
  static #clients: Client[] = [];

  static getAll() {
    return this.#clients;
  }

  static getClient(socketId: string) {
    return this.#clients.find(
      (client: Client) => client.socket_id === socketId
    );
  }

  static getSocketIds(userId: string) {
    const clients: string[] = this.#clients
      .filter((client: Client) => client.user_id === userId.toString())
      .map((client: Client) => client.socket_id);

    return clients;
  }

  static addClient(socketId: string, userId: string) {
    this.#clients.push({ socket_id: socketId, user_id: userId });
  }

  static removeClient(socketId: string) {
    this.#clients = this.#clients.filter(
      (client: Client) => client.socket_id !== socketId
    );
  }

  static async updateOnlineStatus(
    chatIo: Namespace,
    client: Socket,
    userId: string,
    status: boolean
  ) {
    if (!userId) {
      client.emit("error", "Переданы неверные данные");
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      client.emit("error", "Пользователь не найден");
      return;
    }

    if (!status) {
      user.lastOnlineDate = new Date().toString();
    }
    user.onlineStatus = status;
    await user.save();

    // отправка текущего статуса всем собеседникам
    const chats = await ChatModel.find({
      users: { $all: [userId] },
    }).select("users");
    if (!chats) {
      client.emit("error", "Произошла ошибка");
      return;
    }

    const recipientsIds: Set<string> = new Set();

    chats.forEach((chat: any) => {
      chat.users
        .filter((id: string) => id.toString() !== userId.toString())
        .forEach((id: string) => recipientsIds.add(id.toString()));
    });

    recipientsIds.forEach((id: string) => {
      const socketIds: string[] = this.getSocketIds(id);

      socketIds.map((socketId: string) =>
        chatIo.to(socketId).emit("onlineStatus", {
          userId,
          onlineStatus: status,
          lastOnlineDate: new Date().toString(),
        })
      );
    });
  }

  static async createMessage(
    client: Socket,
    senderId: string,
    message: MessageDto
  ) {
    try {
      const { recipient_id: recipientId, text, files, audio } = message;

      if (!recipientId || (!text && !files.length)) return;

      const currentChat = await ChatModel.findOne({
        users: { $all: [senderId, recipientId] },
      }).select("_id lastMessage");

      if (!currentChat || !currentChat._id) {
        client.emit("error", "Чат не найден");
        return;
      }

      const newMessage = await MessageModel.create({
        chatId: currentChat._id,
        senderId,
        recipientId,
        text,
        files,
        audio,
        isRead: false,
      });

      currentChat.lastMessage = text
        ? text
        : files.length
        ? `Файлы: ${files.length} шт.`
        : "Ничего";
      await currentChat.save();

      return newMessage;
    } catch (error: any) {
      client.emit("error", error.message);
    }
  }

  static async readMessages(client: Socket, readDto: ReadDto) {
    const { chatId, userId } = readDto;
    if (!chatId || !userId) {
      client.emit("error", "Переданы неверные данные");
      return;
    }

    const currentChat = await ChatModel.findById(chatId);
    if (!currentChat) {
      client.emit("error", "Чат не найден");
      return;
    }

    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      client.emit("error", "Пользователь не найден");
      return;
    }

    const unreadMessages = await MessageModel.find({
      chatId,
      recipientId: userId,
      isRead: false,
    });
    console.log("read: ", unreadMessages);
    Promise.all(
      unreadMessages.map(async (message: any) => {
        message.isRead = true;
        await message.save();
      })
    );

    await currentChat.save();
  }
}
