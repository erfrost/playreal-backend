import express, { Router } from "express";
import * as dotenv from "dotenv";
import TokenService from "../services/token.service";
import { JwtPayload } from "jsonwebtoken";
dotenv.config();

const router: Router = express.Router({ mergeParams: true });

function isTokenInvalid(data: any, dbToken: any) {
  return !data || !dbToken || data._id !== dbToken?.user?.toString();
}

router.post("/update", async (req, res) => {
  try {
    const refreshToken: string | undefined = req.body.refresh_token;
    if (!refreshToken) {
      return res
        .status(500)
        .json({ message: "Refresh token не был передан на сервер" });
    }

    const data = TokenService.validateRefresh(refreshToken) as JwtPayload;
    const dbToken = await TokenService.findToken(refreshToken);

    if (isTokenInvalid(data, dbToken)) {
      return res.status(400).json({
        message: "Ошибка обновления токена",
      });
    }

    const tokens = TokenService.generate({ _id: data!._id });
    await TokenService.save(data!._id, tokens!.refresh_token);

    res.status(200).send({ ...tokens });
  } catch (error) {
    res
      .status(500)
      .json({ message: "На сервере произошла ошибка. Попробуйте позже" });
  }
});

export default router;
