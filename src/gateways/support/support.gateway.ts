import { Namespace, Server, Socket } from "socket.io";
import { SupportService } from "./support.service";

const setupSupportSocketIO = (io: Server) => {
  const supportIo: Namespace = io.of("/support");

  supportIo.on("connection", (client: Socket) => {
    const userId: string | undefined = client.handshake.query.userId as
      | string
      | undefined;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (!SupportService.getClient(client.id)) {
      SupportService.addClient(client, client.id, userId);
    }

    client.on("disconnect", () => {
      SupportService.removeClient(client.id);
      client.disconnect(true);
    });

    client.on("message", async (message: string) => {
      const senderId: string = client.handshake.query.userId as string;
      if (!senderId) {
        client.disconnect(true);
        return;
      }

      const { newMessage, userId }: any = await SupportService.createMessage(
        client,
        senderId,
        message
      );
      if (!newMessage) return;

      SupportService.sendMessage(supportIo, client, newMessage, userId);
    });
  });

  return supportIo;
};

export default setupSupportSocketIO;
