import express, { Router } from "express";
import authRouter from "./auth.router";
import tokensRouter from "./tokens.router";
import usersRouter from "./users.router";
import filesRouter from "./files.router";
import gamesRouter from "./games.router";
import servicesRouter from "./services.router";
import offersRouter from "./offers.router";
import chatsRouter from "./chats.router";
import paymentRouter from "./payment.router";
import supportChatRouter from "./supportChat.router";

const router: Router = express.Router({ mergeParams: true });

router.use("/auth", authRouter);

router.use("/tokens", tokensRouter);

router.use("/users", usersRouter);

router.use("/files", filesRouter);

router.use("/games", gamesRouter);

router.use("/services", servicesRouter);

router.use("/offers", offersRouter);

router.use("/chats", chatsRouter);

router.use("/payment", paymentRouter);

router.use("/supportChat", supportChatRouter);

export default router;
