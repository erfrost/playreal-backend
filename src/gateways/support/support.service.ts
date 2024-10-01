import { Namespace, Socket } from "socket.io";
import UserModel from "../../models/User.model";
import SupportChatModel from "../../models/SupportChat.model";
import SupportMessageModel from "../../models/SupportMessage.model";

interface Client {
  socket_id: string;
  user_id: string;
  role: "user" | "admin";
}

export class SupportService {
  static #clients: Client[] = [];

  static getClient(socketId: string) {
    return this.#clients.find(
      (client: Client) => client.socket_id === socketId
    );
  }

  static getSocketId(userId: string) {
    return this.#clients.find(
      (client: Client) => client.user_id.toString() === userId.toString()
    )?.socket_id;
  }

  static async addClient(client: Socket, socketId: string, userId: string) {
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      client.emit("error", "Пользователь не найден");
      return;
    }

    this.#clients.push({
      socket_id: socketId,
      user_id: userId,
      role: currentUser.email === "toxicbikini@gmail.com" ? "admin" : "user",
    });
  }

  static getAdminSocketId() {
    return this.#clients.find((client: Client) => client.role === "admin")
      ?.socket_id;
  }

  static removeClient(socketId: string) {
    this.#clients = this.#clients.filter(
      (client: Client) => client.socket_id !== socketId
    );
  }

  static async createMessage(
    client: Socket,
    senderId: string,
    message: string
  ) {
    try {
      if (!senderId || !message) return;
      let currentChat;

      const isExistChat = await SupportChatModel.findOne({
        userId: senderId,
      });
      if (isExistChat) currentChat = isExistChat;
      else {
        currentChat = await SupportChatModel.create({
          userId: senderId,
          lastMessage: "",
        });
      }

      if (!currentChat || !currentChat._id) {
        client.emit("error", "Чат не найден");
        return;
      }

      const newMessage = await SupportMessageModel.create({
        supportChatId: currentChat._id,
        senderId,
        text: message,
      });

      currentChat.lastMessage = message;
      await currentChat.save();

      return { newMessage, userId: currentChat.userId };
    } catch (error: any) {
      client.emit("error", error.message);
    }
  }

  static sendMessage(
    supportIo: Namespace,
    client: Socket,
    message: any,
    userId: string
  ) {
    try {
      client.emit("message", message);

      const adminSocketId: string | undefined = this.getAdminSocketId();

      // смску отправляет админ
      if (adminSocketId === client.id) {
        const userSocketId: string | undefined = this.getSocketId(userId);
        if (!userSocketId) return;

        supportIo.to(userSocketId).emit("message", message);
      }
      // смску отправляет пользователь
      else {
        if (!adminSocketId) return;

        supportIo.to(adminSocketId).emit("message", message);
      }
    } catch (error: any) {
      client.emit("error", error.message);
    }
  }
}
