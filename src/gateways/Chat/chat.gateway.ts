import { Server, Socket } from "socket.io";
import http from "http";
import { ChatService } from "./chat.service";
import { MessageDto, ReadDto } from "../../interfaces";

const setupSocketIO = (httpServer: http.Server) => {
  const io: Server = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (client: Socket) => {
    const userId: string | undefined = client.handshake.query.userId as
      | string
      | undefined;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    ChatService.updateOnlineStatus(io, client, userId, true);

    if (!ChatService.getClient(client.id)) {
      ChatService.addClient(client.id, userId);
    }

    client.on("disconnect", () => {
      console.log("disconnect");
      ChatService.updateOnlineStatus(io, client, userId, false);
      ChatService.removeClient(client.id);
      client.disconnect(true);
    });

    client.on("message", async (message: MessageDto) => {
      const senderId: string = client.handshake.query.userId as string;

      const newMessage = await ChatService.sendMessage(
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
        io.to(socketId).emit("message", newMessage)
      );
    });

    client.on("read", async (readDto: ReadDto) => {
      await ChatService.readMessages(client, readDto);
    });
  });
  return io;
};

export default setupSocketIO;
