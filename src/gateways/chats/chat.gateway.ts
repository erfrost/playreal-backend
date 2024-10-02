import { Namespace, Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";
import { MessageDto, ReadDto } from "../../interfaces";

const setupChatSocketIO = (io: Server) => {
  const chatIo: Namespace = io.of("/chat");

  chatIo.on("connection", (client: Socket) => {
    try {
      const userId: string | undefined = client.handshake.query.userId as
        | string
        | undefined;
      if (!userId) {
        client.disconnect(true);
        return;
      }

      ChatService.updateOnlineStatus(chatIo, client, userId, true);

      if (!ChatService.getClient(client.id)) {
        ChatService.addClient(client.id, userId);
      }

      client.on("disconnect", () => {
        ChatService.updateOnlineStatus(chatIo, client, userId, false);
        ChatService.removeClient(client.id);
        client.disconnect(true);
      });

      client.on("message", async (message: MessageDto) => {
        const senderId: string = client.handshake.query.userId as string;
        if (!senderId) {
          client.disconnect(true);
          return;
        }

        const newMessage = await ChatService.createMessage(
          client,
          senderId,
          message
        );
        if (!newMessage) return;

        const recipientSocketIds: string[] = ChatService.getSocketIds(
          newMessage.recipientId.toString()
        );

        client.emit("message", newMessage);

        recipientSocketIds.map((socketId: string) =>
          chatIo.to(socketId).emit("message", newMessage)
        );
      });

      client.on("read", async (readDto: ReadDto) => {
        await ChatService.readMessages(client, readDto);
      });
    } catch (error) {
      console.log(error);
    }
  });

  return chatIo;
};

export default setupChatSocketIO;
