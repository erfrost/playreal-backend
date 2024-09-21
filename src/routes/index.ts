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
// import ServiceModel from "../models/Service.model";

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

// function random(min: number, max: number) {
//   return Math.random() * (max - min) + min;
// }

// router.post("/create", async (req, res) => {
//   try {
//     const services = await ServiceModel.find();

//     await Promise.all(
//       services.map(async (service: any) => {
//         service.basePrice = Math.floor(service.basePrice);
//         await service.save();
//       })
//     );

//     const basePrice: number = Math.floor(random(1, 5000));

//     res.status(200).json({ service: "success" });
//   } catch {
//     res
//       .status(500)
//       .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
//   }
// });

export default router;
