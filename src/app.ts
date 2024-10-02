import cors from "cors";
import mongoose from "mongoose";
import express, { Application } from "express";
import routes from "./routes";
import * as dotenv from "dotenv";
import http from "http";
import setupChatSocketIO from "./gateways/chats/chat.gateway";
import { Server } from "socket.io";
import setupSupportSocketIO from "./gateways/support/support.gateway";
import path from "path";
dotenv.config();

const app: Application = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use("/images/", express.static("./images"));
// app.use("/audios/", express.static("./audios"));

mongoose.set("strictQuery", false);

app.use("/api", routes);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept"
  );

  next();
});

// const swaggerDocument = YAML.load(path.join(__dirname, "docs", "docs.yaml"));
// app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT: string = process.env.PORT || "8000";

async function start() {
  try {
    mongoose.connect(process.env.MONGOURI as string);

    const server: http.Server = http.createServer(app);

    const io: Server = new Server(server, {
      cors: {
        origin: "*",
      },
    });
    setupChatSocketIO(io);
    setupSupportSocketIO(io);

    console.log("mongoDB connected");

    server.listen(PORT, () => {
      console.log(`Server has been started on port: ${PORT}`);
    });
  } catch (error: any) {
    console.log(error.message);
    process.exit(1);
  }
}

start();
